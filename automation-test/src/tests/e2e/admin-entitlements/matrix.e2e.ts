import { test, expect } from "@/fixtures";
import { copy, copyVi } from "@/data/copy";
import { AdminEntitlementsPage } from "@/pages/admin/admin-entitlements.page";
import { createAccount, type Account } from "@/utils/accounts";
import {
  clearOverrides,
  getAccess,
  getUserIdByEmail
} from "@/utils/entitlements";

// /admin/entitlements — user × app matrix (rows = user, cols = app) on the
// real /admin/entitlements API (REQ-ADMINENTITLEMENTS-01, -02). Role: admin.
// Test cases: test-cases/admin-entitlements.md (TC-ADMINENTITLEMENTS-012 …
// 024, 032, 034 … 037, 042).
//
// Seed (server/src/database/seeders/data/):
//   - users.ts: user2@test.com "John Doe" (role user) — entitlements.ts gives
//     it `deny` Notes and `allow` Operations Console. Only ever read here.
//   - web-apps.ts: Blog [user], Analytics Dashboard [admin], IDMS Portal
//     [user,admin], Team Calendar [user] (inactive — still a column),
//     Notes [user], Operations Console [admin].
//   Role default for a `user`: Blog, IDMS Portal, Team Calendar, Notes granted;
//   Analytics Dashboard and Operations Console not granted.
//
// Every save writes an override and notifies the user it is about, so the
// matrix is driven on a throwaway account ("Matrix Tester", role user) made in
// beforeAll — never on the seeded user@test.com, whose notifications other
// specs anchor on. The suite runs serially and clears that account's
// overrides after every test; teardown deletes the account.

test.use({ role: "admin" });
test.describe.configure({ mode: "serial" });

const t = copy.adminEntitlements;

const MATRIX_USER_FULLNAME = "Matrix Tester";
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

let account: Account;
let testUserId: string;

/** The edit-mode checkbox of `app` on the throwaway account's row. */
const cell = (ent: AdminEntitlementsPage, app: string) =>
  ent.cell(app, MATRIX_USER_FULLNAME);

test.beforeAll(async () => {
  account = await createAccount({
    tag: "matrix",
    fullName: MATRIX_USER_FULLNAME
  });
  testUserId = await getUserIdByEmail(account.email);
});

test.afterEach(async () => {
  await clearOverrides(testUserId);
});

test(
  "A user with no override shows the role default",
  { tag: ["@TC-ADMINENTITLEMENTS-012", "@smoke"] },
  async ({ adminEntitlementsPage: ent }) => {
    await ent.openMatrix(account.email);

    for (const app of APP_NAMES) {
      await expect(ent.appColumn(app)).toBeVisible();
    }
    await expect(ent.grantedIcons()).toHaveCount(ROLE_GRANTED.length);
    await expect(ent.notGrantedIcons()).toHaveCount(ROLE_WITHHELD.length);
    await expect(ent.revokedMarkers()).toHaveCount(0);
    await expect(ent.grantedMarkers()).toHaveCount(0);
    // Read mode never renders checkboxes.
    await expect(ent.checkboxes()).toHaveCount(0);
  }
);

test(
  "Seeded exceptions show in both directions with a marker",
  { tag: "@TC-ADMINENTITLEMENTS-034" },
  async ({ adminEntitlementsPage: ent }) => {
    await ent.openMatrix(USER2_EMAIL);

    await expect(ent.grantedIcons()).toHaveCount(4);
    await expect(ent.notGrantedIcons()).toHaveCount(2);
    await expect(ent.revokedMarkers()).toHaveCount(1);
    await expect(ent.grantedMarkers()).toHaveCount(1);

    await ent.revokedMarkers().hover();
    await expect(ent.tooltip()).toContainText(t.cell.overrideRevoked);
  }
);

test(
  "Cells and headers show readable values",
  { tag: "@TC-ADMINENTITLEMENTS-013" },
  async ({ adminEntitlementsPage: ent }) => {
    await ent.openMatrix(account.email);

    // Icons, not raw booleans; the app header's RoleChip label, not the enum.
    await expect(ent.text("true", { exact: true })).toHaveCount(0);
    await expect(ent.text("false", { exact: true })).toHaveCount(0);
    await expect(ent.text("ADMIN", { exact: true })).toHaveCount(0);
    await expect(ent.text("Admin", { exact: true }).first()).toBeVisible();
  }
);

test(
  "Edit reveals checkboxes; Save starts disabled with a reason",
  { tag: "@TC-ADMINENTITLEMENTS-014" },
  async ({ adminEntitlementsPage: ent }) => {
    await ent.openMatrix(account.email);
    await ent.editButton().click();

    await expect(ent.checkboxes()).toHaveCount(APP_NAMES.length);
    await expect(ent.cancelButton()).toBeVisible();
    await expect(ent.saveButton()).toBeDisabled();

    // A disabled Save has pointer-events:none; the tooltip trigger is the
    // wrapping span, so force the hover over that region to open it.
    await ent.saveButton().hover({ force: true });
    await expect(ent.tooltip()).toContainText(t.matrix.saveDisabledTooltip);
  }
);

test.describe("A change enables Save; undoing it or Cancel discards it", () => {
  test(
    "toggling a cell enables Save; toggling it back disables it again",
    { tag: "@TC-ADMINENTITLEMENTS-015" },
    async ({ adminEntitlementsPage: ent }) => {
      await ent.openMatrix(account.email);
      await ent.editButton().click();

      await cell(ent, "Blog").click();
      await expect(ent.saveButton()).toBeEnabled();

      await cell(ent, "Blog").click();
      await expect(ent.saveButton()).toBeDisabled();
    }
  );

  test(
    "Cancel discards the change and reverts the matrix",
    { tag: "@TC-ADMINENTITLEMENTS-015" },
    async ({ adminEntitlementsPage: ent }) => {
      await ent.openMatrix(account.email);
      await ent.editButton().click();
      await cell(ent, "Blog").click();

      await ent.cancelButton().click();
      await expect(ent.editButton()).toBeVisible();
      await expect(ent.checkboxes()).toHaveCount(0);
      await expect(ent.grantedIcons()).toHaveCount(ROLE_GRANTED.length);
      await expect(ent.revokedMarkers()).toHaveCount(0);
    }
  );
});

test(
  "A cell the role withholds is editable and previews the exception",
  { tag: "@TC-ADMINENTITLEMENTS-016" },
  async ({ adminEntitlementsPage: ent }) => {
    await ent.openMatrix(account.email);
    await ent.editButton().click();

    const analytics = cell(ent, "Analytics Dashboard");
    await expect(analytics).toBeEnabled();
    await expect(analytics).not.toBeChecked();

    await analytics.click();
    await expect(analytics).toBeChecked();
    await expect(ent.grantedMarkers()).toHaveCount(1);
  }
);

test(
  "Revoking a role-granted app survives a reload as an exception",
  { tag: ["@TC-ADMINENTITLEMENTS-035", "@smoke"] },
  async ({ adminEntitlementsPage: ent }) => {
    await ent.openMatrix(account.email);
    await ent.editButton().click();
    await cell(ent, "Blog").click();
    await ent.saveButton().click();

    await expect(ent.editButton()).toBeVisible();
    await expect(ent.grantedIcons()).toHaveCount(ROLE_GRANTED.length - 1);
    await expect(ent.revokedMarkers()).toHaveCount(1);

    await ent.openMatrix(account.email);
    await expect(ent.revokedMarkers()).toHaveCount(1);
    await expect(ent.grantedIcons()).toHaveCount(ROLE_GRANTED.length - 1);
  }
);

test(
  "Setting a cell back to the role default removes the override",
  { tag: "@TC-ADMINENTITLEMENTS-036" },
  async ({ adminEntitlementsPage: ent }) => {
    await ent.openMatrix(account.email);
    await ent.editButton().click();
    await cell(ent, "Blog").click();
    await ent.saveButton().click();
    await expect(ent.revokedMarkers()).toHaveCount(1);

    await ent.editButton().click();
    await cell(ent, "Blog").click();
    await ent.saveButton().click();

    await expect(ent.editButton()).toBeVisible();
    await expect(ent.revokedMarkers()).toHaveCount(0);
    // No redundant `allow` left behind for an app the role already grants.
    expect((await getAccess(testUserId)).overriddenAppIds).toEqual([]);
  }
);

test(
  "Granting beyond the role is saved as an exception",
  { tag: ["@TC-ADMINENTITLEMENTS-017", "@smoke"] },
  async ({ adminEntitlementsPage: ent }) => {
    await ent.openMatrix(account.email);
    await ent.editButton().click();
    await cell(ent, "Operations Console").click();
    await ent.saveButton().click();

    await expect(ent.editButton()).toBeVisible();
    await expect(ent.grantedIcons()).toHaveCount(ROLE_GRANTED.length + 1);
    await expect(ent.grantedMarkers()).toHaveCount(1);
  }
);

test(
  "A successful save is confirmed with a toast",
  { tag: "@TC-ADMINENTITLEMENTS-042" },
  async ({ adminEntitlementsPage: ent }) => {
    await ent.openMatrix(account.email);
    await ent.editButton().click();
    await cell(ent, "Blog").click();
    await ent.saveButton().click();

    await expect(ent.toast.withText(t.toast.saveSuccess)).toBeVisible();
    await expect(ent.editButton()).toBeVisible();
  }
);

test(
  "A double-clicked Save sends one request",
  { tag: "@TC-ADMINENTITLEMENTS-037" },
  async ({ page, adminEntitlementsPage: ent }) => {
    const patches: string[] = [];
    page.on("request", (req) => {
      if (req.method() === "PATCH" && req.url().includes("/admin/entitlements"))
        patches.push(req.url());
    });

    await ent.openMatrix(account.email);
    await ent.editButton().click();
    await cell(ent, "Notes").click();
    await ent.saveButton().dblclick();

    await expect(ent.editButton()).toBeVisible();
    expect(patches).toHaveLength(1);
    await expect(ent.revokedMarkers()).toHaveCount(1);
  }
);

test(
  "A failed save keeps edit mode and shows an error",
  { tag: "@TC-ADMINENTITLEMENTS-032" },
  async ({ page, adminEntitlementsPage: ent }) => {
    await page.route("**/admin/entitlements", (route) =>
      route.request().method() === "PATCH"
        ? route.fulfill({
            status: 500,
            contentType: "application/json",
            body: JSON.stringify({ code: "INTERNAL", message: "boom" })
          })
        : route.continue()
    );

    await ent.openMatrix(account.email);
    await ent.editButton().click();
    await cell(ent, "Blog").click();
    await ent.saveButton().click();

    await expect(ent.toast.withText(t.toast.error)).toBeVisible();
    await expect(ent.saveButton()).toBeVisible();
    await expect(cell(ent, "Blog")).not.toBeChecked();
    expect((await getAccess(testUserId)).overriddenAppIds).toEqual([]);
  }
);

test(
  "Grant-all ticks every app and toggles back",
  { tag: "@TC-ADMINENTITLEMENTS-018" },
  async ({ adminEntitlementsPage: ent }) => {
    await ent.openMatrix(account.email);
    await ent.editButton().click();

    await ent.grantAllButton().click();
    for (const app of APP_NAMES) {
      await expect(cell(ent, app)).toBeChecked();
    }
    await expect(ent.grantedMarkers()).toHaveCount(ROLE_WITHHELD.length);

    await ent.revokeAllButton().click();
    for (const app of APP_NAMES) {
      await expect(cell(ent, app)).not.toBeChecked();
    }
    await expect(ent.revokedMarkers()).toHaveCount(ROLE_GRANTED.length);
  }
);

test(
  "The picker is locked while editing",
  { tag: "@TC-ADMINENTITLEMENTS-019" },
  async ({ adminEntitlementsPage: ent }) => {
    await ent.openMatrix(account.email);
    await ent.editButton().click();

    await expect(ent.pickerSearch()).toBeDisabled();
    await expect(ent.removeChipButton(MATRIX_USER_FULLNAME)).toBeDisabled();
  }
);

test(
  "The user column stays pinned",
  { tag: "@TC-ADMINENTITLEMENTS-020" },
  async ({ adminEntitlementsPage: ent }) => {
    await ent.openMatrix(account.email);

    await expect(ent.userColumnHeader()).toHaveCSS("position", "sticky");
    await expect(ent.userColumnHeader()).toHaveCSS("left", "0px");

    const row = ent.rowHeaders(MATRIX_USER_FULLNAME);
    await expect(row).toHaveCSS("position", "sticky");
    await expect(row).toHaveCSS("left", "0px");
  }
);

test(
  "The matrix waits for the app catalog",
  { tag: "@TC-ADMINENTITLEMENTS-021" },
  async ({ page, adminEntitlementsPage: ent }) => {
    const LOADING_DELAY_MS = 800;
    await page.route("**/admin/apps**", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, LOADING_DELAY_MS));
      await route.continue();
    });

    await ent.goto();
    await ent.selectUser(account.email);

    await expect(ent.editButton()).not.toBeVisible();
    await expect(ent.editButton()).toBeVisible({ timeout: 5000 });
  }
);

test.describe("The matrix and its exception markers render in English and Vietnamese", () => {
  test(
    "English: User column and both exception markers",
    { tag: "@TC-ADMINENTITLEMENTS-022" },
    async ({ adminEntitlementsPage: ent }) => {
      await ent.openMatrix(USER2_EMAIL);

      await expect(ent.userColumnHeader()).toBeVisible();
      await expect(ent.revokedMarkers()).toHaveCount(1);
      await expect(ent.grantedMarkers()).toHaveCount(1);
      await expect(ent.rawKeys()).toHaveCount(0);
    }
  );

  test(
    "Vietnamese: Chỉnh sửa, Người dùng and both exception markers",
    { tag: "@TC-ADMINENTITLEMENTS-022" },
    async ({ page }) => {
      const ent = new AdminEntitlementsPage(page, copyVi, "/vi");
      await ent.openMatrix(USER2_EMAIL);

      await expect(ent.editButton()).toBeVisible();
      await expect(ent.userColumnHeader()).toBeVisible();
      await expect(ent.revokedMarkers()).toHaveCount(1);
      await expect(ent.grantedMarkers()).toHaveCount(1);
      await expect(ent.rawKeys()).toHaveCount(0);
    }
  );
});

test.describe("Cells are named checkboxes that work from the keyboard", () => {
  test(
    "every cell checkbox is named 'Grant {app} to {user}'",
    { tag: "@TC-ADMINENTITLEMENTS-023" },
    async ({ adminEntitlementsPage: ent }) => {
      await ent.openMatrix(USER2_EMAIL);
      await ent.editButton().click();

      for (const app of APP_NAMES) {
        await expect(ent.cell(app, USER2_FULLNAME)).toBeVisible();
      }
    }
  );

  test(
    "Space on a focused cell toggles it and enables Save",
    { tag: "@TC-ADMINENTITLEMENTS-023" },
    async ({ page, adminEntitlementsPage: ent }) => {
      await ent.openMatrix(account.email);
      await ent.editButton().click();

      const blog = cell(ent, "Blog");
      await blog.focus();
      await page.keyboard.press("Space");

      await expect(blog).not.toBeChecked();
      await expect(ent.saveButton()).toBeEnabled();
    }
  );
});

test.describe("Entering edit, saving and cancelling are announced", () => {
  test(
    "entering edit and saving are announced",
    { tag: "@TC-ADMINENTITLEMENTS-024" },
    async ({ adminEntitlementsPage: ent }) => {
      await ent.openMatrix(account.email);
      await ent.editButton().click();
      await expect(ent.announcer()).toHaveText(t.announce.editStart);

      await cell(ent, "Blog").click();
      await ent.saveButton().click();
      await expect(ent.announcer()).toHaveText(t.announce.saved);
    }
  );

  test(
    "cancelling is announced",
    { tag: "@TC-ADMINENTITLEMENTS-024" },
    async ({ adminEntitlementsPage: ent }) => {
      await ent.openMatrix(account.email);
      await ent.editButton().click();
      await cell(ent, "Blog").click();
      await ent.cancelButton().click();
      await expect(ent.announcer()).toHaveText(t.announce.canceled);
    }
  );
});
