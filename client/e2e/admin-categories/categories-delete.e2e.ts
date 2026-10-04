import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import { CategoryApi, CATEGORIES_API, uniqueName } from "../helpers/categories";

// Feature `category-management` — delete with reassignment (DR-5, DR-5b, DR-18).
// Matrix rows: 5, 6 (orphans 0/1/N), 10 (skeleton, impact error), 11 (DT on
// delete outcomes, ST on shared/override, 409 impact changed, target deleted
// meanwhile, last category, state reset, double submit), 9.
//
// Borrows seeded apps (team-calendar is inactive, so moving it does not show
// on /apps for other specs) and restores every app's categoryIds in afterAll.

test.describe.configure({ mode: "serial" });

let api: CategoryApi;
let snapshot: Map<string, string[]>;
let ids: Record<"content" | "identity" | "productivity", string>;

const BORROWED = ["team-calendar", "notes", "ops-console"] as const;
const openDelete = async (page: Page, name: string) => {
  await page.goto("/admin/categories");
  await page.getByRole("button", { name: `Delete ${name}` }).click();
  return page.getByRole("dialog");
};
const pick = async (page: Page, comboName: string | RegExp, option: string) => {
  await page.getByRole("combobox", { name: comboName }).click();
  await page.getByRole("option", { name: option, exact: true }).click();
};
const confirmButton = (page: Page) =>
  page.getByRole("button", { name: "Delete category" });

test.beforeAll(async () => {
  api = await CategoryApi.login();
  snapshot = await api.snapshotApps();
  ids = {
    content: (await api.bySlug("content"))._id,
    identity: (await api.bySlug("identity"))._id,
    productivity: (await api.bySlug("productivity"))._id
  };
});

test.afterAll(async () => {
  await api.restoreApps(snapshot);
  await api.removeAllE2E(ids.content);
  await api.dispose();
});

test("no app uses it → plain confirmation, then the row is gone [row 5, 6 orphans=0]", async ({
  page
}) => {
  const temp = await api.create({ en: uniqueName("Empty"), vi: "Trống" });
  const dialog = await openDelete(page, temp.name.en);
  await expect(dialog.getByText("No app uses this category.")).toBeVisible();
  await confirmButton(page).click();
  await expect(dialog).toBeHidden();
  await expect(
    page.getByRole("row").filter({ hasText: temp.name.en })
  ).toHaveCount(0);
});

test("apps that keep another category only lose this one [row 11 DT (0, >0)]", async ({
  page
}) => {
  const temp = await api.create({ en: uniqueName("Shared"), vi: "Dùng chung" });
  await api.setAppCategories("notes", [ids.productivity, temp._id]);
  const dialog = await openDelete(page, temp.name.en);
  await expect(dialog.getByText("1 app uses this category.")).toBeVisible();
  await expect(dialog.getByText(/only loses this one/)).toBeVisible();
  await confirmButton(page).click();
  await expect(dialog).toBeHidden();
  expect((await api.app("notes")).categoryIds).toEqual([ids.productivity]);
});

test("orphans: shared target + one override, override survives a shared change [row 11 DT + ST]", async ({
  page
}) => {
  const temp = await api.create({ en: uniqueName("Orphans"), vi: "Mồ côi" });
  for (const app of BORROWED) await api.setAppCategories(app, [temp._id]);

  const dialog = await openDelete(page, temp.name.en);
  await expect(
    dialog.getByText(/3 apps only belong to this category/)
  ).toBeVisible();
  await expect(dialog.getByText("0/3 have a target")).toBeVisible();
  await expect(confirmButton(page)).toBeDisabled();

  // Override Notes first, then pick the shared target.
  await pick(page, "New category for Notes", "Identity");
  await expect(
    dialog.getByText("Set individually", { exact: true })
  ).toHaveCount(1);
  await expect(dialog.getByText("1/3 have a target")).toBeVisible();
  await pick(page, "Move all to", "Content");
  await expect(dialog.getByText("3/3 have a target")).toBeVisible();
  await expect(
    page.getByRole("combobox", { name: "New category for Notes" })
  ).toHaveText("Identity");

  // Changing the shared target leaves the override alone…
  await pick(page, "Move all to", "Productivity");
  await expect(
    page.getByRole("combobox", { name: "New category for Notes" })
  ).toHaveText("Identity");
  // …and resetting a row to "(shared)" makes it follow again.
  await pick(page, "New category for Operations Console", "Identity");
  await pick(
    page,
    "New category for Operations Console",
    "Productivity (shared)"
  );
  await expect(
    dialog.getByText("Set individually", { exact: true })
  ).toHaveCount(1);

  await expect(confirmButton(page)).toBeEnabled();
  await confirmButton(page).click();
  await expect(dialog).toBeHidden();

  expect((await api.app("team-calendar")).categoryIds).toEqual([
    ids.productivity
  ]);
  expect((await api.app("ops-console")).categoryIds).toEqual([
    ids.productivity
  ]);
  expect((await api.app("notes")).categoryIds).toEqual([ids.identity]);
});

test("orphans set only per app, each to a different target [row 11 DT]", async ({
  page
}) => {
  const temp = await api.create({ en: uniqueName("PerApp"), vi: "Từng app" });
  await api.setAppCategories("team-calendar", [temp._id]);
  await api.setAppCategories("notes", [temp._id]);
  await openDelete(page, temp.name.en);
  await pick(page, "New category for Team Calendar", "Content");
  await expect(confirmButton(page)).toBeDisabled();
  await expect(
    page.getByText("1 app still needs a new category.")
  ).toBeVisible();
  await pick(page, "New category for Notes", "Identity");
  await confirmButton(page).click();
  await expect(page.getByRole("dialog")).toBeHidden();
  expect((await api.app("team-calendar")).categoryIds).toEqual([ids.content]);
  expect((await api.app("notes")).categoryIds).toEqual([ids.identity]);
});

test("an app orphaned after the dialog opened → 409, list reloads, choices kept [row 11 ST invalid]", async ({
  page
}) => {
  const temp = await api.create({ en: uniqueName("Changed"), vi: "Đã đổi" });
  await api.setAppCategories("team-calendar", [temp._id]);
  const dialog = await openDelete(page, temp.name.en);
  await pick(page, "New category for Team Calendar", "Identity");

  await api.setAppCategories("notes", [temp._id]);
  await confirmButton(page).click();

  await expect(dialog.getByText("Notes", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("combobox", { name: "New category for Team Calendar" })
  ).toHaveText("Identity");
  await expect(confirmButton(page)).toBeDisabled();
  await pick(page, "New category for Notes", "Content");
  await confirmButton(page).click();
  await expect(dialog).toBeHidden();
  expect((await api.app("notes")).categoryIds).toEqual([ids.content]);
});

test("a target deleted in another tab is dropped from the dialog [row 11 DR-18]", async ({
  page
}) => {
  const temp = await api.create({ en: uniqueName("Source"), vi: "Nguồn" });
  const target = await api.create({ en: uniqueName("Target"), vi: "Đích" });
  await api.setAppCategories("team-calendar", [temp._id]);
  const dialog = await openDelete(page, temp.name.en);
  await pick(page, "Move all to", target.name.en);
  await api.remove(target._id);

  await confirmButton(page).click();
  await expect(confirmButton(page)).toBeDisabled();
  await page.getByRole("combobox", { name: "Move all to" }).click();
  await expect(page.getByRole("option", { name: target.name.en })).toHaveCount(
    0
  );
  await page.keyboard.press("Escape");
  await expect(dialog).toBeVisible();
});

test("state does not leak from one category's dialog to another's [row 11]", async ({
  page
}) => {
  const a = await api.create({ en: uniqueName("LeakA"), vi: "A" });
  const b = await api.create({ en: uniqueName("LeakB"), vi: "B" });
  await api.setAppCategories("team-calendar", [a._id]);
  await api.setAppCategories("notes", [b._id]);

  await openDelete(page, a.name.en);
  await pick(page, "Move all to", "Content");
  await page.getByRole("button", { name: "Cancel" }).click();

  await page.getByRole("button", { name: `Delete ${b.name.en}` }).click();
  await expect(page.getByRole("combobox", { name: "Move all to" })).toHaveText(
    "Choose a category…"
  );
  await expect(confirmButton(page)).toBeDisabled();
});

test("double-clicking delete sends one request [row 11]", async ({ page }) => {
  const temp = await api.create({ en: uniqueName("Twice"), vi: "Hai lần" });
  let deletes = 0;
  page.on("request", (r) => {
    if (r.method() === "DELETE" && r.url().includes(CATEGORIES_API))
      deletes += 1;
  });
  await openDelete(page, temp.name.en);
  await confirmButton(page).dblclick();
  await expect(page.getByRole("dialog")).toBeHidden();
  expect(deletes).toBe(1);
});

test("loading shows a skeleton; a failed impact shows retry and no delete [row 10]", async ({
  page
}) => {
  const temp = await api.create({ en: uniqueName("Slow"), vi: "Chậm" });
  let fail = true;
  await page.route("**/delete-impact", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 600));
    if (fail) return route.fulfill({ status: 500, body: "{}" });
    return route.continue();
  });
  const dialog = await openDelete(page, temp.name.en);
  await expect(dialog.locator('[aria-busy="true"]')).toBeVisible();
  await expect(
    dialog.getByText("Couldn't load the apps in this category.")
  ).toBeVisible();
  await expect(confirmButton(page)).toBeDisabled();
  fail = false;
  await dialog.getByRole("button", { name: "Try again" }).click();
  await expect(dialog.getByText("No app uses this category.")).toBeVisible();
});

test("the last category with orphans cannot be deleted [row 11 mock 3d]", async ({
  page
}) => {
  const temp = await api.create({ en: uniqueName("Last"), vi: "Cuối" });
  await page.route(`**${CATEGORIES_API}`, async (route) => {
    if (route.request().method() !== "GET") return route.continue();
    const res = await route.fetch();
    const body = await res.json();
    body.data = body.data.filter((c: { _id: string }) => c._id === temp._id);
    return route.fulfill({ response: res, json: body });
  });
  await page.route("**/delete-impact", (route) =>
    route.fulfill({
      json: {
        data: { total: 1, orphaned: [{ _id: "x", displayName: "IDMS Portal" }] }
      }
    })
  );
  const dialog = await openDelete(page, temp.name.en);
  await expect(
    dialog.getByText(`Can't delete "${temp.name.en}"`)
  ).toBeVisible();
  await expect(confirmButton(page)).toHaveCount(0);
  await dialog.getByRole("button", { name: "Got it" }).click();
  await expect(dialog).toBeHidden();
});

test("Vietnamese dialog labels [row 9]", async ({ page }) => {
  const temp = await api.create({ en: uniqueName("Vi"), vi: "Tiếng Việt" });
  await api.setAppCategories("team-calendar", [temp._id]);
  await page.goto("/vi/admin/categories");
  await page.getByRole("button", { name: "Xoá Tiếng Việt" }).click();
  await pick(page, "Chuyển tất cả sang", "Nội dung");
  await expect(
    page.getByRole("dialog").getByText("1/1 đã có đích")
  ).toBeVisible();
  await page
    .getByRole("combobox", { name: "Danh mục mới cho Team Calendar" })
    .click();
  await expect(
    page.getByRole("option", { name: "Nội dung (chung)" })
  ).toBeVisible();
  await page.keyboard.press("Escape");
});
