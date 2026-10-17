import { test, expect } from "@/fixtures";
import { createApiClient } from "@/api";
import { ADMIN, USER } from "@/config/accounts";
import { copy, copyVi } from "@/data/copy";
import { AdminEntitlementsPage } from "@/pages/admin/admin-entitlements.page";

// /admin/entitlements — user picker + role filter (REQ-ADMINENTITLEMENTS-01).
// Role: admin; the denial test takes `userPage` / `userApi`, the redirect test
// runs as guest. Test cases: test-cases/admin-entitlements.md
// (TC-ADMINENTITLEMENTS-001 … 011). User search hits the REAL /admin/users
// API; nothing here saves, so nothing server-side changes.

test.use({ role: "admin" });

const t = copy.adminEntitlements;

test(
  "The page shows its header, picker, Filters and the empty prompt",
  { tag: ["@TC-ADMINENTITLEMENTS-001", "@smoke"] },
  async ({ adminEntitlementsPage: ent }) => {
    await ent.goto();
    await expect(ent.heading()).toBeVisible();
    await expect(ent.pickerSearch(/Search users/i)).toBeVisible();
    await expect(ent.filtersButton()).toBeVisible();
    await expect(ent.noUsersSelected()).toBeVisible();
  }
);

test(
  "Focusing the search lists up to 6 users without typing",
  { tag: "@TC-ADMINENTITLEMENTS-002" },
  async ({ adminEntitlementsPage: ent }) => {
    await ent.goto();
    await ent.pickerSearch(/Search users/i).click();
    await expect(ent.results()).toBeVisible();
    await expect(ent.options().first()).toBeVisible();
    const count = await ent.options().count();
    expect(count).toBeGreaterThan(0);
    expect(count).toBeLessThanOrEqual(6);
  }
);

test.describe("guest", () => {
  test.use({ role: "guest" });

  test(
    "Without a session the page sends you to login",
    { tag: ["@TC-ADMINENTITLEMENTS-003", "@smoke"] },
    async ({ page, adminEntitlementsPage: ent }) => {
      await ent.goto();
      await expect(page).toHaveURL(/login/);
    }
  );
});

// A non-admin is sent away from the page by the client-side role guard
// (TC-AUTHZ-018), and /admin/users and /admin/apps answer 403 regardless, so
// no account is ever listed and the matrix can never open.
test(
  "A non-admin can neither find users nor open the matrix",
  { tag: ["@TC-ADMINENTITLEMENTS-004", "@smoke"] },
  async ({ userPage, userApi }) => {
    expect((await createApiClient(userApi).adminApps.list()).status()).toBe(
      403
    );

    const users = await createApiClient(userApi).adminUsers.list({
      search: "admin"
    });
    expect(users.status()).toBe(403);

    const ent = new AdminEntitlementsPage(userPage);
    await ent.goto();
    await expect(userPage).not.toHaveURL(/\/admin/);
    await expect(ent.pickerSearch(/Search users/i)).toHaveCount(0);
    await expect(ent.options()).toHaveCount(0);
    await expect(ent.text(ADMIN.email)).toHaveCount(0);
    await expect(ent.editButton(/^Edit$/)).toHaveCount(0);
    await expect(ent.userColumnHeader()).toHaveCount(0);
  }
);

test(
  "A search with no match says so",
  { tag: "@TC-ADMINENTITLEMENTS-005" },
  async ({ adminEntitlementsPage: ent }) => {
    await ent.goto();
    await ent.pickerSearch(/Search users/i).fill("zzznomatch99999");
    await expect(ent.noResults()).toBeVisible();
  }
);

test(
  "Typing filters the results",
  { tag: "@TC-ADMINENTITLEMENTS-006" },
  async ({ adminEntitlementsPage: ent }) => {
    await ent.goto();
    await ent.pickerSearch(/Search users/i).fill("admin");
    await expect(ent.option(ADMIN.email)).toBeVisible();
    await expect(ent.option(USER.email)).toHaveCount(0);
  }
);

test(
  "Clearing the query brings the default list back",
  { tag: "@TC-ADMINENTITLEMENTS-007" },
  async ({ adminEntitlementsPage: ent }) => {
    await ent.goto();
    const search = ent.pickerSearch(/Search users/i);
    await search.fill("admin");
    await expect(ent.option(ADMIN.email)).toBeVisible();
    await search.fill("");
    await expect(ent.options().first()).toBeVisible();
  }
);

test(
  "The Admin role filter keeps only admins",
  { tag: "@TC-ADMINENTITLEMENTS-008" },
  async ({ adminEntitlementsPage: ent }) => {
    await ent.goto();
    await ent.filterByRole(t.picker.role.admin);
    await ent.pickerSearch(/Search users/i).click();
    await expect(ent.option(ADMIN.email)).toBeVisible();
    await expect(ent.option(USER.email)).toHaveCount(0);
  }
);

test(
  "Picking a user adds a chip and reveals the matrix",
  { tag: ["@TC-ADMINENTITLEMENTS-009", "@smoke"] },
  async ({ adminEntitlementsPage: ent }) => {
    await ent.goto();
    await ent.pickerSearch(/Search users/i).fill("admin");
    await ent.option(ADMIN.email).first().click();
    await expect(ent.removeChipButton().first()).toBeVisible();
    // matrix.title is an sr-only <caption>; the visible read-mode Edit button
    // is what proves the matrix replaced the empty prompt.
    await expect(ent.editButton(/^Edit$/i)).toBeVisible();
    await expect(ent.noUsersSelected()).toHaveCount(0);
  }
);

test.describe("The picker renders in English and Vietnamese with no missing keys", () => {
  test(
    "English: header and Filters render",
    { tag: "@TC-ADMINENTITLEMENTS-010" },
    async ({ adminEntitlementsPage: ent }) => {
      await ent.goto();
      await expect(ent.heading()).toBeVisible();
      await expect(
        ent.filtersButton(new RegExp(`^${t.picker.filtersLabel}`))
      ).toBeVisible();
      await expect(ent.rawKeys(/\[adminEntitlements\./)).toHaveCount(0);
    }
  );

  test(
    "Vietnamese: header and Bộ lọc render",
    { tag: "@TC-ADMINENTITLEMENTS-010" },
    async ({ page }) => {
      const ent = new AdminEntitlementsPage(page, copyVi, "/vi");
      const vi = copyVi.adminEntitlements;
      await ent.goto();
      await expect(ent.heading()).toBeVisible();
      await expect(
        ent.filtersButton(new RegExp(`^${vi.picker.filtersLabel}`))
      ).toBeVisible();
      await expect(ent.rawKeys(/\[adminEntitlements\./)).toHaveCount(0);
    }
  );
});

test.describe("The search is an autocomplete combobox and Filters closes on Escape", () => {
  test(
    "the search is a combobox with list autocomplete",
    { tag: "@TC-ADMINENTITLEMENTS-011" },
    async ({ adminEntitlementsPage: ent }) => {
      await ent.goto();
      await expect(ent.pickerSearch(/Search users/i)).toHaveAttribute(
        "aria-autocomplete",
        "list"
      );
    }
  );

  test(
    "the Filters popover opens and closes with Escape",
    { tag: "@TC-ADMINENTITLEMENTS-011" },
    async ({ page, adminEntitlementsPage: ent }) => {
      await ent.goto();
      await ent.filtersButton().click();
      await expect(ent.filtersPanel()).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(ent.filtersPanel()).not.toBeVisible();
    }
  );
});
