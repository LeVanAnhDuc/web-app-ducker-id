import { test, expect } from "@/fixtures";
import type { APIRequestContext } from "@playwright/test";
import { createApiClient, type ApiClient } from "@/api";
import { adminContext } from "@/api/session";
import { copy, copyVi, fill } from "@/data/copy";
import { AdminCategoriesPage } from "@/pages/admin/admin-categories.page";
import {
  appByName,
  categoryBySlug,
  createCategory,
  removeCategory,
  removeE2ECategories,
  restoreAppCategories,
  setAppCategories,
  snapshotAppCategories,
  uniqueName
} from "@/utils/categories";
import { formatIcu } from "@/utils/icu";
import {
  CATEGORIES_ROUTE,
  DELETE_IMPACT_ROUTE,
  isDeleteCategoryRequest
} from "./helpers";

test.use({ role: "admin" });

// Delete with reassignment of sole-category apps (REQ-ADMINCATEGORIES-04; design
// decisions DR-5, DR-5b, DR-18).
// Test cases: test-cases/admin-categories.md (TC-ADMINCATEGORIES-025 … -035).
//
// Borrows seeded apps (team-calendar is inactive, so moving it does not show
// on /apps for other specs) and restores every app's categoryIds in afterAll.

test.describe.configure({ mode: "serial" });

const d = copy.adminCategories.delete;
const dVi = copyVi.adminCategories.delete;

let ctx: APIRequestContext;
let api: ApiClient;
let snapshot: Map<string, string[]>;
let ids: Record<"content" | "identity" | "productivity", string>;

const BORROWED = ["team-calendar", "notes", "ops-console"] as const;

test.beforeAll(async () => {
  ctx = await adminContext();
  api = createApiClient(ctx);
  snapshot = await snapshotAppCategories(api);
  ids = {
    content: (await categoryBySlug(api, "content"))._id,
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
  "A category no app uses is deleted after a plain confirmation",
  { tag: "@TC-ADMINCATEGORIES-025" },
  async ({ adminCategoriesPage }) => {
    const dialog = adminCategoriesPage.deleteDialog;
    const temp = await createCategory(api, {
      en: uniqueName("Empty"),
      vi: "Trống"
    });
    await adminCategoriesPage.goto();
    await adminCategoriesPage.openDelete(temp.name.en);
    await expect(dialog.text(d.noApps)).toBeVisible();
    await dialog.confirmButton().click();
    await expect(dialog.root()).toBeHidden();
    await expect(adminCategoriesPage.row(temp.name.en)).toHaveCount(0);
  }
);

test(
  "Apps that keep another category only lose this one",
  { tag: "@TC-ADMINCATEGORIES-026" },
  async ({ adminCategoriesPage }) => {
    const dialog = adminCategoriesPage.deleteDialog;
    const temp = await createCategory(api, {
      en: uniqueName("Shared"),
      vi: "Dùng chung"
    });
    await setAppCategories(api, "notes", [ids.productivity, temp._id]);
    await adminCategoriesPage.goto();
    await adminCategoriesPage.openDelete(temp.name.en);
    await expect(dialog.text(formatIcu(d.total, { count: 1 }))).toBeVisible();
    await expect(
      dialog.text(formatIcu(d.onlyRemoved, { count: 1 }))
    ).toBeVisible();
    await dialog.confirmButton().click();
    await expect(dialog.root()).toBeHidden();
    expect((await appByName(api, "notes")).categoryIds).toEqual([
      ids.productivity
    ]);
  }
);

test(
  "Orphans move to a shared target, an override survives a change of the shared target",
  { tag: ["@TC-ADMINCATEGORIES-027", "@smoke"] },
  async ({ adminCategoriesPage }) => {
    const dialog = adminCategoriesPage.deleteDialog;
    const temp = await createCategory(api, {
      en: uniqueName("Orphans"),
      vi: "Mồ côi"
    });
    for (const app of BORROWED) await setAppCategories(api, app, [temp._id]);

    await adminCategoriesPage.goto();
    await adminCategoriesPage.openDelete(temp.name.en);
    await expect(
      dialog.text(formatIcu(d.orphansTitle, { count: 3 }))
    ).toBeVisible();
    await expect(
      dialog.text(fill(d.progress, { done: 0, total: 3 }))
    ).toBeVisible();
    await expect(dialog.confirmButton()).toBeDisabled();

    // Override Notes first, then pick the shared target.
    await dialog.pick(dialog.rowSelect("Notes"), "Identity");
    await expect(dialog.overrideBadges()).toHaveCount(1);
    await expect(
      dialog.text(fill(d.progress, { done: 1, total: 3 }))
    ).toBeVisible();
    await dialog.pick(dialog.bulkSelect(), "Content");
    await expect(
      dialog.text(fill(d.progress, { done: 3, total: 3 }))
    ).toBeVisible();
    await expect(dialog.rowSelect("Notes")).toHaveText("Identity");

    // Changing the shared target leaves the override alone…
    await dialog.pick(dialog.bulkSelect(), "Productivity");
    await expect(dialog.rowSelect("Notes")).toHaveText("Identity");
    // …and resetting a row to "(shared)" makes it follow again.
    await dialog.pick(dialog.rowSelect("Operations Console"), "Identity");
    await dialog.pick(
      dialog.rowSelect("Operations Console"),
      fill(d.shared, { name: "Productivity" })
    );
    await expect(dialog.overrideBadges()).toHaveCount(1);

    await expect(dialog.confirmButton()).toBeEnabled();
    await dialog.confirmButton().click();
    await expect(dialog.root()).toBeHidden();

    expect((await appByName(api, "team-calendar")).categoryIds).toEqual([
      ids.productivity
    ]);
    expect((await appByName(api, "ops-console")).categoryIds).toEqual([
      ids.productivity
    ]);
    expect((await appByName(api, "notes")).categoryIds).toEqual([ids.identity]);
  }
);

test(
  "Orphans set per app go to different targets",
  { tag: "@TC-ADMINCATEGORIES-028" },
  async ({ adminCategoriesPage }) => {
    const dialog = adminCategoriesPage.deleteDialog;
    const temp = await createCategory(api, {
      en: uniqueName("PerApp"),
      vi: "Từng app"
    });
    await setAppCategories(api, "team-calendar", [temp._id]);
    await setAppCategories(api, "notes", [temp._id]);
    await adminCategoriesPage.goto();
    await adminCategoriesPage.openDelete(temp.name.en);
    await dialog.pick(dialog.rowSelect("Team Calendar"), "Content");
    await expect(dialog.confirmButton()).toBeDisabled();
    await expect(
      adminCategoriesPage.text(formatIcu(d.remaining, { count: 1 }))
    ).toBeVisible();
    await dialog.pick(dialog.rowSelect("Notes"), "Identity");
    await dialog.confirmButton().click();
    await expect(dialog.root()).toBeHidden();
    expect((await appByName(api, "team-calendar")).categoryIds).toEqual([
      ids.content
    ]);
    expect((await appByName(api, "notes")).categoryIds).toEqual([ids.identity]);
  }
);

test(
  "An app orphaned after the dialog opened forces a reload, keeping choices",
  { tag: "@TC-ADMINCATEGORIES-029" },
  async ({ adminCategoriesPage }) => {
    const dialog = adminCategoriesPage.deleteDialog;
    const temp = await createCategory(api, {
      en: uniqueName("Changed"),
      vi: "Đã đổi"
    });
    await setAppCategories(api, "team-calendar", [temp._id]);
    await adminCategoriesPage.goto();
    await adminCategoriesPage.openDelete(temp.name.en);
    await dialog.pick(dialog.rowSelect("Team Calendar"), "Identity");

    await setAppCategories(api, "notes", [temp._id]);
    await dialog.confirmButton().click();

    await expect(dialog.text("Notes", { exact: true })).toBeVisible();
    await expect(dialog.rowSelect("Team Calendar")).toHaveText("Identity");
    await expect(dialog.confirmButton()).toBeDisabled();
    await dialog.pick(dialog.rowSelect("Notes"), "Content");
    await dialog.confirmButton().click();
    await expect(dialog.root()).toBeHidden();
    expect((await appByName(api, "notes")).categoryIds).toEqual([ids.content]);
  }
);

test(
  "A target deleted in another tab is dropped from the dialog",
  { tag: "@TC-ADMINCATEGORIES-030" },
  async ({ adminCategoriesPage, page }) => {
    const dialog = adminCategoriesPage.deleteDialog;
    const temp = await createCategory(api, {
      en: uniqueName("Source"),
      vi: "Nguồn"
    });
    const target = await createCategory(api, {
      en: uniqueName("Target"),
      vi: "Đích"
    });
    await setAppCategories(api, "team-calendar", [temp._id]);
    await adminCategoriesPage.goto();
    await adminCategoriesPage.openDelete(temp.name.en);
    await dialog.pick(dialog.bulkSelect(), target.name.en);
    await removeCategory(api, target._id);

    await dialog.confirmButton().click();
    await expect(dialog.confirmButton()).toBeDisabled();
    await dialog.bulkSelect().click();
    await expect(dialog.optionsNamed(target.name.en)).toHaveCount(0);
    await page.keyboard.press("Escape");
    await expect(dialog.root()).toBeVisible();
  }
);

test(
  "Dialog state does not leak to the next category's dialog",
  { tag: "@TC-ADMINCATEGORIES-031" },
  async ({ adminCategoriesPage }) => {
    const dialog = adminCategoriesPage.deleteDialog;
    const a = await createCategory(api, { en: uniqueName("LeakA"), vi: "A" });
    const b = await createCategory(api, { en: uniqueName("LeakB"), vi: "B" });
    await setAppCategories(api, "team-calendar", [a._id]);
    await setAppCategories(api, "notes", [b._id]);

    await adminCategoriesPage.goto();
    await adminCategoriesPage.openDelete(a.name.en);
    await dialog.pick(dialog.bulkSelect(), "Content");
    await dialog.cancelButton().click();

    await adminCategoriesPage.openDelete(b.name.en);
    await expect(dialog.bulkSelect()).toHaveText(d.choose);
    await expect(dialog.confirmButton()).toBeDisabled();
  }
);

test(
  "Double-clicking delete sends one request",
  { tag: "@TC-ADMINCATEGORIES-032" },
  async ({ adminCategoriesPage, page }) => {
    const dialog = adminCategoriesPage.deleteDialog;
    const temp = await createCategory(api, {
      en: uniqueName("Twice"),
      vi: "Hai lần"
    });
    let deletes = 0;
    page.on("request", (r) => {
      if (isDeleteCategoryRequest(r)) deletes += 1;
    });
    await adminCategoriesPage.goto();
    await adminCategoriesPage.openDelete(temp.name.en);
    await dialog.confirmButton().dblclick();
    await expect(dialog.root()).toBeHidden();
    expect(deletes).toBe(1);
  }
);

test(
  "Loading shows a skeleton; a failed impact offers retry and no delete",
  { tag: "@TC-ADMINCATEGORIES-033" },
  async ({ adminCategoriesPage, page }) => {
    const dialog = adminCategoriesPage.deleteDialog;
    const temp = await createCategory(api, {
      en: uniqueName("Slow"),
      vi: "Chậm"
    });
    let fail = true;
    await page.route(DELETE_IMPACT_ROUTE, async (route) => {
      // Keeps the request pending long enough for the skeleton to be seen.
      await new Promise((resolve) => setTimeout(resolve, 600));
      if (fail) return route.fulfill({ status: 500, body: "{}" });
      return route.continue();
    });
    await adminCategoriesPage.goto();
    await adminCategoriesPage.openDelete(temp.name.en);
    await expect(dialog.skeleton()).toBeVisible();
    await expect(dialog.text(d.loadError)).toBeVisible();
    await expect(dialog.confirmButton()).toBeDisabled();
    fail = false;
    await dialog.retryButton().click();
    await expect(dialog.text(d.noApps)).toBeVisible();
  }
);

test(
  "The last category that still has apps cannot be deleted",
  { tag: "@TC-ADMINCATEGORIES-034" },
  async ({ adminCategoriesPage, page }) => {
    const dialog = adminCategoriesPage.deleteDialog;
    const temp = await createCategory(api, {
      en: uniqueName("Last"),
      vi: "Cuối"
    });
    await page.route(CATEGORIES_ROUTE, async (route) => {
      if (route.request().method() !== "GET") return route.continue();
      const res = await route.fetch();
      const body = await res.json();
      body.data = body.data.filter((c: { _id: string }) => c._id === temp._id);
      return route.fulfill({ response: res, json: body });
    });
    await page.route(DELETE_IMPACT_ROUTE, (route) =>
      route.fulfill({
        json: {
          data: {
            total: 1,
            orphaned: [{ _id: "x", displayName: "IDMS Portal" }]
          }
        }
      })
    );
    await adminCategoriesPage.goto();
    await adminCategoriesPage.openDelete(temp.name.en);
    await expect(
      dialog.text(fill(d.blockedTitle, { name: temp.name.en }))
    ).toBeVisible();
    await expect(dialog.confirmButton()).toHaveCount(0);
    await dialog.understoodButton().click();
    await expect(dialog.root()).toBeHidden();
  }
);

test(
  "The delete dialog renders in Vietnamese",
  { tag: "@TC-ADMINCATEGORIES-035" },
  async ({ page }) => {
    const viPage = new AdminCategoriesPage(page, copyVi, "/vi");
    const dialog = viPage.deleteDialog;
    const temp = await createCategory(api, {
      en: uniqueName("Vi"),
      vi: "Tiếng Việt"
    });
    await setAppCategories(api, "team-calendar", [temp._id]);
    await viPage.goto();
    await viPage.openDelete("Tiếng Việt");
    await dialog.pick(dialog.bulkSelect(), "Nội dung");
    await expect(
      dialog.text(fill(dVi.progress, { done: 1, total: 1 }))
    ).toBeVisible();
    await dialog.rowSelect("Team Calendar").click();
    await expect(
      dialog.optionsNamed(fill(dVi.shared, { name: "Nội dung" }))
    ).toBeVisible();
    await page.keyboard.press("Escape");
  }
);
