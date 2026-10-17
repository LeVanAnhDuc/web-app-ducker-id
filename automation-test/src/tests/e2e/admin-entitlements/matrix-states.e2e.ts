import { test, expect } from "@/fixtures";
import type { Page } from "@playwright/test";
import { ADMIN, USER } from "@/config/accounts";
import { API_PREFIX } from "@/config/urls";
import { copy, fill } from "@/data/copy";
import { createAccount } from "@/utils/accounts";

// /admin/entitlements — states the seed cannot produce on its own, reached by
// stubbing the two catalog reads (/admin/apps, /admin/users), plus multi-user
// selection and picker edge cases (REQ-ADMINENTITLEMENTS-01). Role: admin.
// Test cases: test-cases/admin-entitlements.md (TC-ADMINENTITLEMENTS-025,
// 028 … 031, 033, 043). Nothing here saves, so nothing server-side changes.

test.use({ role: "admin" });

const t = copy.adminEntitlements;

const SECOND_USER = { email: "user2@test.com", name: "John Doe" };
const TEST_USER = "Test User";

// API calls only — a bare "**/admin/apps**" would also catch the sidebar's
// RSC prefetch of the /admin/apps page.
const APPS_API = `**${API_PREFIX}/admin/apps**`;
const USERS_API = `**${API_PREFIX}/admin/users**`;

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

test(
  'An empty app catalog shows "No apps found"',
  { tag: "@TC-ADMINENTITLEMENTS-025" },
  async ({ page, adminEntitlementsPage: ent }) => {
    await rewrite(page, APPS_API, (data) => {
      data.items = [];
    });
    await ent.goto();
    await ent.selectUser(USER.email);
    await expect(ent.noAppsTitle()).toBeVisible();
    await expect(ent.noAppsDescription()).toBeVisible();
    await expect(ent.checkboxes()).toHaveCount(0);
  }
);

test(
  "Several users get one row each, and removing a chip removes the row",
  { tag: "@TC-ADMINENTITLEMENTS-028" },
  async ({ adminEntitlementsPage: ent }) => {
    await ent.goto();
    await ent.selectUser(USER.email);
    await ent.selectUser(SECOND_USER.email);
    await expect(ent.rowHeaders()).toHaveCount(2);
    await expect(ent.rowHeaders(SECOND_USER.name)).toBeVisible();

    await ent.removeChipButton(SECOND_USER.name).click();
    await expect(ent.rowHeaders()).toHaveCount(1);
    await expect(ent.rowHeaders(TEST_USER)).toBeVisible();
    await expect(ent.announcer()).toHaveText(
      fill(t.announce.deselected, { name: SECOND_USER.name })
    );

    await ent.removeChipButton(TEST_USER).click();
    await expect(ent.noUsersSelected()).toBeVisible();
  }
);

test(
  "Picking a selected user again deselects it",
  { tag: "@TC-ADMINENTITLEMENTS-043" },
  async ({ adminEntitlementsPage: ent }) => {
    await ent.goto();
    await ent.selectUser(SECOND_USER.email);
    await expect(ent.rowHeaders()).toHaveCount(1);

    await ent.pickerSearch().fill(SECOND_USER.email);
    const option = ent.option(SECOND_USER.email).first();
    await expect(option).toHaveAttribute("aria-selected", "true");
    await option.click();

    await expect(ent.removeChipButton(SECOND_USER.name)).toHaveCount(0);
    await expect(ent.announcer()).toHaveText(
      fill(t.announce.deselected, { name: SECOND_USER.name })
    );
    await expect(ent.rowHeaders()).toHaveCount(0);
    await expect(ent.noUsersSelected()).toBeVisible();
  }
);

test(
  "More matches than the limit shows a refine hint",
  { tag: "@TC-ADMINENTITLEMENTS-029" },
  async ({ page, adminEntitlementsPage: ent }) => {
    await rewrite(page, USERS_API, (data) => {
      data.meta = { ...(data.meta ?? { total: 0 }), total: 25 };
    });
    await ent.goto();
    await ent.pickerSearch().fill("test.com");
    await expect(ent.options().first()).toBeVisible();
    const shown = await ent.options().count();
    expect(shown).toBeGreaterThan(0);
    await expect(ent.refineHint(shown, 25)).toBeVisible();
  }
);

test(
  "A failing user search leaves the picker usable",
  { tag: "@TC-ADMINENTITLEMENTS-030" },
  async ({ page, adminEntitlementsPage: ent }) => {
    await page.route(USERS_API, (route) =>
      route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ code: "INTERNAL", message: "boom" })
      })
    );
    await ent.goto();
    await ent.pickerSearch().fill("admin");
    await expect(ent.options()).toHaveCount(0);
    await expect(ent.heading()).toBeVisible();
    await expect(ent.pickerSearch()).toBeEnabled();
    await page.unroute(USERS_API);
    await ent.pickerSearch().fill(USER.email);
    await expect(ent.option(USER.email)).toBeVisible();
  }
);

test(
  "Regex and markup characters are searched literally",
  { tag: "@TC-ADMINENTITLEMENTS-031" },
  async ({ adminEntitlementsPage: ent }) => {
    await ent.goto();
    for (const q of [".*", "(", "<b>x</b>", "%"]) {
      await ent.pickerSearch().fill(q);
      await expect(ent.noResults()).toBeVisible();
    }
    await expect(ent.boldText("x")).toHaveCount(0);
  }
);

// The "user matches" side searches an address that exists only for this test
// (Q6): in a full run, accounts other specs create can match a shared term.
// Each query waits for its own /admin/users response — the picker debounces,
// and the role-only results would otherwise still be on screen.
test(
  "Role filter and search must both match",
  { tag: "@TC-ADMINENTITLEMENTS-033" },
  async ({ adminEntitlementsPage: ent }) => {
    const own = await createAccount({
      tag: "ent-role-filter",
      fullName: "Role Filter Tester"
    });

    await ent.goto();
    await ent.filterByRole(t.picker.role.user);

    // role=user × the only admin's address → filtered out
    await ent.search(ADMIN.email);
    await expect(ent.noResults()).toBeVisible();

    // role=user × a role=user address → listed
    await ent.search(own.email);
    await expect(ent.option(own.email)).toBeVisible();
  }
);
