import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import { USER_EMAIL } from "../helpers/env";

// Admin Entitlements — user×app matrix (rows = user, cols = app) E2E.
// Auth: `admin` project storageState (admin.json → admin@test.com session).
//
// Data sources (all REAL backend, seeded — see server/src/database/seeders/data/):
//   - users.ts: "user@test.com" → fullName "Test User", role "user".
//   - web-apps.ts: 6 seeded apps (no status filter applied by /admin/apps for admin):
//       Blog [user], Analytics Dashboard [admin], IDMS Portal [user,admin],
//       Team Calendar [user] (status inactive but still listed), Notes [user],
//       Operations Console [admin].
//     eligible(user,app) = app.requiredRoles.includes(user.role) (exact match,
//     NOT hierarchical) → for "Test User" (role=user):
//       eligible   = Blog, IDMS Portal, Team Calendar, Notes
//       ineligible = Analytics Dashboard, Operations Console
//
// Entitlement GRANTS are mock (in-memory JS module state, reset on full page
// reload/new test) keyed by the mock's own fake ids ("user_alice", "app_blog",
// ...) which never match real backend ids. Consequence: every real selected
// user starts with ALL eligible cells "not granted" — deterministic baseline,
// no seed/revert needed. Saving a change persists only for the lifetime of
// the page (mock store), so tests are isolated by Playwright's per-test page.
//
// i18n strings sourced from:
//   src/locales/en/adminEntitlements.json → matrix.edit "Edit", matrix.save
//     "Save", matrix.cancel "Cancel", matrix.userColumn "User",
//     matrix.saveDisabledTooltip, matrix.checkAll/uncheckAll,
//     cell.granted/notGranted/insufficientRole/grantAria, announce.editStart/saved
//   src/locales/vi/adminEntitlements.json → matrix.edit "Chỉnh sửa",
//     matrix.userColumn "Người dùng"

const TEST_USER_FULLNAME = "Test User";

const APP_NAMES = [
  "Blog",
  "Analytics Dashboard",
  "IDMS Portal",
  "Team Calendar",
  "Notes",
  "Operations Console"
];
const ELIGIBLE_APPS = ["Blog", "IDMS Portal", "Team Calendar", "Notes"];
const INELIGIBLE_APPS = ["Analytics Dashboard", "Operations Console"];

const goto = (page: Page, locale = "") =>
  page.goto(`${locale}/admin/entitlements`);

// The page renders a GLOBAL header search too; scope the picker search by its
// accessible name (aria-label = picker.searchPlaceholder) to stay unambiguous.
const pickerSearch = (page: Page) =>
  page.getByRole("combobox", { name: /Search users|Tìm người dùng/i });

const editButton = (page: Page) => page.getByRole("button", { name: "Edit" });
const saveButton = (page: Page) => page.getByRole("button", { name: "Save" });
const cancelButton = (page: Page) =>
  page.getByRole("button", { name: "Cancel" });

const cellCheckbox = (page: Page, app: string, user = TEST_USER_FULLNAME) =>
  page.getByRole("checkbox", { name: `Grant ${app} to ${user}` });

const selectUserByEmail = async (page: Page, email: string) => {
  await pickerSearch(page).fill(email);
  await page.getByRole("option").filter({ hasText: email }).first().click();
  // The multi-select keeps its results popover open after a pick (to allow
  // picking more users); dismiss it so it does not overlay the matrix
  // controls below and intercept pointer events.
  await page.keyboard.press("Escape");
  await expect(page.getByRole("listbox")).toHaveCount(0);
};

// ---------------------------------------------------------------------------
// 1. Happy — render rows=selected user, cols=full app catalog
// ---------------------------------------------------------------------------
test.describe("Admin Entitlements Matrix — happy render", () => {
  test("selecting a user renders all app columns; non-edit shows icons, not checkboxes", async ({
    page
  }) => {
    await goto(page);
    await selectUserByEmail(page, USER_EMAIL);

    await expect(editButton(page)).toBeVisible();
    for (const app of APP_NAMES) {
      await expect(page.getByText(app, { exact: true })).toBeVisible();
    }

    // Test User (role=user): 4 eligible apps not-yet-granted, 2 ineligible.
    await expect(page.getByRole("img", { name: "Not granted" })).toHaveCount(
      ELIGIBLE_APPS.length
    );
    await expect(page.getByRole("img", { name: "Role required" })).toHaveCount(
      INELIGIBLE_APPS.length
    );
    // Non-edit mode never renders checkboxes.
    await expect(page.getByRole("checkbox")).toHaveCount(0);
  });
});

// ---------------------------------------------------------------------------
// 8. Data rendering — icons not raw booleans; header shows displayName + RoleChip
// ---------------------------------------------------------------------------
test.describe("Admin Entitlements Matrix — data rendering", () => {
  test("cells render icons (not raw true/false); app header shows RoleChip label (not raw enum)", async ({
    page
  }) => {
    await goto(page);
    await selectUserByEmail(page, USER_EMAIL);

    await expect(page.getByText("true", { exact: true })).toHaveCount(0);
    await expect(page.getByText("false", { exact: true })).toHaveCount(0);
    // RoleChip renders the translated label ("Admin"), never the raw enum
    // value the backend uses internally.
    await expect(page.getByText("ADMIN", { exact: true })).toHaveCount(0);
    await expect(
      page.getByText("Admin", { exact: true }).first()
    ).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// 2. AuthN — unauthenticated redirect
// ---------------------------------------------------------------------------
test.describe("Admin Entitlements Matrix — unauthenticated redirect", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("unauthenticated access redirects to login", async ({ page }) => {
    await goto(page);
    await expect(page).toHaveURL(/login/);
  });
});

// ---------------------------------------------------------------------------
// 3. AuthZ
// ---------------------------------------------------------------------------
test.describe("Admin Entitlements Matrix — authZ", () => {
  // DEFERRED: non-admin denial is AuthGuard/BE-403 behavior best verified
  // under a dedicated non-admin storageState project (mid-test cookie swap
  // races the SessionGate refresh). The admin-authz suite already covers
  // /admin/* denial for non-admins. See e2e.md.
  test.fixme("non-admin is denied access", async () => {});
});

// ---------------------------------------------------------------------------
// 4. Validation / expected-error — edit mode, dirty gate, insufficient-role
// ---------------------------------------------------------------------------
test.describe("Admin Entitlements Matrix — edit mode + dirty gate", () => {
  test("Edit reveals checkboxes + Save/Cancel; Save starts disabled with tooltip", async ({
    page
  }) => {
    await goto(page);
    await selectUserByEmail(page, USER_EMAIL);
    await editButton(page).click();

    await expect(page.getByRole("checkbox").first()).toBeVisible();
    await expect(saveButton(page)).toBeVisible();
    await expect(cancelButton(page)).toBeVisible();
    await expect(saveButton(page)).toBeDisabled();

    // Save is disabled (pointer-events:none); the tooltip trigger is the
    // wrapping span, so force the hover over that region to open it.
    await saveButton(page).hover({ force: true });
    await expect(page.getByRole("tooltip")).toContainText(
      "No changes to save."
    );
  });

  test("toggling an eligible checkbox enables Save; Cancel discards and reverts", async ({
    page
  }) => {
    await goto(page);
    await selectUserByEmail(page, USER_EMAIL);
    await editButton(page).click();

    await cellCheckbox(page, "Blog").click();
    await expect(saveButton(page)).toBeEnabled();

    await cancelButton(page).click();
    await expect(editButton(page)).toBeVisible();
    await expect(page.getByRole("checkbox")).toHaveCount(0);
    // Reverted — still 4 "Not granted" (Blog's toggle was discarded).
    await expect(page.getByRole("img", { name: "Not granted" })).toHaveCount(
      ELIGIBLE_APPS.length
    );
  });

  test("insufficient-role cell is a disabled checkbox with a reason tooltip", async ({
    page
  }) => {
    await goto(page);
    await selectUserByEmail(page, USER_EMAIL);
    await editButton(page).click();

    const analyticsCheckbox = cellCheckbox(page, "Analytics Dashboard");
    await expect(analyticsCheckbox).toBeDisabled();
    await expect(analyticsCheckbox).toHaveAttribute("aria-checked", "false");

    await analyticsCheckbox.hover();
    await expect(page.getByRole("tooltip")).toContainText(
      "This user lacks the required role."
    );
  });
});

// ---------------------------------------------------------------------------
// 11. Mutation safety — Save persists (A only: mutation-heavy)
// ---------------------------------------------------------------------------
test.describe("Admin Entitlements Matrix — save", () => {
  test("Save persists the toggle; non-edit reflects the new grant", async ({
    page
  }) => {
    await goto(page);
    await selectUserByEmail(page, USER_EMAIL);
    await editButton(page).click();

    await cellCheckbox(page, "Blog").click();
    await saveButton(page).click();

    await expect(editButton(page)).toBeVisible();
    await expect(saveButton(page)).toHaveCount(0);
    await expect(
      page.getByRole("img", { name: "Granted", exact: true })
    ).toHaveCount(1);
    await expect(page.getByRole("img", { name: "Not granted" })).toHaveCount(
      ELIGIBLE_APPS.length - 1
    );
    await expect(page.getByRole("img", { name: "Role required" })).toHaveCount(
      INELIGIBLE_APPS.length
    );
  });
});

// ---------------------------------------------------------------------------
// 6. Boundary — check-all toggle (eligibleCount ≥1 case; 0-eligible boundary
//    is not reproducible with the current seed, see e2e.md follow-up)
// ---------------------------------------------------------------------------
test.describe("Admin Entitlements Matrix — check-all toggle", () => {
  test("row check-all grants all eligible cells; toggling again revokes them", async ({
    page
  }) => {
    await goto(page);
    await selectUserByEmail(page, USER_EMAIL);
    await editButton(page).click();

    const checkAllButton = page.getByRole("button", {
      name: "Grant all eligible apps"
    });
    await checkAllButton.click();

    for (const app of ELIGIBLE_APPS) {
      await expect(cellCheckbox(page, app)).toBeChecked();
    }
    // Ineligible cells stay untouched (still disabled, unchecked).
    for (const app of INELIGIBLE_APPS) {
      await expect(cellCheckbox(page, app)).not.toBeChecked();
      await expect(cellCheckbox(page, app)).toBeDisabled();
    }

    const uncheckAllButton = page.getByRole("button", {
      name: "Revoke all apps"
    });
    await expect(uncheckAllButton).toBeVisible();
    await uncheckAllButton.click();

    for (const app of ELIGIBLE_APPS) {
      await expect(cellCheckbox(page, app)).not.toBeChecked();
    }
  });
});

// ---------------------------------------------------------------------------
// Picker lock during edit
// ---------------------------------------------------------------------------
test.describe("Admin Entitlements Matrix — picker lock", () => {
  test("search input and remove-chip are disabled while editing", async ({
    page
  }) => {
    await goto(page);
    await selectUserByEmail(page, USER_EMAIL);
    await editButton(page).click();

    await expect(pickerSearch(page)).toBeDisabled();
    await expect(
      page.getByRole("button", { name: `Remove ${TEST_USER_FULLNAME}` })
    ).toBeDisabled();
  });
});

// ---------------------------------------------------------------------------
// 6. Boundary — sticky user column
// ---------------------------------------------------------------------------
test.describe("Admin Entitlements Matrix — sticky user column", () => {
  test("user column header + row cell are pinned via position:sticky, left:0", async ({
    page
  }) => {
    await goto(page);
    await selectUserByEmail(page, USER_EMAIL);

    const userHeaderCell = page.getByRole("columnheader", {
      name: "User",
      exact: true
    });
    await expect(userHeaderCell).toHaveCSS("position", "sticky");
    await expect(userHeaderCell).toHaveCSS("left", "0px");

    const userRowCell = page.getByRole("rowheader", {
      name: new RegExp(TEST_USER_FULLNAME)
    });
    await expect(userRowCell).toHaveCSS("position", "sticky");
    await expect(userRowCell).toHaveCSS("left", "0px");
  });
});

// ---------------------------------------------------------------------------
// 10. Error / loading — catalog loading gate
// ---------------------------------------------------------------------------
test.describe("Admin Entitlements Matrix — loading", () => {
  test("matrix stays in loading state until the app catalog resolves", async ({
    page
  }) => {
    const LOADING_DELAY_MS = 800;
    await page.route("**/admin/apps**", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, LOADING_DELAY_MS));
      await route.continue();
    });

    await goto(page);
    await selectUserByEmail(page, USER_EMAIL);

    // Toolbar/table (post-loading branch) must not render before the delayed
    // catalog response resolves.
    await expect(editButton(page)).not.toBeVisible();
    await expect(editButton(page)).toBeVisible({ timeout: 5000 });
  });

  // NOTE: mock `updateUserGrants` always resolves successfully — there is no
  // reachable error branch to assert `toast.error` / "stay in edit mode on
  // failure" without modifying app/mock code (out of scope here). Deferred to
  // when the real BE endpoint lands (see e2e.md follow-up).
});

// ---------------------------------------------------------------------------
// 9. i18n — EN + VI
// ---------------------------------------------------------------------------
test.describe("Admin Entitlements Matrix — i18n", () => {
  test("EN: Edit / User column render, no missing keys", async ({ page }) => {
    await goto(page);
    await selectUserByEmail(page, USER_EMAIL);

    await expect(editButton(page)).toBeVisible();
    await expect(
      page.getByRole("columnheader", { name: "User", exact: true })
    ).toBeVisible();
    await expect(page.getByText(/\[adminEntitlements\./)).toHaveCount(0);
  });

  test("VI: Chỉnh sửa / Người dùng render, no missing keys", async ({
    page
  }) => {
    await goto(page, "/vi");
    await selectUserByEmail(page, USER_EMAIL);

    await expect(page.getByRole("button", { name: "Chỉnh sửa" })).toBeVisible();
    await expect(
      page.getByRole("columnheader", { name: "Người dùng", exact: true })
    ).toBeVisible();
    await expect(page.getByText(/\[adminEntitlements\./)).toHaveCount(0);
  });
});

// ---------------------------------------------------------------------------
// 12. Accessibility
// ---------------------------------------------------------------------------
test.describe("Admin Entitlements Matrix — accessibility", () => {
  test("checkbox exposes accessible name 'Grant {app} to {user}'", async ({
    page
  }) => {
    await goto(page);
    await selectUserByEmail(page, USER_EMAIL);
    await editButton(page).click();

    await expect(cellCheckbox(page, "Blog")).toBeVisible();
  });

  test("keyboard: focus + Space toggles checkbox, Save reachable", async ({
    page
  }) => {
    await goto(page);
    await selectUserByEmail(page, USER_EMAIL);
    await editButton(page).click();

    const blogCheckbox = cellCheckbox(page, "Blog");
    await blogCheckbox.focus();
    await page.keyboard.press("Space");

    await expect(blogCheckbox).toBeChecked();
    await expect(saveButton(page)).toBeEnabled();
  });

  test("live region announces enter-edit and save (screen reader)", async ({
    page
  }) => {
    await goto(page);
    await selectUserByEmail(page, USER_EMAIL);
    await editButton(page).click();
    await expect(page.locator("#announcer")).toHaveText("Editing app access.");

    await cellCheckbox(page, "Blog").click();
    await saveButton(page).click();
    await expect(page.locator("#announcer")).toHaveText("App access saved.");
  });

  test("live region announces cancel (screen reader)", async ({ page }) => {
    await goto(page);
    await selectUserByEmail(page, USER_EMAIL);
    await editButton(page).click();
    await cellCheckbox(page, "Blog").click();
    await cancelButton(page).click();
    await expect(page.locator("#announcer")).toHaveText("Changes discarded.");
  });
});
