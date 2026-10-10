import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import { SEED_CATEGORIES } from "../helpers/categories";

// Feature `category-management` — /admin/categories list (read-only).
// Matrix rows: 1 (list), 5 (empty), 8 (rendering), 9 (i18n), 12 (a11y labels).
// Nothing here mutates data.

const rowFor = (page: Page, name: string) =>
  page.getByRole("row").filter({ hasText: name });

test.describe("Admin categories — list", () => {
  test("lists the seeded categories in order with slug and app count [row 1, 8]", async ({
    page
  }) => {
    await page.goto("/admin/categories");
    await expect(
      page.getByRole("heading", { name: "Categories" })
    ).toBeVisible();

    const rows = page.getByRole("row").filter({ has: page.locator("td") });
    await expect(rows).toHaveCount(SEED_CATEGORIES.length);
    for (const [index, seed] of SEED_CATEGORIES.entries()) {
      const row = rows.nth(index);
      await expect(row).toContainText(seed.en);
      await expect(row).toContainText(seed.vi);
      await expect(row.getByText(seed.slug, { exact: true })).toBeVisible();
      await expect(
        row.getByRole("cell", { name: String(seed.apps), exact: true })
      ).toBeVisible();
    }
  });

  test("first row cannot move up and last row cannot move down [row 6 BVA]", async ({
    page
  }) => {
    await page.goto("/admin/categories");
    const first = SEED_CATEGORIES[0].en;
    const last = SEED_CATEGORIES[SEED_CATEGORIES.length - 1].en;
    await expect(
      page.getByRole("button", { name: `Move ${first} up` })
    ).toBeDisabled();
    await expect(
      page.getByRole("button", { name: `Move ${first} down` })
    ).toBeEnabled();
    await expect(
      page.getByRole("button", { name: `Move ${last} down` })
    ).toBeDisabled();
    await expect(
      page.getByRole("button", { name: `Move ${last} up` })
    ).toBeEnabled();
  });

  test("every icon button is named after its category [row 12]", async ({
    page
  }) => {
    await page.goto("/admin/categories");
    const row = rowFor(page, "Identity");
    for (const label of [
      "Move Identity up",
      "Move Identity down",
      "Edit Identity",
      "Delete Identity"
    ]) {
      await expect(row.getByRole("button", { name: label })).toBeVisible();
    }
  });

  test("Vietnamese locale shows the vi name first and the en name second [row 9]", async ({
    page
  }) => {
    await page.goto("/vi/admin/categories");
    await expect(page.getByRole("heading", { name: "Danh mục" })).toBeVisible();
    const row = rowFor(page, "Công cụ nội bộ");
    const cellText = await row.getByRole("cell").nth(1).innerText();
    expect(cellText.indexOf("Công cụ nội bộ")).toBeLessThan(
      cellText.indexOf("Internal Tools")
    );
    await expect(
      row.getByRole("button", { name: "Chuyển Công cụ nội bộ lên" })
    ).toBeVisible();
  });

  test("the admin sidebar links to the page [row 1]", async ({ page }) => {
    await page.goto("/admin/apps");
    await page.getByRole("link", { name: "Categories" }).click();
    await expect(page).toHaveURL(/\/admin\/categories$/);
  });

  test("an empty list shows the empty state with a create action [row 5]", async ({
    page
  }) => {
    await page.route("**/api/v1/admin/categories", (route) =>
      route.request().method() === "GET"
        ? route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              timestamp: new Date().toISOString(),
              path: "/api/v1/admin/categories",
              message: "ok",
              data: []
            })
          })
        : route.continue()
    );
    await page.goto("/admin/categories");
    await expect(page.getByText("No categories yet")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "New category" }).last()
    ).toBeVisible();
  });
});
