import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";

// Admin Entitlements — user picker + role filter E2E.
// Auth: `admin` project storageState (admin.json → admin@test.com session).
// User search hits the REAL /admin/users API; the entitlement matrix is mock
// (in-memory, per browser context) so no server-side data is mutated → no
// revert needed. Covers design.md §7 matrix (picker/search/role-filter/layout).
//
// i18n strings sourced from:
//   src/locales/en/adminEntitlements.json → title "Entitlements",
//     picker.filtersLabel "Filters", picker.role.admin "Admin", emptyUser.title
//   src/locales/vi/adminEntitlements.json → title "Phân quyền truy cập",
//     picker.filtersLabel "Bộ lọc"

const ADMIN_EMAIL = "admin@test.com";
const USER_EMAIL = "user@test.com";

const goto = (page: Page, locale = "") =>
  page.goto(`${locale}/admin/entitlements`);

// The page renders a GLOBAL header search too; scope the picker search by its
// accessible name (aria-label = picker.searchPlaceholder) to stay unambiguous.
const pickerSearch = (page: Page) =>
  page.getByRole("combobox", { name: /Search users/i });

// ---------------------------------------------------------------------------
// 1. Happy path + focus-default users
// ---------------------------------------------------------------------------
test.describe("Admin Entitlements — happy path", () => {
  test("page renders standard header, search, Filters and empty prompt", async ({
    page
  }) => {
    await goto(page);
    await expect(
      page.getByRole("heading", { name: "Entitlements" })
    ).toBeVisible();
    await expect(pickerSearch(page)).toBeVisible();
    await expect(page.getByRole("button", { name: /Filters/i })).toBeVisible();
    // No users selected yet → empty prompt (emptyUser.title)
    await expect(page.getByText("No users selected")).toBeVisible();
  });

  test("focusing search shows default users without typing (limit 6)", async ({
    page
  }) => {
    await goto(page);
    await pickerSearch(page).click();
    // Results dropdown (role=listbox) opens with default users on focus
    await expect(page.getByRole("listbox")).toBeVisible();
    const options = page.getByRole("option");
    await expect(options.first()).toBeVisible();
    const count = await options.count();
    expect(count).toBeGreaterThan(0);
    expect(count).toBeLessThanOrEqual(6);
  });
});

// ---------------------------------------------------------------------------
// 2. AuthN — unauthenticated redirect
// ---------------------------------------------------------------------------
test.describe("Admin Entitlements — unauthenticated redirect", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("unauthenticated access redirects to login", async ({ page }) => {
    await goto(page);
    await expect(page).toHaveURL(/login/);
  });
});

// ---------------------------------------------------------------------------
// 3. AuthZ — role-based access
// ---------------------------------------------------------------------------
test.describe("Admin Entitlements — authZ", () => {
  test("admin role can access the page and use the picker", async ({
    page
  }) => {
    await goto(page);
    await expect(pickerSearch(page)).toBeVisible();
  });

  // DEFERRED: non-admin denial is AuthGuard/BE-403 behavior best verified under
  // a dedicated non-admin storageState project (mid-test cookie swap races the
  // SessionGate refresh). The admin-authz suite already covers /admin/* denial
  // for non-admins. See e2e.md.
  test.fixme("non-admin is denied access", async () => {});
});

// ---------------------------------------------------------------------------
// 5. Empty / no-match state
// ---------------------------------------------------------------------------
test.describe("Admin Entitlements — empty / no-match", () => {
  test("search with no match shows the no-results message", async ({
    page
  }) => {
    await goto(page);
    await pickerSearch(page).fill("zzznomatch99999");
    // picker.noResults = "No users found"
    await expect(page.getByText("No users found")).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// 7. Filter / search
// ---------------------------------------------------------------------------
test.describe("Admin Entitlements — search + role filter", () => {
  // [EP] search match by email
  test("typing a query filters the results", async ({ page }) => {
    await goto(page);
    await pickerSearch(page).fill("admin");
    await expect(
      page.getByRole("option").filter({ hasText: ADMIN_EMAIL })
    ).toBeVisible();
    await expect(
      page.getByRole("option").filter({ hasText: USER_EMAIL })
    ).toHaveCount(0);
  });

  // [ST] clearing the query returns to the default list
  test("clearing the query restores default users", async ({ page }) => {
    await goto(page);
    const search = pickerSearch(page);
    await search.fill("admin");
    await expect(
      page.getByRole("option").filter({ hasText: ADMIN_EMAIL })
    ).toBeVisible();
    await search.fill("");
    await expect(page.getByRole("option").first()).toBeVisible();
  });

  // [DT] role=Admin filter narrows results to admins
  test("selecting role=Admin filters the picker to admins", async ({
    page
  }) => {
    await goto(page);
    await page.getByRole("button", { name: /Filters/i }).click();
    const popover = page.locator('[data-slot="popover-content"]');
    await popover.getByRole("combobox").click();
    await page.getByRole("option", { name: "Admin" }).click();
    await page.keyboard.press("Escape");
    await pickerSearch(page).click();
    await expect(
      page.getByRole("option").filter({ hasText: ADMIN_EMAIL })
    ).toBeVisible();
    await expect(
      page.getByRole("option").filter({ hasText: USER_EMAIL })
    ).toHaveCount(0);
  });
});

// ---------------------------------------------------------------------------
// 8/11. Selection → chips + matrix (mock)
// ---------------------------------------------------------------------------
test.describe("Admin Entitlements — selection", () => {
  test("selecting a user adds a chip and reveals the app-access matrix", async ({
    page
  }) => {
    await goto(page);
    await pickerSearch(page).fill("admin");
    await page
      .getByRole("option")
      .filter({ hasText: ADMIN_EMAIL })
      .first()
      .click();
    // Chip carries a "Remove {name}" control (picker.removeUser)
    await expect(
      page.getByRole("button", { name: /^Remove /i }).first()
    ).toBeVisible();
    // Matrix appears (Edit control visible) and replaces the empty prompt.
    // matrix.title moved to an sr-only <caption> in the redesign, so assert
    // the visible read-mode "Edit" toolbar button instead.
    await expect(page.getByRole("button", { name: /^Edit$/i })).toBeVisible();
    await expect(page.getByText("No users selected")).toHaveCount(0);
  });
});

// ---------------------------------------------------------------------------
// 9. i18n — EN + VI
// ---------------------------------------------------------------------------
test.describe("Admin Entitlements — i18n", () => {
  test("EN: header + Filters render, no missing keys", async ({ page }) => {
    await goto(page);
    await expect(
      page.getByRole("heading", { name: "Entitlements" })
    ).toBeVisible();
    await expect(page.getByRole("button", { name: /^Filters/ })).toBeVisible();
    await expect(page.getByText(/\[adminEntitlements\./)).toHaveCount(0);
  });

  test("VI: header + Bộ lọc render, no missing keys", async ({ page }) => {
    await goto(page, "/vi");
    await expect(
      page.getByRole("heading", { name: "Phân quyền truy cập" })
    ).toBeVisible();
    await expect(page.getByRole("button", { name: /^Bộ lọc/ })).toBeVisible();
    await expect(page.getByText(/\[adminEntitlements\./)).toHaveCount(0);
  });
});

// ---------------------------------------------------------------------------
// 12. Accessibility
// ---------------------------------------------------------------------------
test.describe("Admin Entitlements — accessibility", () => {
  test("search has combobox role with accessible name", async ({ page }) => {
    await goto(page);
    await expect(pickerSearch(page)).toHaveAttribute(
      "aria-autocomplete",
      "list"
    );
  });

  test("Filters popover opens and closes with Escape", async ({ page }) => {
    await goto(page);
    await page.getByRole("button", { name: /Filters/i }).click();
    const popover = page.locator('[data-slot="popover-content"]');
    await expect(popover).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(popover).not.toBeVisible();
  });
});
