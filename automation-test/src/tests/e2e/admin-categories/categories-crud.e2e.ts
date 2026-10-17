import { test, expect } from "@/fixtures";
import type { APIRequestContext } from "@playwright/test";
import { createApiClient, type ApiClient } from "@/api";
import { adminContext } from "@/api/session";
import { copy, copyVi, fill } from "@/data/copy";
import { SEED_CATEGORIES } from "@/data/test-data";
import { AdminCategoriesPage } from "@/pages/admin/admin-categories.page";
import {
  categoryBySlug,
  createCategory,
  listAdminCategories,
  removeCategory,
  removeE2ECategories,
  uniqueName
} from "@/utils/categories";
import { CATEGORIES_ROUTE, isCreateCategoryRequest } from "./helpers";

test.use({ role: "admin" });

// Create / rename a category through the sheet (REQ-ADMINCATEGORIES-02).
// Test cases: test-cases/admin-categories.md (TC-ADMINCATEGORIES-007 … -020, -071).
// "dòng N" in a test case refers to the matrix in
// docs/specs/category-management/design.md §6. Every category created here is
// named "E2E …" and deleted in afterAll.

test.describe.configure({ mode: "serial" });

const t = copy.adminCategories;
const errors = t.form.validation;

let ctx: APIRequestContext;
let api: ApiClient;
let contentId: string;

test.beforeAll(async () => {
  ctx = await adminContext();
  api = createApiClient(ctx);
  contentId = (await categoryBySlug(api, "content"))._id;
});

test.afterAll(async () => {
  await removeE2ECategories(api, contentId);
  await ctx.dispose();
});

test.describe("Admin categories — create", () => {
  test(
    "A new category is added last with a slug from its English name",
    { tag: ["@TC-ADMINCATEGORIES-007", "@smoke"] },
    async ({ adminCategoriesPage }) => {
      const { sheet } = adminCategoriesPage;
      const en = uniqueName("Finance");
      await adminCategoriesPage.goto();
      await adminCategoriesPage.openCreate();
      await sheet.form.fillNames(en, "Tài chính");
      const expectedSlug = en.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      await expect(sheet.form.slugPreview()).toHaveText(expectedSlug);
      await sheet.createSubmit().click();

      await expect(sheet.root()).toBeHidden();
      const rows = adminCategoriesPage.dataRows();
      await expect(rows.last()).toContainText(en);
      await expect(rows.last()).toContainText(expectedSlug);
    }
  );

  test(
    "Both names empty: both fields report and nothing is sent",
    { tag: "@TC-ADMINCATEGORIES-008" },
    async ({ adminCategoriesPage, page }) => {
      let posted = false;
      page.on("request", (r) => {
        if (isCreateCategoryRequest(r)) posted = true;
      });
      await adminCategoriesPage.goto();
      await adminCategoriesPage.openCreate();
      await adminCategoriesPage.sheet.createSubmit().click();
      await expect(
        adminCategoriesPage.text(errors.nameEn.required)
      ).toBeVisible();
      await expect(
        adminCategoriesPage.text(errors.nameVi.required)
      ).toBeVisible();
      expect(posted).toBe(false);
    }
  );

  test(
    "Whitespace-only and zero-width-only names count as empty",
    { tag: "@TC-ADMINCATEGORIES-009" },
    async ({ adminCategoriesPage }) => {
      const { sheet } = adminCategoriesPage;
      await adminCategoriesPage.goto();
      await adminCategoriesPage.openCreate();
      await sheet.form.enInput().fill("   ");
      await sheet.form.viInput().fill("​ ");
      await sheet.createSubmit().click();
      await expect(
        adminCategoriesPage.text(errors.nameEn.required)
      ).toBeVisible();
      await expect(
        adminCategoriesPage.text(errors.nameVi.required)
      ).toBeVisible();
    }
  );

  test(
    "An English name without a letter or digit is refused",
    { tag: "@TC-ADMINCATEGORIES-010" },
    async ({ adminCategoriesPage }) => {
      const { sheet } = adminCategoriesPage;
      await adminCategoriesPage.goto();
      await adminCategoriesPage.openCreate();
      await sheet.form.fillNames("🚀 !!!", "Tên lửa");
      await sheet.createSubmit().click();
      await expect(
        adminCategoriesPage.text(errors.nameEn.noSlug)
      ).toBeVisible();
    }
  );

  test(
    "100 characters are accepted, 101 refused in the form",
    { tag: "@TC-ADMINCATEGORIES-011" },
    async ({ adminCategoriesPage }) => {
      const { sheet } = adminCategoriesPage;
      await adminCategoriesPage.goto();
      await adminCategoriesPage.openCreate();
      await sheet.form.fillNames("a".repeat(101), "b");
      await sheet.createSubmit().click();
      await expect(
        adminCategoriesPage.text(errors.nameEn.maxLength)
      ).toBeVisible();

      const hundred = `E2E ${"x".repeat(96)}`;
      expect(hundred).toHaveLength(100);
      await sheet.form.enInput().fill(hundred);
      await sheet.createSubmit().click();
      await expect(sheet.root()).toBeHidden();
    }
  );

  test(
    "A duplicate English name in another case is a 409 on the English field",
    { tag: "@TC-ADMINCATEGORIES-012" },
    async ({ adminCategoriesPage }) => {
      const { sheet } = adminCategoriesPage;
      await adminCategoriesPage.goto();
      await adminCategoriesPage.openCreate();
      await sheet.form.fillNames("  CONTENT  ", "Bản sao");
      await sheet.createSubmit().click();
      await expect(
        adminCategoriesPage.text(errors.nameEn.taken).first()
      ).toBeVisible();
      await expect(sheet.root()).toBeVisible();
    }
  );

  test(
    "Duplicate English with empty Vietnamese fails on the client first",
    { tag: "@TC-ADMINCATEGORIES-013" },
    async ({ adminCategoriesPage, page }) => {
      let posted = false;
      page.on("request", (r) => {
        if (isCreateCategoryRequest(r)) posted = true;
      });
      await adminCategoriesPage.goto();
      await adminCategoriesPage.openCreate();
      await adminCategoriesPage.sheet.form.enInput().fill("Content");
      await adminCategoriesPage.sheet.createSubmit().click();
      await expect(
        adminCategoriesPage.text(errors.nameVi.required)
      ).toBeVisible();
      expect(posted).toBe(false);
    }
  );

  test(
    "The Vietnamese page's slug preview folds đ and accents",
    { tag: "@TC-ADMINCATEGORIES-014" },
    async ({ page }) => {
      const viPage = new AdminCategoriesPage(page, copyVi, "/vi");
      await viPage.goto();
      await viPage.createButtons().first().click();
      await viPage.sheet.form.enInput().fill("Đa dạng Phân Tích");
      await expect(viPage.sheet.form.slugPreview()).toHaveText(
        "da-dang-phan-tich"
      );
    }
  );

  test(
    "A server error keeps the sheet open with the typed values",
    { tag: "@TC-ADMINCATEGORIES-015" },
    async ({ adminCategoriesPage, page }) => {
      const { sheet } = adminCategoriesPage;
      await page.route(CATEGORIES_ROUTE, (route) =>
        route.request().method() === "POST"
          ? route.fulfill({ status: 500, body: "{}" })
          : route.continue()
      );
      await adminCategoriesPage.goto();
      await adminCategoriesPage.openCreate();
      await sheet.form.fillNames("E2E Server Down", "Lỗi");
      await sheet.createSubmit().click();
      await expect(sheet.root()).toBeVisible();
      await expect(sheet.form.enInput()).toHaveValue("E2E Server Down");
    }
  );

  test(
    "Double-clicking Create makes one category",
    { tag: "@TC-ADMINCATEGORIES-016" },
    async ({ adminCategoriesPage, page }) => {
      const { sheet } = adminCategoriesPage;
      const en = uniqueName("Double");
      let posts = 0;
      page.on("request", (r) => {
        if (isCreateCategoryRequest(r)) posts += 1;
      });
      await adminCategoriesPage.goto();
      await adminCategoriesPage.openCreate();
      await sheet.form.fillNames(en, "Đôi");
      await sheet.createSubmit().dblclick();
      await expect(sheet.root()).toBeHidden();
      expect(posts).toBe(1);
      expect(
        (await listAdminCategories(api)).filter((c) => c.name.en === en)
      ).toHaveLength(1);
    }
  );

  test(
    "Create, save and delete each confirm with a toast and an announcement",
    { tag: "@TC-ADMINCATEGORIES-071" },
    async ({ adminCategoriesPage }) => {
      const { sheet, deleteDialog, announcer, toast } = adminCategoriesPage;
      const en = uniqueName("Feedback");
      await announcer.record();
      await adminCategoriesPage.goto();

      await adminCategoriesPage.openCreate();
      await sheet.form.fillNames(en, "Phản hồi");
      await sheet.createSubmit().click();
      await expect(sheet.root()).toBeHidden();
      await expect(toast.withText(t.toast.createSuccess)).toBeVisible();

      await adminCategoriesPage.openEdit(en);
      await sheet.form.viInput().fill("Phản hồi mới");
      await sheet.saveButton().click();
      await expect(sheet.root()).toBeHidden();
      await expect(toast.withText(t.toast.updateSuccess)).toBeVisible();

      await adminCategoriesPage.openDelete(en);
      await deleteDialog.confirmButton().click();
      await expect(deleteDialog.root()).toBeHidden();
      await expect(toast.withText(t.toast.deleteSuccess)).toBeVisible();

      await expect
        .poll(() => announcer.history())
        .toEqual(
          expect.arrayContaining([
            fill(t.announce.created, { name: en }),
            fill(t.announce.updated, { name: en }),
            fill(t.announce.deleted, { name: en })
          ])
        );
    }
  );
});

test.describe("Admin categories — edit", () => {
  test(
    "Renaming the English name moves the slug; renaming only Vietnamese keeps it",
    { tag: ["@TC-ADMINCATEGORIES-017", "@smoke"] },
    async ({ adminCategoriesPage }) => {
      const { sheet } = adminCategoriesPage;
      const created = await createCategory(api, {
        en: uniqueName("Rename"),
        vi: "Đổi tên"
      });
      await adminCategoriesPage.goto();
      await adminCategoriesPage.openEdit(created.name.en);

      await sheet.form.viInput().fill("Chỉ đổi tiếng Việt");
      await expect(sheet.form.slugPreview()).not.toContainText("→");
      await sheet.form.enInput().fill(`${created.name.en} Two`);
      await expect(sheet.form.oldSlug()).toHaveText(created.slug);
      await sheet.saveButton().click();
      await expect(sheet.root()).toBeHidden();

      const after = (await listAdminCategories(api)).find(
        (c) => c._id === created._id
      );
      expect(after?.slug).toBe(`${created.slug}-two`);
      expect(after?.name.vi).toBe("Chỉ đổi tiếng Việt");
    }
  );

  test(
    "A rename onto a taken slug gets a suffix, and back again drops it",
    { tag: "@TC-ADMINCATEGORIES-018" },
    async ({ adminCategoriesPage }) => {
      const { sheet } = adminCategoriesPage;
      const created = await createCategory(api, {
        en: uniqueName("Slugclash"),
        vi: "Trùng"
      });
      await adminCategoriesPage.goto();
      await adminCategoriesPage.openEdit(created.name.en);
      await sheet.form.enInput().fill("Identity!");
      await sheet.saveButton().click();
      await expect(sheet.root()).toBeHidden();
      const row = adminCategoriesPage.row("identity-2");
      await expect(row).toBeVisible();

      // Back to its own name: its old slug is free again, no suffix.
      await adminCategoriesPage
        .buttonIn(row, fill(t.actions.edit, { name: "Identity!" }))
        .click();
      await sheet.form.enInput().fill(created.name.en);
      await sheet.saveButton().click();
      await expect(adminCategoriesPage.row(created.slug)).toBeVisible();
    }
  );

  test(
    "Saving a category deleted in another tab closes the sheet and drops the row",
    { tag: "@TC-ADMINCATEGORIES-019" },
    async ({ adminCategoriesPage }) => {
      const { sheet } = adminCategoriesPage;
      const created = await createCategory(api, {
        en: uniqueName("Gone"),
        vi: "Đã xoá"
      });
      await adminCategoriesPage.goto();
      await adminCategoriesPage.openEdit(created.name.en);
      await removeCategory(api, created._id);
      await sheet.form.viInput().fill("Muộn");
      await sheet.saveButton().click();
      await expect(sheet.root()).toBeHidden();
      await expect(adminCategoriesPage.row(created.name.en)).toHaveCount(0);
    }
  );

  test(
    "Creating and renaming never touches the seeded categories",
    { tag: "@TC-ADMINCATEGORIES-020" },
    async () => {
      const names = (await listAdminCategories(api)).map((c) => c.name.en);
      for (const seed of SEED_CATEGORIES) expect(names).toContain(seed.en);
    }
  );
});
