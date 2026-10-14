import { test, expect } from "@/fixtures";
import { createApiClient } from "@/api";
import { copy, fill } from "@/data/copy";
import {
  adminAppBody,
  categoryIds,
  deleteE2EApps,
  e2eAppName
} from "@/utils/admin-apps";

test.use({ role: "admin" });

// Activating / deactivating an app (REQ-ADMINAPPS-05, REQ-ADMINAPPS-07) —
// State Transition active ↔ inactive through the edit sheet's status switch
// and the row menu.
// Test cases: test-cases/admin-apps.md (TC-ADMINAPPS-059, TC-ADMINAPPS-060,
// TC-ADMINAPPS-070).
//
// Each test registers its own `e2e-…` app over the API (admin-only role, so
// it never reaches a regular user's launcher) and deletes it afterwards.

const t = copy.adminApps;

let displayName: string;
/** The test app's row, by its (unique) display name. */
const rowName = () => new RegExp(displayName);

test.beforeEach(async ({ adminApi, adminAppsPage }) => {
  const admin = createApiClient(adminApi);
  const [first] = await categoryIds(admin);
  const body = adminAppBody([first], {
    name: e2eAppName("status"),
    status: "active"
  });
  displayName = body.displayName as string;
  const res = await admin.adminApps.create(body);
  expect(res.status()).toBe(201);
  await adminAppsPage.goto();
  await expect(adminAppsPage.row(rowName())).toBeVisible();
});

test.afterEach(async () => {
  await deleteE2EApps();
});

test(
  "The status switch in the edit sheet pauses and reactivates",
  { tag: ["@TC-ADMINAPPS-059", "@smoke"] },
  async ({ adminAppsPage }) => {
    const { sheet } = adminAppsPage;
    const openEdit = async () => {
      await adminAppsPage.rowMenuButton(rowName()).click();
      await adminAppsPage.editItem().click();
      await expect(sheet.heading(t.form.editTitle)).toBeVisible();
    };
    await expect(
      adminAppsPage.rowText(rowName(), t.status.active, { exact: true })
    ).toBeVisible();

    // active → inactive
    await openEdit();
    const toggle = sheet.statusSwitch();
    await expect(toggle).toBeChecked();
    await toggle.click();
    await expect(toggle).not.toBeChecked();
    await sheet.saveButton().click();
    await expect(
      adminAppsPage.toast.withText(t.toast.updateSuccess)
    ).toBeVisible();
    await expect(
      adminAppsPage.rowText(rowName(), t.status.inactive, { exact: true })
    ).toBeVisible();

    // inactive → active, and the sheet re-opens with the stored state
    await openEdit();
    await expect(toggle).not.toBeChecked();
    await toggle.click();
    await sheet.saveButton().click();
    await expect(
      adminAppsPage.rowText(rowName(), t.status.active, { exact: true })
    ).toBeVisible();
  }
);

test(
  "The row menu only offers the valid transition",
  { tag: "@TC-ADMINAPPS-060" },
  async ({ page, adminAppsPage }) => {
    const { hideDialog } = adminAppsPage;
    // active → only "Hide"
    await adminAppsPage.rowMenuButton(rowName()).click();
    await expect(adminAppsPage.hideItem()).toBeVisible();
    await expect(adminAppsPage.unhideItem()).toHaveCount(0);

    // Hide asks first; Cancel leaves the app active.
    await adminAppsPage.hideItem().click();
    await expect(hideDialog.question(displayName)).toBeVisible();
    await hideDialog.cancelButton().click();
    await expect(
      adminAppsPage.rowText(rowName(), t.status.active, { exact: true })
    ).toBeVisible();

    // Confirming pauses it; now the menu offers only "Unhide".
    await adminAppsPage.startHide(rowName());
    await hideDialog.confirmButton().click();
    await expect(adminAppsPage.toast.withText(t.toast.hidden)).toBeVisible();
    await expect(
      adminAppsPage.rowText(rowName(), t.status.inactive, { exact: true })
    ).toBeVisible();
    await adminAppsPage.rowMenuButton(rowName()).click();
    await expect(adminAppsPage.unhideItem()).toBeVisible();
    await expect(adminAppsPage.hideItem()).toHaveCount(0);
    await page.keyboard.press("Escape");
  }
);

test(
  "Hiding and unhiding are announced to screen readers",
  { tag: "@TC-ADMINAPPS-070" },
  async ({ adminAppsPage }) => {
    // record() must run before a navigation: reload the list after it.
    await adminAppsPage.announcer.record();
    await adminAppsPage.goto();
    await expect(adminAppsPage.row(rowName())).toBeVisible();

    await adminAppsPage.startHide(rowName());
    await adminAppsPage.hideDialog.confirmButton().click();
    await expect(
      adminAppsPage.rowText(rowName(), t.status.inactive, { exact: true })
    ).toBeVisible();
    await expect
      .poll(() => adminAppsPage.announcer.history())
      .toContain(fill(t.announce.hidden, { name: displayName }));

    await adminAppsPage.unhide(rowName());
    await expect(
      adminAppsPage.rowText(rowName(), t.status.active, { exact: true })
    ).toBeVisible();
    await expect
      .poll(() => adminAppsPage.announcer.history())
      .toContain(fill(t.announce.reactivated, { name: displayName }));
  }
);
