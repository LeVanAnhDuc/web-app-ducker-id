import { test, expect } from "@/fixtures";
import type { APIRequestContext } from "@playwright/test";
import { createApiClient, type ApiClient } from "@/api";
import { adminContext } from "@/api/session";
import { copy } from "@/data/copy";
import { AppsPage } from "@/pages/dashboard/apps.page";
import {
  appByName,
  categoryBySlug,
  createCategory,
  listAdminCategories,
  removeCategory,
  removeE2ECategories,
  restoreAppCategories,
  setAppCategories,
  snapshotAppCategories,
  uniqueName
} from "@/utils/categories";

test.use({ role: "admin" });

// Picking 1–5 ordered categories for an app, quick create from the picker,
// and how the chips render for users (REQ-ADMINAPPS-02, REQ-ADMINCATEGORIES-01/02/04).
// Runs as admin (who sees the full active catalog on /apps).
// Test cases: test-cases/admin-categories.md (TC-ADMINCATEGORIES-036 … -047).
// Blog / Notes / IDMS Portal are borrowed and restored in afterAll.

test.describe.configure({ mode: "serial" });

const tApps = copy.adminApps;
const picker = tApps.form.fields.categoryIds;

let ctx: APIRequestContext;
let api: ApiClient;
let snapshot: Map<string, string[]>;
let ids: Record<"content" | "tools" | "identity" | "productivity", string>;

const BLOG = /Blog/;

test.beforeAll(async () => {
  ctx = await adminContext();
  api = createApiClient(ctx);
  snapshot = await snapshotAppCategories(api);
  ids = {
    content: (await categoryBySlug(api, "content"))._id,
    tools: (await categoryBySlug(api, "internal-tools"))._id,
    identity: (await categoryBySlug(api, "identity"))._id,
    productivity: (await categoryBySlug(api, "productivity"))._id
  };
});

test.afterAll(async () => {
  await restoreAppCategories(api, snapshot);
  await removeE2ECategories(api, ids.content);
  await ctx.dispose();
});

test(
  "A second category keeps the first as primary, in order everywhere",
  { tag: ["@TC-ADMINCATEGORIES-036", "@smoke"] },
  async ({ adminAppsPage, appsPage, page }) => {
    const { sheet } = adminAppsPage;
    await adminAppsPage.goto();
    await adminAppsPage.openEdit(BLOG);
    await sheet.categoriesPicker().click();
    await sheet.categoryOption("Identity").click();
    await page.keyboard.press("Escape");
    await expect(sheet.categoriesList()).toContainText(
      new RegExp(`Content.*${picker.primary}.*Identity`)
    );
    await sheet.saveButton().click();
    await expect(
      adminAppsPage.toast.withText(tApps.toast.updateSuccess)
    ).toBeVisible();

    expect((await appByName(api, "blog")).categoryIds).toEqual([
      ids.content,
      ids.identity
    ]);

    await appsPage.goto();
    await expect(appsPage.categoryChipItems("Blog")).toHaveText([
      "Content",
      "Identity"
    ]);
  }
);

test(
  "Removing the primary promotes the next one, and the order survives",
  { tag: "@TC-ADMINCATEGORIES-037" },
  async ({ adminAppsPage }) => {
    const { sheet } = adminAppsPage;
    const saved = adminAppsPage.toast.withText(tApps.toast.updateSuccess);
    await adminAppsPage.goto();
    await adminAppsPage.openEdit(BLOG);
    await sheet.removeCategoryButton("Content").click();
    await expect(sheet.categoriesList()).toContainText(
      new RegExp(`Identity.*${picker.primary}`)
    );
    await sheet.saveButton().click();
    await expect(saved).toBeVisible();
    await adminAppsPage.goto();
    await adminAppsPage.openEdit(BLOG);
    await expect(sheet.categoriesList()).toContainText(
      new RegExp(`Identity.*${picker.primary}`)
    );
    // Editing another field leaves the categories alone.
    await sheet.displayNameInput().fill("Blog");
    await sheet.saveButton().click();
    await expect(saved).toBeVisible();
    expect((await appByName(api, "blog")).categoryIds).toEqual([ids.identity]);
  }
);

test(
  "Unticking then re-ticking a category moves it to the end",
  { tag: "@TC-ADMINCATEGORIES-038" },
  async ({ adminAppsPage, page }) => {
    const { sheet } = adminAppsPage;
    await setAppCategories(api, "blog", [ids.content, ids.identity]);
    await adminAppsPage.goto();
    await adminAppsPage.openEdit(BLOG);
    await sheet.categoriesPicker().click();
    await sheet.categoryOption("Content").click();
    await sheet.categoryOption("Content").click();
    await page.keyboard.press("Escape");
    await expect(sheet.categoriesList()).toContainText(
      new RegExp(`Identity.*${picker.primary}.*Content`)
    );
  }
);

test(
  "0 categories is refused; 5 locks the rest and quick create",
  { tag: ["@TC-ADMINCATEGORIES-039", "@smoke"] },
  async ({ adminAppsPage }) => {
    const { sheet } = adminAppsPage;
    await createCategory(api, { en: uniqueName("Fifth"), vi: "Năm" });
    await createCategory(api, { en: uniqueName("Sixth"), vi: "Sáu" });
    await setAppCategories(api, "blog", [ids.content]);
    await adminAppsPage.goto();
    await adminAppsPage.openEdit(BLOG);

    await sheet.removeCategoryButton("Content").click();
    await sheet.saveButton().click();
    await expect(
      adminAppsPage.text(tApps.form.validation.categoryIds.required)
    ).toBeVisible();

    await sheet.categoriesPicker().click();
    const options = sheet.categoryOptions();
    for (let i = 0; i < 5; i += 1) await options.nth(i).click();
    await expect(adminAppsPage.text(picker.maxReached)).toBeVisible();
    await expect(options.nth(5)).toBeDisabled();
    await expect(sheet.createCategoryButtons()).toBeDisabled();
  }
);

test(
  "Picker search is accent-insensitive and an exact match offers no create",
  { tag: "@TC-ADMINCATEGORIES-040" },
  async ({ adminAppsPage }) => {
    const { sheet } = adminAppsPage;
    await adminAppsPage.goto();
    await adminAppsPage.openEdit(BLOG);
    await sheet.categoriesPicker().click();
    const search = sheet.categorySearchInput();
    await search.fill("nang suat");
    await expect(sheet.categoryOption("Productivity")).toBeVisible();
    // "nang suat" folds to the same key as "Năng suất" — an exact match, no create.
    await expect(sheet.createCategoryButtons()).toHaveCount(0);
    await search.fill("prod");
    await expect(sheet.categoryOption("Productivity")).toBeVisible();
    await expect(sheet.createNamedCategoryButton("prod")).toBeVisible();
    await search.fill("content");
    await expect(sheet.categoryOption("Content")).toBeVisible();
    await expect(sheet.createCategoryButtons()).toHaveCount(0);
  }
);

test(
  "Quick create from the picker selects the new category; cancel keeps the form",
  { tag: "@TC-ADMINCATEGORIES-041" },
  async ({ adminAppsPage }) => {
    const { sheet } = adminAppsPage;
    const { quickCreate } = sheet;
    await setAppCategories(api, "blog", [ids.content]);
    const en = uniqueName("Quick");
    await adminAppsPage.goto();
    await adminAppsPage.openEdit(BLOG);

    await sheet.categoriesPicker().click();
    await sheet.categorySearchInput().fill(en);
    await sheet.createNamedCategoryButton(en).click();
    await expect(quickCreate.form.enInput()).toHaveValue(en);
    await quickCreate.cancelButton().click();
    await expect(sheet.displayNameInput()).toHaveValue("Blog");

    await sheet.categoriesPicker().click();
    await sheet.categorySearchInput().fill(en);
    await sheet.createNamedCategoryButton(en).click();
    await quickCreate.form.viInput().fill("Nhanh");
    await quickCreate.submitButton().click();
    await expect(sheet.categoriesList()).toContainText(en);
    await sheet.saveButton().click();
    await expect(
      adminAppsPage.toast.withText(tApps.toast.updateSuccess)
    ).toBeVisible();

    const created = (await listAdminCategories(api)).find(
      (c) => c.name.en === en
    );
    expect((await appByName(api, "blog")).categoryIds).toEqual([
      ids.content,
      created?._id
    ]);
  }
);

test(
  "Filtering /apps matches a category in any position",
  { tag: "@TC-ADMINCATEGORIES-042" },
  async ({ appsPage, page }) => {
    await setAppCategories(api, "blog", [ids.content, ids.identity]);
    await appsPage.goto(`?categoryId=${ids.identity}`);
    await expect(appsPage.text("Blog", { exact: true })).toBeVisible(); // secondary
    await expect(appsPage.text("IDMS Portal", { exact: true })).toBeVisible(); // primary
    await expect(appsPage.text("Notes", { exact: true })).toHaveCount(0); // none
    await page.reload();
    await expect(page).toHaveURL(new RegExp(`categoryId=${ids.identity}`));
    await expect(appsPage.text("Blog", { exact: true })).toBeVisible();
  }
);

test(
  "A filter on a deleted category is dropped, not an error",
  { tag: "@TC-ADMINCATEGORIES-043" },
  async ({ appsPage, adminAppsPage }) => {
    const temp = await createCategory(api, {
      en: uniqueName("Vanish"),
      vi: "Biến mất"
    });
    await removeCategory(api, temp._id);
    const query = `?categoryId=${temp._id}`;
    // A categoryId that matches no option is dropped by useListQuery, so the
    // list loads unfiltered. "Blog" visible first proves the data has landed —
    // absence checks before that pass vacuously.
    await appsPage.goto(query);
    await expect(appsPage.text("Blog", { exact: true }).first()).toBeVisible();
    await expect(appsPage.errorAlerts()).toHaveCount(0);

    await adminAppsPage.goto(query);
    await expect(
      adminAppsPage.text("Blog", { exact: true }).first()
    ).toBeVisible();
    await expect(adminAppsPage.errorAlerts()).toHaveCount(0);
  }
);

test(
  "A Vietnamese name that is in no locale file shows on /vi/apps",
  { tag: "@TC-ADMINCATEGORIES-044" },
  async ({ page }) => {
    const viApps = new AppsPage(page, "vi");
    const temp = await createCategory(api, {
      en: uniqueName("Lang"),
      vi: "Thử nghiệm ngôn ngữ"
    });
    await setAppCategories(api, "blog", [temp._id, ids.content]);
    await viApps.goto();
    await expect(viApps.text("Thử nghiệm ngôn ngữ").first()).toBeVisible();
    await expect(viApps.text(temp.name.en)).toHaveCount(0);
  }
);

test.describe("narrow card columns", () => {
  // Chips collapse by CONTAINER width, not viewport: a three-column grid at
  // 1024px leaves each card too narrow, while a phone's single column is wide.
  test.use({ viewport: { width: 1024, height: 800 }, hasTouch: true });

  test(
    'A narrow card shows the primary plus "+N", and tapping it opens nothing',
    { tag: "@TC-ADMINCATEGORIES-045" },
    async ({ appsPage, page, context }) => {
      await setAppCategories(api, "blog", [
        ids.content,
        ids.identity,
        ids.productivity
      ]);
      await appsPage.goto();
      let opened = false;
      context.on("page", () => {
        opened = true;
      });
      const more = appsPage.moreCategoriesButtons(2).first();
      await more.tap();
      const popover = appsPage.categoriesPopover();
      await expect(
        appsPage.categoriesPopoverText("Productivity")
      ).toBeVisible();
      expect(opened).toBe(false);
      await page.mouse.click(5, 5);
      await expect(popover).toBeHidden();
    }
  );
});

test.describe("phone width", () => {
  test.use({ viewport: { width: 375, height: 800 } });

  test(
    "100-character names do not cause horizontal scroll on a phone",
    { tag: "@TC-ADMINCATEGORIES-046" },
    async ({ appsPage, page }) => {
      const long = await createCategory(api, {
        en: `E2E ${"L".repeat(96)}`,
        vi: "Dài"
      });
      await setAppCategories(api, "blog", [long._id, ids.content]);
      await appsPage.goto();
      await expect(appsPage.text("Blog", { exact: true })).toBeVisible();
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth
      );
      expect(overflow).toBe(false);
    }
  );
});

test(
  "New categories reach other pages without a reload",
  { tag: "@TC-ADMINCATEGORIES-047" },
  async ({ adminCategoriesPage, adminAppsPage, page }) => {
    const { sheet } = adminCategoriesPage;
    const appSheet = adminAppsPage.sheet;
    const en = uniqueName("Fresh");
    await adminCategoriesPage.goto();
    await adminCategoriesPage.createButtons().first().click();
    await sheet.form.fillNames(en, "Mới");
    await sheet.createSubmit().click();
    await expect(sheet.root()).toBeHidden();

    await adminCategoriesPage.sidebar.appsLink().first().click();
    await expect(page).toHaveURL(/\/admin\/apps/);
    await adminAppsPage.rowMenuButton(BLOG).click();
    await adminAppsPage.editItem().click();
    await appSheet.categoriesPicker().click();
    await expect(appSheet.categoryOption(en)).toBeVisible();
  }
);
