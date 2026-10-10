import { test, expect } from "@fixtures";
import type { Page } from "@playwright/test";
import { USER_EMAIL } from "@helpers/env";

test.use({ role: "admin" });

// /admin/entitlements — states the seed cannot produce on its own, reached by
// stubbing the two real reads (/admin/apps, /admin/users), plus multi-user
// selection and the mock-backed grant store (REQ-ADMENT-01).
// Test cases: test-cases/admin-entitlements.md (TC-ADMENT-025 … TC-ADMENT-031,
// TC-ADMENT-033).
// Grants are mock (client/src/mocks/AdminEntitlements, in-memory per page),
// so nothing server-side changes.

const SECOND_USER = { email: "user2@test.com", name: "John Doe" };
const TEST_USER = "Test User";

const pickerSearch = (page: Page) =>
  page.getByRole("combobox", { name: /Search users/i });

const selectUser = async (page: Page, email: string) => {
  await pickerSearch(page).fill(email);
  await page.getByRole("option").filter({ hasText: email }).first().click();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("listbox")).toHaveCount(0);
};

/** Rewrites the JSON body of a real GET response before the page sees it. */
const rewrite = (
  page: Page,
  pattern: string,
  edit: (data: {
    items: Record<string, unknown>[];
    meta?: { total: number };
  }) => void
) =>
  page.route(pattern, async (route) => {
    if (route.request().method() !== "GET") return route.continue();
    const res = await route.fetch();
    const body = await res.json();
    edit(body.data);
    return route.fulfill({ response: res, json: body });
  });

test.describe("Entitlements — catalog boundaries (stubbed)", () => {
  test(
    "an empty app catalog shows the no-apps state instead of a matrix",
    { tag: "@TC-ADMENT-025" },
    async ({ page }) => {
      await rewrite(page, "**/api/v1/admin/apps**", (data) => {
        data.items = [];
      });
      await page.goto("/admin/entitlements");
      await selectUser(page, USER_EMAIL);
      await expect(page.getByText("No apps found")).toBeVisible();
      await expect(
        page.getByText("There are no apps to manage yet.")
      ).toBeVisible();
      await expect(page.getByRole("checkbox")).toHaveCount(0);
    }
  );

  test(
    "[BVA] a user eligible for 0 apps cannot use grant-all",
    { tag: "@TC-ADMENT-026" },
    async ({ page }) => {
      // Keep only the admin-only apps: a role=user account is eligible for none.
      await rewrite(page, "**/api/v1/admin/apps**", (data) => {
        data.items = data.items.filter(
          (a) => !(a.requiredRoles as string[]).includes("user")
        );
      });
      await page.goto("/admin/entitlements");
      await selectUser(page, USER_EMAIL);
      await page.getByRole("button", { name: "Edit" }).click();
      await expect(
        page.getByRole("button", { name: "Grant all eligible apps" })
      ).toBeDisabled();
      for (const checkbox of await page.getByRole("checkbox").all()) {
        await expect(checkbox).toBeDisabled();
      }
    }
  );
});

test.describe("Entitlements — selection and mock grants", () => {
  test(
    "several users get one row each; removing a chip removes the row",
    { tag: "@TC-ADMENT-028" },
    async ({ page }) => {
      await page.goto("/admin/entitlements");
      await selectUser(page, USER_EMAIL);
      await selectUser(page, SECOND_USER.email);
      await expect(page.getByRole("rowheader")).toHaveCount(2);
      await expect(
        page.getByRole("rowheader", { name: new RegExp(SECOND_USER.name) })
      ).toBeVisible();

      await page
        .getByRole("button", { name: `Remove ${SECOND_USER.name}` })
        .click();
      await expect(page.getByRole("rowheader")).toHaveCount(1);
      await expect(
        page.getByRole("rowheader", { name: new RegExp(TEST_USER) })
      ).toBeVisible();
      await expect(page.locator("#announcer")).toHaveText(
        `Removed ${SECOND_USER.name}.`
      );

      await page.getByRole("button", { name: `Remove ${TEST_USER}` }).click();
      await expect(page.getByText("No users selected")).toBeVisible();
    }
  );

  test(
    "saved grants live only in the page: a reload starts from no grants",
    { tag: "@TC-ADMENT-027" },
    async ({ page }) => {
      await page.goto("/admin/entitlements");
      await selectUser(page, USER_EMAIL);
      await page.getByRole("button", { name: "Edit" }).click();
      await page
        .getByRole("checkbox", { name: `Grant Blog to ${TEST_USER}` })
        .click();
      await page.getByRole("button", { name: "Save" }).click();
      await expect(
        page.getByRole("img", { name: "Granted", exact: true })
      ).toHaveCount(1);

      await page.reload();
      await selectUser(page, USER_EMAIL);
      await expect(
        page.getByRole("img", { name: "Granted", exact: true })
      ).toHaveCount(0);
      await expect(page.getByRole("img", { name: "Not granted" })).toHaveCount(
        4
      );
    }
  );
});

test.describe("Entitlements — picker edge cases", () => {
  test(
    "[BVA] more matches than the result limit shows a refine hint",
    { tag: "@TC-ADMENT-029" },
    async ({ page }) => {
      await rewrite(page, "**/api/v1/admin/users**", (data) => {
        data.meta = { ...(data.meta ?? { total: 0 }), total: 25 };
      });
      await page.goto("/admin/entitlements");
      await pickerSearch(page).fill("test.com");
      await expect(page.getByRole("option").first()).toBeVisible();
      const shown = await page.getByRole("option").count();
      expect(shown).toBeGreaterThan(0);
      await expect(
        page.getByText(`Showing ${shown} of 25 — refine your search`)
      ).toBeVisible();
    }
  );

  test(
    "a failing user search leaves the picker usable",
    { tag: "@TC-ADMENT-030" },
    async ({ page }) => {
      await page.route("**/api/v1/admin/users**", (route) =>
        route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ code: "INTERNAL", message: "boom" })
        })
      );
      await page.goto("/admin/entitlements");
      await pickerSearch(page).fill("admin");
      await expect(page.getByRole("option")).toHaveCount(0);
      await expect(
        page.getByRole("heading", { name: "Entitlements" })
      ).toBeVisible();
      await expect(pickerSearch(page)).toBeEnabled();
      await page.unroute("**/api/v1/admin/users**");
      await pickerSearch(page).fill(USER_EMAIL);
      await expect(
        page.getByRole("option").filter({ hasText: USER_EMAIL })
      ).toBeVisible();
    }
  );

  test(
    "[Error Guessing] regex and markup characters are searched literally",
    { tag: "@TC-ADMENT-031" },
    async ({ page }) => {
      await page.goto("/admin/entitlements");
      for (const q of [".*", "(", "<b>x</b>", "%"]) {
        await pickerSearch(page).fill(q);
        await expect(page.getByText("No users found")).toBeVisible();
      }
      await expect(page.locator("b", { hasText: "x" })).toHaveCount(0);
    }
  );

  test(
    "[DT] role filter × search: both must match",
    { tag: "@TC-ADMENT-033" },
    async ({ page }) => {
      await page.goto("/admin/entitlements");
      await page.getByRole("button", { name: /Filters/i }).click();
      const popover = page.locator('[data-slot="popover-content"]');
      await popover.getByRole("combobox").click();
      await page.getByRole("option", { name: "User", exact: true }).click();
      await page.keyboard.press("Escape");

      // role=user × "admin" → the only admin account is filtered out
      await pickerSearch(page).fill("admin@test.com");
      await expect(page.getByText("No users found")).toBeVisible();
      // role=user × "test.com" → only role=user accounts
      await pickerSearch(page).fill("user2@test.com");
      await expect(
        page.getByRole("option").filter({ hasText: SECOND_USER.email })
      ).toBeVisible();
    }
  );
});
