import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import {
  CategoryApi,
  CATEGORIES_API,
  SEED_CATEGORIES,
  uniqueName
} from "../helpers/categories";

// Feature `category-management` — create / edit through the sheet.
// Matrix rows: 1, 4 (EP / BVA / DT on the form), 9, 10 (500), 11 (double
// submit, edit after delete elsewhere). Every category created here is named
// "E2E …" and deleted in afterAll.

test.describe.configure({ mode: "serial" });

let api: CategoryApi;
let contentId: string;

const openCreate = async (page: Page) => {
  await page.goto("/admin/categories");
  await page.getByRole("button", { name: "New category" }).first().click();
  await expect(page.getByRole("dialog")).toBeVisible();
};
const enField = (page: Page) =>
  page.getByRole("textbox", { name: "Name (English)" });
const viField = (page: Page) =>
  page.getByRole("textbox", { name: "Name (Vietnamese)" });
const slugBox = (page: Page) =>
  page.getByRole("dialog").locator('[aria-labelledby="category-slug-label"]');

test.beforeAll(async () => {
  api = await CategoryApi.login();
  contentId = (await api.bySlug("content"))._id;
});

test.afterAll(async () => {
  await api.removeAllE2E(contentId);
  await api.dispose();
});

test.describe("Admin categories — create", () => {
  test("creates a category last in the list with a slug from name.en [row 1]", async ({
    page
  }) => {
    const en = uniqueName("Finance");
    await openCreate(page);
    await enField(page).fill(en);
    await viField(page).fill("Tài chính");
    const expectedSlug = en.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    await expect(slugBox(page)).toHaveText(expectedSlug);
    await page.getByRole("button", { name: "Create", exact: true }).click();

    await expect(page.getByRole("dialog")).toBeHidden();
    const rows = page.getByRole("row").filter({ has: page.locator("td") });
    await expect(rows.last()).toContainText(en);
    await expect(rows.last()).toContainText(expectedSlug);
  });

  test("[EP] both names empty → both fields report, no request sent [row 4 DT]", async ({
    page
  }) => {
    let posted = false;
    page.on("request", (r) => {
      if (r.method() === "POST" && r.url().endsWith(CATEGORIES_API))
        posted = true;
    });
    await openCreate(page);
    await page.getByRole("button", { name: "Create", exact: true }).click();
    await expect(page.getByText("Enter an English name.")).toBeVisible();
    await expect(page.getByText("Enter a Vietnamese name.")).toBeVisible();
    expect(posted).toBe(false);
  });

  test("[EP] whitespace-only and zero-width-only names count as empty [row 4]", async ({
    page
  }) => {
    await openCreate(page);
    await enField(page).fill("   ");
    await viField(page).fill("​ ");
    await page.getByRole("button", { name: "Create", exact: true }).click();
    await expect(page.getByText("Enter an English name.")).toBeVisible();
    await expect(page.getByText("Enter a Vietnamese name.")).toBeVisible();
  });

  test("[EP] an English name with no letter or digit is rejected [row 4]", async ({
    page
  }) => {
    await openCreate(page);
    await enField(page).fill("🚀 !!!");
    await viField(page).fill("Tên lửa");
    await page.getByRole("button", { name: "Create", exact: true }).click();
    await expect(
      page.getByText("The English name needs at least one letter or digit.")
    ).toBeVisible();
  });

  test("[BVA] 100 characters is accepted, 101 is rejected [row 4]", async ({
    page
  }) => {
    await openCreate(page);
    await enField(page).fill("a".repeat(101));
    await viField(page).fill("b");
    await page.getByRole("button", { name: "Create", exact: true }).click();
    await expect(
      page.getByText("The English name must not exceed 100 characters.")
    ).toBeVisible();

    const hundred = `E2E ${"x".repeat(96)}`;
    expect(hundred).toHaveLength(100);
    await enField(page).fill(hundred);
    await page.getByRole("button", { name: "Create", exact: true }).click();
    await expect(page.getByRole("dialog")).toBeHidden();
  });

  test("[DT] duplicate name.en in another case → 409 on the English field [row 4]", async ({
    page
  }) => {
    await openCreate(page);
    await enField(page).fill("  CONTENT  ");
    await viField(page).fill("Bản sao");
    await page.getByRole("button", { name: "Create", exact: true }).click();
    await expect(
      page
        .getByText("A category with this English name already exists.")
        .first()
    ).toBeVisible();
    await expect(page.getByRole("dialog")).toBeVisible();
  });

  test("[DT] duplicate en + empty vi → client error first, no request [row 4]", async ({
    page
  }) => {
    let posted = false;
    page.on("request", (r) => {
      if (r.method() === "POST" && r.url().endsWith(CATEGORIES_API))
        posted = true;
    });
    await openCreate(page);
    await enField(page).fill("Content");
    await page.getByRole("button", { name: "Create", exact: true }).click();
    await expect(page.getByText("Enter a Vietnamese name.")).toBeVisible();
    expect(posted).toBe(false);
  });

  test("Vietnamese slug preview folds đ and accents [row 4, 9]", async ({
    page
  }) => {
    await page.goto("/vi/admin/categories");
    await page.getByRole("button", { name: "Tạo danh mục" }).first().click();
    await page
      .getByRole("textbox", { name: "Tên (English)" })
      .fill("Đa dạng Phân Tích");
    await expect(slugBox(page)).toHaveText("da-dang-phan-tich");
  });

  test("a 500 keeps the sheet open with the typed values [row 10]", async ({
    page
  }) => {
    await page.route(`**${CATEGORIES_API}`, (route) =>
      route.request().method() === "POST"
        ? route.fulfill({ status: 500, body: "{}" })
        : route.continue()
    );
    await openCreate(page);
    await enField(page).fill("E2E Server Down");
    await viField(page).fill("Lỗi");
    await page.getByRole("button", { name: "Create", exact: true }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(enField(page)).toHaveValue("E2E Server Down");
  });

  test("double-clicking Create makes one category [row 11]", async ({
    page
  }) => {
    const en = uniqueName("Double");
    let posts = 0;
    page.on("request", (r) => {
      if (r.method() === "POST" && r.url().endsWith(CATEGORIES_API)) posts += 1;
    });
    await openCreate(page);
    await enField(page).fill(en);
    await viField(page).fill("Đôi");
    await page.getByRole("button", { name: "Create", exact: true }).dblclick();
    await expect(page.getByRole("dialog")).toBeHidden();
    expect(posts).toBe(1);
    expect((await api.list()).filter((c) => c.name.en === en)).toHaveLength(1);
  });
});

test.describe("Admin categories — edit", () => {
  test("renaming name.en moves the slug; renaming only vi keeps it [row 1, 4]", async ({
    page
  }) => {
    const created = await api.create({
      en: uniqueName("Rename"),
      vi: "Đổi tên"
    });
    await page.goto("/admin/categories");
    await page.getByRole("button", { name: `Edit ${created.name.en}` }).click();

    await viField(page).fill("Chỉ đổi tiếng Việt");
    await expect(slugBox(page)).not.toContainText("→");
    await enField(page).fill(`${created.name.en} Two`);
    await expect(slugBox(page).locator(".line-through")).toHaveText(
      created.slug
    );
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page.getByRole("dialog")).toBeHidden();

    const after = (await api.list()).find((c) => c._id === created._id);
    expect(after?.slug).toBe(`${created.slug}-two`);
    expect(after?.name.vi).toBe("Chỉ đổi tiếng Việt");
  });

  test("renaming onto a taken slug shows the server's suffixed slug [row 4]", async ({
    page
  }) => {
    const created = await api.create({
      en: uniqueName("Slugclash"),
      vi: "Trùng"
    });
    await page.goto("/admin/categories");
    await page.getByRole("button", { name: `Edit ${created.name.en}` }).click();
    await enField(page).fill("Identity!");
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page.getByRole("dialog")).toBeHidden();
    const row = page.getByRole("row").filter({ hasText: "identity-2" });
    await expect(row).toBeVisible();

    // Back to its own name: its old slug is free again, no suffix.
    await row.getByRole("button", { name: "Edit Identity!" }).click();
    await enField(page).fill(created.name.en);
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(
      page.getByRole("row").filter({ hasText: created.slug })
    ).toBeVisible();
  });

  test("editing a category deleted in another tab closes the sheet and drops the row [row 11 ST]", async ({
    page
  }) => {
    const created = await api.create({ en: uniqueName("Gone"), vi: "Đã xoá" });
    await page.goto("/admin/categories");
    await page.getByRole("button", { name: `Edit ${created.name.en}` }).click();
    await api.remove(created._id);
    await viField(page).fill("Muộn");
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page.getByRole("dialog")).toBeHidden();
    await expect(
      page.getByRole("row").filter({ hasText: created.name.en })
    ).toHaveCount(0);
  });

  test("the seeded list is untouched by this file's renames", async () => {
    const names = (await api.list()).map((c) => c.name.en);
    for (const seed of SEED_CATEGORIES) expect(names).toContain(seed.en);
  });
});
