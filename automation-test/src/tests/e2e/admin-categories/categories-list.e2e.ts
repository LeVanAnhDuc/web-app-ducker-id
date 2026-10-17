import { test, expect } from "@/fixtures";
import { copy, copyVi, fill } from "@/data/copy";
import { SEED_CATEGORIES } from "@/data/test-data";
import { AdminCategoriesPage } from "@/pages/admin/admin-categories.page";
import { formatIcu } from "@/utils/icu";
import { CATEGORIES_PATH, CATEGORIES_ROUTE } from "./helpers";

test.use({ role: "admin" });

// /admin/categories list, read-only (REQ-ADMINCATEGORIES-01, REQ-ADMINCATEGORIES-03).
// Test cases: test-cases/admin-categories.md (TC-ADMINCATEGORIES-001 … -006, -073).
// "dòng N" in a test case is the row of the E2E matrix in
// docs/specs/category-management/design.md §6. Nothing here mutates data.

const t = copy.adminCategories;
const tVi = copyVi.adminCategories;

test.describe("Admin categories — list", () => {
  test(
    "The list shows each category's English and Vietnamese names",
    { tag: ["@TC-ADMINCATEGORIES-001", "@smoke"] },
    async ({ adminCategoriesPage }) => {
      await adminCategoriesPage.goto();
      await expect(adminCategoriesPage.heading()).toBeVisible();

      const rows = adminCategoriesPage.dataRows();
      await expect(rows).toHaveCount(SEED_CATEGORIES.length);
      for (const [index, seed] of SEED_CATEGORIES.entries()) {
        const row = rows.nth(index);
        await expect(row).toContainText(seed.en);
        await expect(row).toContainText(seed.vi);
        await expect(
          adminCategoriesPage.exactText(row, seed.slug)
        ).toBeVisible();
        await expect(
          adminCategoriesPage.cell(row, String(seed.apps))
        ).toBeVisible();
      }
    }
  );

  test(
    "The first row cannot move up and the last cannot move down",
    { tag: "@TC-ADMINCATEGORIES-002" },
    async ({ adminCategoriesPage }) => {
      await adminCategoriesPage.goto();
      const first = SEED_CATEGORIES[0].en;
      const last = SEED_CATEGORIES[SEED_CATEGORIES.length - 1].en;
      await expect(adminCategoriesPage.moveUpButton(first)).toBeDisabled();
      await expect(adminCategoriesPage.moveDownButton(first)).toBeEnabled();
      await expect(adminCategoriesPage.moveDownButton(last)).toBeDisabled();
      await expect(adminCategoriesPage.moveUpButton(last)).toBeEnabled();
    }
  );

  test(
    "Every icon button is named after its category",
    { tag: "@TC-ADMINCATEGORIES-003" },
    async ({ adminCategoriesPage }) => {
      await adminCategoriesPage.goto();
      const row = adminCategoriesPage.row("Identity");
      for (const label of [
        t.actions.moveUp,
        t.actions.moveDown,
        t.actions.edit,
        t.actions.delete
      ]) {
        await expect(
          adminCategoriesPage.buttonIn(row, fill(label, { name: "Identity" }))
        ).toBeVisible();
      }
    }
  );

  test(
    "In Vietnamese the vi name comes first",
    { tag: "@TC-ADMINCATEGORIES-004" },
    async ({ page }) => {
      const viPage = new AdminCategoriesPage(page, copyVi, "/vi");
      await viPage.goto();
      await expect(viPage.heading()).toBeVisible();
      const row = viPage.row("Công cụ nội bộ");
      const cellText = await viPage.rowNameCell(row).innerText();
      expect(cellText.indexOf("Công cụ nội bộ")).toBeLessThan(
        cellText.indexOf("Internal Tools")
      );
      await expect(
        viPage.buttonIn(
          row,
          fill(tVi.actions.moveUp, { name: "Công cụ nội bộ" })
        )
      ).toBeVisible();
    }
  );

  test(
    "The admin sidebar links to the categories page",
    { tag: "@TC-ADMINCATEGORIES-005" },
    async ({ adminAppsPage, adminCategoriesPage, page }) => {
      await adminAppsPage.goto();
      await adminCategoriesPage.sidebar.categoriesLink().click();
      await expect(page).toHaveURL(/\/admin\/categories$/);
    }
  );

  test(
    "An empty list shows the empty state with a create action",
    { tag: "@TC-ADMINCATEGORIES-006" },
    async ({ adminCategoriesPage, page }) => {
      await page.route(CATEGORIES_ROUTE, (route) =>
        route.request().method() === "GET"
          ? route.fulfill({
              status: 200,
              contentType: "application/json",
              body: JSON.stringify({
                timestamp: new Date().toISOString(),
                path: CATEGORIES_PATH,
                message: "ok",
                data: []
              })
            })
          : route.continue()
      );
      await adminCategoriesPage.goto();
      await expect(adminCategoriesPage.emptyTitle()).toBeVisible();
      await expect(adminCategoriesPage.createButtons().last()).toBeVisible();
    }
  );

  test(
    "The edit sheet is prefilled and says how many apps use the category",
    { tag: "@TC-ADMINCATEGORIES-073" },
    async ({ adminCategoriesPage }) => {
      const { sheet } = adminCategoriesPage;
      const identity = SEED_CATEGORIES[2];
      await adminCategoriesPage.goto();
      await adminCategoriesPage.openEdit(identity.en);
      await expect(sheet.form.enInput()).toHaveValue(identity.en);
      await expect(sheet.form.viInput()).toHaveValue(identity.vi);
      await expect(
        sheet.text(formatIcu(t.form.editDescription, { count: identity.apps }))
      ).toBeVisible();
      await expect(sheet.form.slugPreview()).toContainText(identity.slug);
      // Cancel saves nothing.
      await sheet.cancelButton().click();
      await expect(sheet.root()).toBeHidden();
      await expect(
        adminCategoriesPage.exactText(
          adminCategoriesPage.row(identity.en),
          identity.slug
        )
      ).toBeVisible();
    }
  );
});
