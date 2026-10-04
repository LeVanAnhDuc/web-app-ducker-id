import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import { CategoryApi, uniqueName } from "../helpers/categories";

// Feature `category-management` — picking 1–5 categories for an app, quick
// create, and how the chips render for users. Runs as admin (who sees the full
// active catalog on /apps). Matrix rows: 1, 4, 6, 7, 8, 9, 11, cache.
// Blog / Notes / IDMS Portal are borrowed and restored in afterAll.

test.describe.configure({ mode: "serial" });

let api: CategoryApi;
let snapshot: Map<string, string[]>;
let ids: Record<"content" | "tools" | "identity" | "productivity", string>;

const openEditBlog = async (page: Page) => {
  await page.goto("/admin/apps");
  await page
    .getByRole("row", { name: /Blog/ })
    .getByRole("button", { name: "App actions" })
    .click();
  await page.getByRole("menuitem", { name: "Edit" }).click();
  await expect(
    page.getByRole("textbox", { name: "Display Name" })
  ).toBeVisible();
};
const picker = (page: Page) =>
  page.getByRole("combobox", { name: /^Categories:/ });
const chipList = (page: Page) =>
  page.getByRole("dialog").getByRole("list", { name: "Categories" });
const save = async (page: Page) => {
  await page.getByRole("button", { name: "Save Changes" }).click();
  await expect(page.getByText("App updated.")).toBeVisible();
};

test.beforeAll(async () => {
  api = await CategoryApi.login();
  snapshot = await api.snapshotApps();
  ids = {
    content: (await api.bySlug("content"))._id,
    tools: (await api.bySlug("internal-tools"))._id,
    identity: (await api.bySlug("identity"))._id,
    productivity: (await api.bySlug("productivity"))._id
  };
});

test.afterAll(async () => {
  await api.restoreApps(snapshot);
  await api.removeAllE2E(ids.content);
  await api.dispose();
});

test("adding a second category keeps the first as primary, in order everywhere [row 1, 8]", async ({
  page
}) => {
  await openEditBlog(page);
  await picker(page).click();
  await page.getByRole("option", { name: "Identity" }).click();
  await page.keyboard.press("Escape");
  await expect(chipList(page)).toContainText(/Content.*Primary.*Identity/);
  await save(page);

  expect((await api.app("blog")).categoryIds).toEqual([
    ids.content,
    ids.identity
  ]);

  await page.goto("/apps");
  const chips = page
    .locator("[aria-labelledby^='apps-'][aria-labelledby$='-title']")
    .filter({ hasText: "Blog" })
    .getByRole("list", { name: "Categories" });
  await expect(chips.getByRole("listitem")).toHaveText(["Content", "Identity"]);
});

test("removing the primary promotes the next one, and the order survives a reopen [row 11]", async ({
  page
}) => {
  await openEditBlog(page);
  await page.getByRole("button", { name: "Remove Content" }).click();
  await expect(chipList(page)).toContainText(/Identity.*Primary/);
  await save(page);
  await openEditBlog(page);
  await expect(chipList(page)).toContainText(/Identity.*Primary/);
  // Editing another field leaves the categories alone.
  await page.getByRole("textbox", { name: "Display Name" }).fill("Blog");
  await save(page);
  expect((await api.app("blog")).categoryIds).toEqual([ids.identity]);
});

test("untick then re-tick moves a category to the end [row 11]", async ({
  page
}) => {
  await api.setAppCategories("blog", [ids.content, ids.identity]);
  await openEditBlog(page);
  await picker(page).click();
  await page.getByRole("option", { name: /Content/ }).click();
  await page.getByRole("option", { name: /Content/ }).click();
  await page.keyboard.press("Escape");
  await expect(chipList(page)).toContainText(/Identity.*Primary.*Content/);
});

test("[BVA] 0 is rejected, 5 locks the rest and quick create [row 4, 6]", async ({
  page
}) => {
  await api.create({ en: uniqueName("Fifth"), vi: "Năm" });
  await api.create({ en: uniqueName("Sixth"), vi: "Sáu" });
  await api.setAppCategories("blog", [ids.content]);
  await openEditBlog(page);

  await page.getByRole("button", { name: "Remove Content" }).click();
  await page.getByRole("button", { name: "Save Changes" }).click();
  await expect(page.getByText("Select at least one category.")).toBeVisible();

  await picker(page).click();
  const options = page.getByRole("option");
  for (let i = 0; i < 5; i += 1) await options.nth(i).click();
  await expect(
    page.getByText("At most 5 categories. Remove one to choose another.")
  ).toBeVisible();
  await expect(options.nth(5)).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Create category" })
  ).toBeDisabled();
});

test("search is accent-insensitive; an exact match offers no create [row 7, DR-17]", async ({
  page
}) => {
  await openEditBlog(page);
  await picker(page).click();
  const search = page.getByRole("textbox", { name: "Search categories…" });
  await search.fill("nang suat");
  await expect(
    page.getByRole("option", { name: /Productivity/ })
  ).toBeVisible();
  // "nang suat" folds to the same key as "Năng suất" — an exact match, no create.
  await expect(
    page.getByRole("button", { name: /Create category/ })
  ).toHaveCount(0);
  await search.fill("prod");
  await expect(
    page.getByRole("option", { name: /Productivity/ })
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: 'Create category "prod"' })
  ).toBeVisible();
  await search.fill("content");
  await expect(page.getByRole("option", { name: /Content/ })).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Create category/ })
  ).toHaveCount(0);
});

test("quick create from the picker selects the new category; cancel keeps the form [row 1, 6]", async ({
  page
}) => {
  await api.setAppCategories("blog", [ids.content]);
  const en = uniqueName("Quick");
  await openEditBlog(page);

  await picker(page).click();
  await page.getByRole("textbox", { name: "Search categories…" }).fill(en);
  await page.getByRole("button", { name: `Create category "${en}"` }).click();
  await expect(
    page.getByRole("textbox", { name: "Name (English)" })
  ).toHaveValue(en);
  await page.getByRole("button", { name: "Cancel" }).last().click();
  await expect(page.getByRole("textbox", { name: "Display Name" })).toHaveValue(
    "Blog"
  );

  await picker(page).click();
  await page.getByRole("textbox", { name: "Search categories…" }).fill(en);
  await page.getByRole("button", { name: `Create category "${en}"` }).click();
  await page.getByRole("textbox", { name: "Name (Vietnamese)" }).fill("Nhanh");
  await page.getByRole("button", { name: "Create and select" }).click();
  await expect(chipList(page)).toContainText(en);
  await save(page);

  const created = (await api.list()).find((c) => c.name.en === en);
  expect((await api.app("blog")).categoryIds).toEqual([
    ids.content,
    created?._id
  ]);
});

test("filtering /apps matches a category in any position; reload keeps it [row 7 EP]", async ({
  page
}) => {
  await api.setAppCategories("blog", [ids.content, ids.identity]);
  await page.goto(`/apps?categoryId=${ids.identity}`);
  await expect(page.getByText("Blog", { exact: true })).toBeVisible(); // secondary
  await expect(page.getByText("IDMS Portal", { exact: true })).toBeVisible(); // primary
  await expect(page.getByText("Notes", { exact: true })).toHaveCount(0); // none
  await page.reload();
  await expect(page).toHaveURL(new RegExp(`categoryId=${ids.identity}`));
  await expect(page.getByText("Blog", { exact: true })).toBeVisible();
});

test("a filter on a deleted category shows the empty state, not an error [row 7]", async ({
  page
}) => {
  const temp = await api.create({ en: uniqueName("Vanish"), vi: "Biến mất" });
  await api.remove(temp._id);
  for (const path of ["/apps", "/admin/apps"]) {
    await page.goto(`${path}?categoryId=${temp._id}`);
    await expect(page.getByRole("alert")).toHaveCount(0);
    await expect(page.getByText("Blog", { exact: true })).toHaveCount(0);
  }
});

test("a Vietnamese name that exists in no locale file shows on /vi/apps [row 9]", async ({
  page
}) => {
  const temp = await api.create({
    en: uniqueName("Lang"),
    vi: "Thử nghiệm ngôn ngữ"
  });
  await api.setAppCategories("blog", [temp._id, ids.content]);
  await page.goto("/vi/apps");
  await expect(page.getByText("Thử nghiệm ngôn ngữ").first()).toBeVisible();
  await expect(page.getByText(temp.name.en)).toHaveCount(0);
});

test.describe("narrow card columns", () => {
  // Chips collapse by CONTAINER width, not viewport: a three-column grid at
  // 1024px leaves each card too narrow, while a phone's single column is wide.
  test.use({ viewport: { width: 1024, height: 800 }, hasTouch: true });

  test('a narrow card shows the primary + "+N"; tapping it lists all and opens nothing [row 8, DR-20]', async ({
    page,
    context
  }) => {
    await api.setAppCategories("blog", [
      ids.content,
      ids.identity,
      ids.productivity
    ]);
    await page.goto("/apps");
    let opened = false;
    context.on("page", () => {
      opened = true;
    });
    const more = page
      .getByRole("button", { name: "Show 2 more categories" })
      .first();
    await more.tap();
    const popover = page.getByRole("dialog");
    await expect(popover.getByText("Productivity")).toBeVisible();
    expect(opened).toBe(false);
    await page.mouse.click(5, 5);
    await expect(popover).toBeHidden();
  });
});

test.describe("phone width", () => {
  test.use({ viewport: { width: 375, height: 800 } });

  test("100-character category names do not cause horizontal scroll [row 8]", async ({
    page
  }) => {
    const long = await api.create({ en: `E2E ${"L".repeat(96)}`, vi: "Dài" });
    await api.setAppCategories("blog", [long._id, ids.content]);
    await page.goto("/apps");
    await expect(page.getByText("Blog", { exact: true })).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth
    );
    expect(overflow).toBe(false);
  });
});

test("new categories reach other pages without a reload [cache]", async ({
  page
}) => {
  const en = uniqueName("Fresh");
  await page.goto("/admin/categories");
  await page.getByRole("button", { name: "New category" }).first().click();
  await page.getByRole("textbox", { name: "Name (English)" }).fill(en);
  await page.getByRole("textbox", { name: "Name (Vietnamese)" }).fill("Mới");
  await page.getByRole("button", { name: "Create", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeHidden();

  await page.getByRole("link", { name: "App Registry" }).first().click();
  await expect(page).toHaveURL(/\/admin\/apps/);
  await page
    .getByRole("row", { name: /Blog/ })
    .getByRole("button", { name: "App actions" })
    .click();
  await page.getByRole("menuitem", { name: "Edit" }).click();
  await picker(page).click();
  await expect(
    page.getByRole("option", { name: new RegExp(en) })
  ).toBeVisible();
});
