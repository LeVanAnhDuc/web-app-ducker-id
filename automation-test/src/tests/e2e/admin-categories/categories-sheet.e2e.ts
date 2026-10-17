import { test, expect } from "@/fixtures";
import { copyVi } from "@/data/copy";
import { AdminCategoriesPage } from "@/pages/admin/admin-categories.page";
import { CATEGORIES_PATH, CATEGORIES_ROUTE } from "./helpers";

test.use({ role: "admin" });

// The create / edit sheet's keyboard behaviour, rate-limit handling and
// Vietnamese errors (REQ-ADMINCATEGORIES-02).
// Test cases: test-cases/admin-categories.md (TC-ADMINCATEGORIES-068 … -070).
// Nothing is saved: the one request that would create is stubbed or refused.

const tVi = copyVi.adminCategories;

test(
  "The sheet focuses the English field, closes on Escape and returns focus",
  { tag: "@TC-ADMINCATEGORIES-068" },
  async ({ adminCategoriesPage, page }) => {
    const { sheet } = adminCategoriesPage;
    const trigger = adminCategoriesPage.createButtons().first();
    await adminCategoriesPage.goto();
    await adminCategoriesPage.openCreate();
    await expect(sheet.form.enInput()).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(sheet.root()).toBeHidden();
    await expect(trigger).toBeFocused();
  }
);

test(
  "A rate-limited create shows the server's message and keeps the values",
  { tag: "@TC-ADMINCATEGORIES-069" },
  async ({ adminCategoriesPage, page }) => {
    const { sheet } = adminCategoriesPage;
    // The stub's own message: proves the toast shows whatever the server says.
    const MESSAGE = "Too many category changes. Try again in a minute.";
    await page.route(CATEGORIES_ROUTE, (route) =>
      route.request().method() === "POST"
        ? route.fulfill({
            status: 429,
            contentType: "application/json",
            body: JSON.stringify({
              code: "RATE_LIMIT_EXCEEDED",
              message: MESSAGE,
              timestamp: new Date().toISOString(),
              path: CATEGORIES_PATH
            })
          })
        : route.continue()
    );
    await adminCategoriesPage.goto();
    await adminCategoriesPage.openCreate();
    await sheet.form.fillNames("E2E Throttled", "Bị giới hạn");
    await sheet.createSubmit().click();
    await expect(adminCategoriesPage.toast.withText(MESSAGE)).toBeVisible();
    await expect(sheet.root()).toBeVisible();
    await expect(sheet.form.enInput()).toHaveValue("E2E Throttled");
  }
);

test(
  "Required and duplicate errors render in Vietnamese",
  { tag: "@TC-ADMINCATEGORIES-070" },
  async ({ page }) => {
    const viPage = new AdminCategoriesPage(page, copyVi, "/vi");
    const { sheet } = viPage;
    await viPage.goto();
    await viPage.openCreate();
    await sheet.createSubmit().click();
    await expect(
      viPage.text(tVi.form.validation.nameEn.required)
    ).toBeVisible();
    await expect(
      viPage.text(tVi.form.validation.nameVi.required)
    ).toBeVisible();

    // [DT] duplicate en (other case) + valid vi → 409 on the English field.
    await sheet.form.fillNames("identity", "Bản sao");
    await sheet.createSubmit().click();
    await expect(sheet.text(tVi.form.validation.nameEn.taken)).toBeVisible();
  }
);
