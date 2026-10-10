import { test, expect } from "@fixtures";
import type { Page } from "@playwright/test";
import {
  ADMIN_APPS_API,
  appBody,
  categoryIds,
  deleteE2EApps,
  e2eAppName
} from "@helpers/adminApps";

test.use({ role: "admin" });

// Activating / deactivating an app (REQ-ADMAPPS-05) — State Transition
// active ↔ inactive through the edit sheet's status switch and the row menu.
// Test cases: test-cases/admin-apps.md (TC-ADMAPPS-059, TC-ADMAPPS-060).
//
// Each test registers its own `e2e-…` app over the API (admin-only role, so
// it never reaches a regular user's launcher) and deletes it afterwards.

let displayName: string;

const row = (page: Page) =>
  page.getByRole("row", { name: new RegExp(displayName) });

const openEdit = async (page: Page) => {
  await row(page).getByRole("button", { name: "App actions" }).click();
  await page.getByRole("menuitem", { name: "Edit" }).click();
  await expect(page.getByRole("heading", { name: "Edit App" })).toBeVisible();
};

test.beforeEach(async ({ adminApi, page }) => {
  const [first] = await categoryIds(adminApi);
  const body = appBody([first], {
    name: e2eAppName("status"),
    status: "active"
  });
  displayName = body.displayName as string;
  const res = await adminApi.post(ADMIN_APPS_API, { data: body });
  expect(res.status()).toBe(201);
  await page.goto("/admin/apps");
  await expect(row(page)).toBeVisible();
});

test.afterEach(async () => {
  await deleteE2EApps();
});

test(
  "the status switch in the edit sheet pauses and reactivates the app",
  { tag: "@TC-ADMAPPS-059" },
  async ({ page }) => {
    await expect(row(page).getByText("Active", { exact: true })).toBeVisible();

    // active → inactive
    await openEdit(page);
    const toggle = page.getByRole("dialog").getByRole("switch");
    await expect(toggle).toBeChecked();
    await toggle.click();
    await expect(toggle).not.toBeChecked();
    await page.getByRole("button", { name: "Save Changes" }).click();
    await expect(page.getByText("App updated.")).toBeVisible();
    await expect(row(page).getByText("Paused", { exact: true })).toBeVisible();

    // inactive → active, and the sheet re-opens with the stored state
    await openEdit(page);
    await expect(toggle).not.toBeChecked();
    await toggle.click();
    await page.getByRole("button", { name: "Save Changes" }).click();
    await expect(row(page).getByText("Active", { exact: true })).toBeVisible();
  }
);

test(
  "the row menu only offers the transition that is valid for the current status",
  { tag: "@TC-ADMAPPS-060" },
  async ({ page }) => {
    // active → only "Hide"
    await row(page).getByRole("button", { name: "App actions" }).click();
    await expect(
      page.getByRole("menuitem", { name: "Hide", exact: true })
    ).toBeVisible();
    await expect(page.getByRole("menuitem", { name: "Unhide" })).toHaveCount(0);

    // Hide asks first; Cancel leaves the app active.
    await page.getByRole("menuitem", { name: "Hide", exact: true }).click();
    const confirm = page.getByRole("alertdialog").or(page.getByRole("dialog"));
    await expect(confirm.getByText(`Hide ${displayName}?`)).toBeVisible();
    await confirm.getByRole("button", { name: "Cancel" }).click();
    await expect(row(page).getByText("Active", { exact: true })).toBeVisible();

    // Confirming pauses it; now the menu offers only "Unhide".
    await row(page).getByRole("button", { name: "App actions" }).click();
    await page.getByRole("menuitem", { name: "Hide", exact: true }).click();
    await page.getByRole("button", { name: "Hide App" }).click();
    await expect(page.getByText("App hidden.")).toBeVisible();
    await expect(row(page).getByText("Paused", { exact: true })).toBeVisible();
    await row(page).getByRole("button", { name: "App actions" }).click();
    await expect(page.getByRole("menuitem", { name: "Unhide" })).toBeVisible();
    await expect(
      page.getByRole("menuitem", { name: "Hide", exact: true })
    ).toHaveCount(0);
    await page.keyboard.press("Escape");
  }
);
