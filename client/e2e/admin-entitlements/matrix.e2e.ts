import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import { USER_EMAIL } from "../helpers/env";
import {
  clearOverrides,
  getAccess,
  getUserIdByEmail
} from "../helpers/entitlements";

// Admin Entitlements — user×app matrix (rows = user, cols = app) E2E, on the
// REAL /admin/entitlements API. Auth: `admin` project (admin@test.com).
// Design: docs/specs/access-control/design.md §10.
//
// Seed (server/src/database/seeders/data/):
//   - users.ts: user@test.com "Test User" (role user) — no overrides;
//     user2@test.com "John Doe" (role user) — entitlements.ts gives it
//     `deny` Notes and `allow` Operations Console.
//   - web-apps.ts: Blog [user], Analytics Dashboard [admin], IDMS Portal
//     [user,admin], Team Calendar [user] (inactive — still a column),
//     Notes [user], Operations Console [admin].
//   Role default for a `user`: Blog, IDMS Portal, Team Calendar, Notes granted;
//   Analytics Dashboard and Operations Console not granted.
//
// Saves write the shared database, so the suite runs serially and every test
// that saves is followed by `clearOverrides(Test User)` in afterEach — Test
// User is back on the role default for the next suite. user2 is only read.

test.describe.configure({ mode: "serial" });

const TEST_USER_FULLNAME = "Test User";
const USER2_EMAIL = "user2@test.com";
const USER2_FULLNAME = "John Doe";

const APP_NAMES = [
  "Blog",
  "Analytics Dashboard",
  "IDMS Portal",
  "Team Calendar",
  "Notes",
  "Operations Console"
];
const ROLE_GRANTED = ["Blog", "IDMS Portal", "Team Calendar", "Notes"];
const ROLE_WITHHELD = ["Analytics Dashboard", "Operations Console"];

const REVOKED_LABEL = "Exception — revoked despite the role";
const GRANTED_LABEL = "Exception — granted beyond the role";

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

const img = (page: Page, name: string) =>
  page.getByRole("img", { name, exact: true });

const selectUserByEmail = async (page: Page, email: string) => {
  await pickerSearch(page).fill(email);
  await page.getByRole("option").filter({ hasText: email }).first().click();
  // The multi-select keeps its results popover open after a pick (to allow
  // picking more users); dismiss it so it does not overlay the matrix
  // controls below and intercept pointer events.
  await page.keyboard.press("Escape");
  await expect(page.getByRole("listbox")).toHaveCount(0);
};

const openMatrix = async (page: Page, email = USER_EMAIL, locale = "") => {
  await goto(page, locale);
  await selectUserByEmail(page, email);
  await expect(
    editButton(page).or(page.getByRole("button", { name: "Chỉnh sửa" }))
  ).toBeVisible();
};

let testUserId: string;

test.beforeAll(async () => {
  testUserId = await getUserIdByEmail(USER_EMAIL);
  await clearOverrides(testUserId);
});

test.afterEach(async () => {
  await clearOverrides(testUserId);
});

// ---------------------------------------------------------------------------
// 1. Happy — role default, then the seeded exceptions
// ---------------------------------------------------------------------------
test.describe("Admin Entitlements Matrix — happy render", () => {
  test("a user with no override shows the role default and no exception marker", async ({
    page
  }) => {
    await openMatrix(page);

    for (const app of APP_NAMES) {
      await expect(page.getByText(app, { exact: true })).toBeVisible();
    }
    await expect(img(page, "Granted")).toHaveCount(ROLE_GRANTED.length);
    await expect(img(page, "Not granted")).toHaveCount(ROLE_WITHHELD.length);
    await expect(img(page, REVOKED_LABEL)).toHaveCount(0);
    await expect(img(page, GRANTED_LABEL)).toHaveCount(0);
    // Non-edit mode never renders checkboxes.
    await expect(page.getByRole("checkbox")).toHaveCount(0);
  });

  test("seeded exceptions show in both directions with a marker", async ({
    page
  }) => {
    await openMatrix(page, USER2_EMAIL);

    await expect(img(page, "Granted")).toHaveCount(4);
    await expect(img(page, "Not granted")).toHaveCount(2);
    await expect(img(page, REVOKED_LABEL)).toHaveCount(1);
    await expect(img(page, GRANTED_LABEL)).toHaveCount(1);

    await img(page, REVOKED_LABEL).hover();
    await expect(page.getByRole("tooltip")).toContainText(REVOKED_LABEL);
  });
});

// ---------------------------------------------------------------------------
// 8. Data rendering — icons not raw booleans; header shows RoleChip label
// ---------------------------------------------------------------------------
test.describe("Admin Entitlements Matrix — data rendering", () => {
  test("cells render icons (not raw true/false); app header shows RoleChip label (not raw enum)", async ({
    page
  }) => {
    await openMatrix(page);

    await expect(page.getByText("true", { exact: true })).toHaveCount(0);
    await expect(page.getByText("false", { exact: true })).toHaveCount(0);
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
// 3. AuthZ — page denial lives in admin-authz/ (needs a non-admin session);
//    API 401/403 is asserted in web-app-access/launcher.e2e.ts.
// ---------------------------------------------------------------------------
test.describe("Admin Entitlements Matrix — authZ", () => {
  test.fixme(
    "non-admin is denied access (covered by admin-authz/)",
    async () => {}
  );
});

// ---------------------------------------------------------------------------
// 4. Validation — edit mode and dirty gate; no cell is locked any more
// ---------------------------------------------------------------------------
test.describe("Admin Entitlements Matrix — edit mode + dirty gate", () => {
  test("Edit reveals checkboxes + Save/Cancel; Save starts disabled with tooltip", async ({
    page
  }) => {
    await openMatrix(page);
    await editButton(page).click();

    await expect(page.getByRole("checkbox")).toHaveCount(APP_NAMES.length);
    await expect(cancelButton(page)).toBeVisible();
    await expect(saveButton(page)).toBeDisabled();

    // Save is disabled (pointer-events:none); the tooltip trigger is the
    // wrapping span, so force the hover over that region to open it.
    await saveButton(page).hover({ force: true });
    await expect(page.getByRole("tooltip")).toContainText(
      "No changes to save."
    );
  });

  test("toggling a cell enables Save; toggling it back disables it again", async ({
    page
  }) => {
    await openMatrix(page);
    await editButton(page).click();

    await cellCheckbox(page, "Blog").click();
    await expect(saveButton(page)).toBeEnabled();

    await cellCheckbox(page, "Blog").click();
    await expect(saveButton(page)).toBeDisabled();
  });

  test("a cell the role withholds is editable, and ticking it previews the exception", async ({
    page
  }) => {
    await openMatrix(page);
    await editButton(page).click();

    const analytics = cellCheckbox(page, "Analytics Dashboard");
    await expect(analytics).toBeEnabled();
    await expect(analytics).not.toBeChecked();

    await analytics.click();
    await expect(analytics).toBeChecked();
    await expect(img(page, GRANTED_LABEL)).toHaveCount(1);
  });

  test("Cancel discards and reverts", async ({ page }) => {
    await openMatrix(page);
    await editButton(page).click();
    await cellCheckbox(page, "Blog").click();

    await cancelButton(page).click();
    await expect(editButton(page)).toBeVisible();
    await expect(page.getByRole("checkbox")).toHaveCount(0);
    await expect(img(page, "Granted")).toHaveCount(ROLE_GRANTED.length);
    await expect(img(page, REVOKED_LABEL)).toHaveCount(0);
  });
});

// ---------------------------------------------------------------------------
// 11. Mutation / state — real persistence (A only)
// ---------------------------------------------------------------------------
test.describe("Admin Entitlements Matrix — save", () => {
  test("revoking a role-granted app persists across a reload as an exception", async ({
    page
  }) => {
    await openMatrix(page);
    await editButton(page).click();
    await cellCheckbox(page, "Blog").click();
    await saveButton(page).click();

    await expect(editButton(page)).toBeVisible();
    await expect(img(page, "Granted")).toHaveCount(ROLE_GRANTED.length - 1);
    await expect(img(page, REVOKED_LABEL)).toHaveCount(1);

    await openMatrix(page);
    await expect(img(page, REVOKED_LABEL)).toHaveCount(1);
    await expect(img(page, "Granted")).toHaveCount(ROLE_GRANTED.length - 1);
  });

  test("setting a cell back to its role default removes the override", async ({
    page
  }) => {
    await openMatrix(page);
    await editButton(page).click();
    await cellCheckbox(page, "Blog").click();
    await saveButton(page).click();
    await expect(img(page, REVOKED_LABEL)).toHaveCount(1);

    await editButton(page).click();
    await cellCheckbox(page, "Blog").click();
    await saveButton(page).click();

    await expect(editButton(page)).toBeVisible();
    await expect(img(page, REVOKED_LABEL)).toHaveCount(0);
    // No redundant `allow` left behind for an app the role already grants.
    expect((await getAccess(testUserId)).overriddenAppIds).toEqual([]);
  });

  test("granting beyond the role persists as an exception", async ({
    page
  }) => {
    await openMatrix(page);
    await editButton(page).click();
    await cellCheckbox(page, "Operations Console").click();
    await saveButton(page).click();

    await expect(editButton(page)).toBeVisible();
    await expect(img(page, "Granted")).toHaveCount(ROLE_GRANTED.length + 1);
    await expect(img(page, GRANTED_LABEL)).toHaveCount(1);
  });

  test("a double-clicked Save sends one request", async ({ page }) => {
    const patches: string[] = [];
    page.on("request", (req) => {
      if (req.method() === "PATCH" && req.url().includes("/admin/entitlements"))
        patches.push(req.url());
    });

    await openMatrix(page);
    await editButton(page).click();
    await cellCheckbox(page, "Notes").click();
    await saveButton(page).dblclick();

    await expect(editButton(page)).toBeVisible();
    expect(patches).toHaveLength(1);
    await expect(img(page, REVOKED_LABEL)).toHaveCount(1);
  });
});

// ---------------------------------------------------------------------------
// 10. Error — a failed save keeps the edit
// ---------------------------------------------------------------------------
test.describe("Admin Entitlements Matrix — save error", () => {
  test("a 500 on save shows the error toast and stays in edit mode", async ({
    page
  }) => {
    await page.route("**/admin/entitlements", (route) =>
      route.request().method() === "PATCH"
        ? route.fulfill({
            status: 500,
            contentType: "application/json",
            body: JSON.stringify({ code: "INTERNAL", message: "boom" })
          })
        : route.continue()
    );

    await openMatrix(page);
    await editButton(page).click();
    await cellCheckbox(page, "Blog").click();
    await saveButton(page).click();

    await expect(
      page.getByText("Something went wrong. Please try again.")
    ).toBeVisible();
    await expect(saveButton(page)).toBeVisible();
    await expect(cellCheckbox(page, "Blog")).not.toBeChecked();
    expect((await getAccess(testUserId)).overriddenAppIds).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Check-all — applies to every app now, not only role-eligible ones
// ---------------------------------------------------------------------------
test.describe("Admin Entitlements Matrix — check-all toggle", () => {
  test("row check-all ticks every app; toggling again clears them all", async ({
    page
  }) => {
    await openMatrix(page);
    await editButton(page).click();

    await page.getByRole("button", { name: "Grant all apps" }).click();
    for (const app of APP_NAMES) {
      await expect(cellCheckbox(page, app)).toBeChecked();
    }
    await expect(img(page, GRANTED_LABEL)).toHaveCount(ROLE_WITHHELD.length);

    await page.getByRole("button", { name: "Revoke all apps" }).click();
    for (const app of APP_NAMES) {
      await expect(cellCheckbox(page, app)).not.toBeChecked();
    }
    await expect(img(page, REVOKED_LABEL)).toHaveCount(ROLE_GRANTED.length);
  });
});

// ---------------------------------------------------------------------------
// Picker lock during edit
// ---------------------------------------------------------------------------
test.describe("Admin Entitlements Matrix — picker lock", () => {
  test("search input and remove-chip are disabled while editing", async ({
    page
  }) => {
    await openMatrix(page);
    await editButton(page).click();

    await expect(pickerSearch(page)).toBeDisabled();
    await expect(
      page.getByRole("button", { name: `Remove ${TEST_USER_FULLNAME}` })
    ).toBeDisabled();
  });
});

// ---------------------------------------------------------------------------
// Sticky user column
// ---------------------------------------------------------------------------
test.describe("Admin Entitlements Matrix — sticky user column", () => {
  test("user column header + row cell are pinned via position:sticky, left:0", async ({
    page
  }) => {
    await openMatrix(page);

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
// 10. Loading — catalog loading gate
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

    await expect(editButton(page)).not.toBeVisible();
    await expect(editButton(page)).toBeVisible({ timeout: 5000 });
  });
});

// ---------------------------------------------------------------------------
// 9. i18n — EN + VI
// ---------------------------------------------------------------------------
test.describe("Admin Entitlements Matrix — i18n", () => {
  test("EN: Edit / User column / exception labels render, no missing keys", async ({
    page
  }) => {
    await openMatrix(page, USER2_EMAIL);

    await expect(
      page.getByRole("columnheader", { name: "User", exact: true })
    ).toBeVisible();
    await expect(img(page, REVOKED_LABEL)).toHaveCount(1);
    await expect(img(page, GRANTED_LABEL)).toHaveCount(1);
    await expect(page.getByText(/\[?adminEntitlements\./)).toHaveCount(0);
  });

  test("VI: Chỉnh sửa / Người dùng / exception labels render, no missing keys", async ({
    page
  }) => {
    await openMatrix(page, USER2_EMAIL, "/vi");

    await expect(page.getByRole("button", { name: "Chỉnh sửa" })).toBeVisible();
    await expect(
      page.getByRole("columnheader", { name: "Người dùng", exact: true })
    ).toBeVisible();
    await expect(img(page, "Ngoại lệ — bị thu hồi dù đủ vai trò")).toHaveCount(
      1
    );
    await expect(img(page, "Ngoại lệ — được cấp ngoài vai trò")).toHaveCount(1);
    await expect(page.getByText(/\[?adminEntitlements\./)).toHaveCount(0);
  });
});

// ---------------------------------------------------------------------------
// 12. Accessibility
// ---------------------------------------------------------------------------
test.describe("Admin Entitlements Matrix — accessibility", () => {
  test("every cell checkbox exposes 'Grant {app} to {user}'", async ({
    page
  }) => {
    await openMatrix(page, USER2_EMAIL);
    await editButton(page).click();

    for (const app of APP_NAMES) {
      await expect(cellCheckbox(page, app, USER2_FULLNAME)).toBeVisible();
    }
  });

  test("keyboard: focus + Space toggles checkbox, Save reachable", async ({
    page
  }) => {
    await openMatrix(page);
    await editButton(page).click();

    const blogCheckbox = cellCheckbox(page, "Blog");
    await blogCheckbox.focus();
    await page.keyboard.press("Space");

    await expect(blogCheckbox).not.toBeChecked();
    await expect(saveButton(page)).toBeEnabled();
  });

  test("live region announces enter-edit and save (screen reader)", async ({
    page
  }) => {
    await openMatrix(page);
    await editButton(page).click();
    await expect(page.locator("#announcer")).toHaveText("Editing app access.");

    await cellCheckbox(page, "Blog").click();
    await saveButton(page).click();
    await expect(page.locator("#announcer")).toHaveText("App access saved.");
  });

  test("live region announces cancel (screen reader)", async ({ page }) => {
    await openMatrix(page);
    await editButton(page).click();
    await cellCheckbox(page, "Blog").click();
    await cancelButton(page).click();
    await expect(page.locator("#announcer")).toHaveText("Changes discarded.");
  });
});
