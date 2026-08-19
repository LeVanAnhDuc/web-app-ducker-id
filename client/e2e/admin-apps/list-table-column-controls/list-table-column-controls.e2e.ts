import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";

// Sort is CLIENT-SIDE + read-only (no DB write) → no revert needed.
// Requires ≥2 seeded apps to assert ordering (seed has blog/notes/… → OK).

const firstCellNames = (page: Page) =>
  page.locator("tbody tr td:first-child span.font-medium").allTextContents();

const isSortedAsc = (names: string[]) =>
  names.every(
    (n, i) => i === 0 || names[i - 1].toLowerCase() <= n.toLowerCase()
  );

const isSortedDesc = (names: string[]) =>
  names.every(
    (n, i) => i === 0 || names[i - 1].toLowerCase() >= n.toLowerCase()
  );

const appHeader = (page: Page) =>
  page
    .getByRole("columnheader")
    .filter({ has: page.getByRole("button", { name: "Sort by App" }) });

const updatedHeader = (page: Page) =>
  page.getByRole("columnheader").filter({
    has: page.getByRole("button", { name: "Sort by Last Updated" })
  });

const expectLoaded = async (page: Page) => {
  await expect(
    page.getByRole("heading", { name: "App Registry" })
  ).toBeVisible();
  await expect(page.locator("tbody tr").first()).toBeVisible();
};

test.describe("List Table Column Controls — AdminApps sort", () => {
  // ── #1 Happy path: asc then desc ──
  test("sorts by App ascending then descending", async ({ page }) => {
    await page.goto("/admin/apps");
    await expectLoaded(page);

    await page.getByRole("button", { name: "Sort by App" }).click();
    await expect(appHeader(page)).toHaveAttribute("aria-sort", "ascending");
    expect(isSortedAsc(await firstCellNames(page))).toBe(true);

    await page.getByRole("button", { name: "Sort by App" }).click();
    await expect(appHeader(page)).toHaveAttribute("aria-sort", "descending");
    expect(isSortedDesc(await firstCellNames(page))).toBe(true);
  });

  // ── #6a toggle 2-state + #6b switch column (invalid transition) + #12b single active ──
  test("toggle asc→desc→asc and switching columns moves the indicator", async ({
    page
  }) => {
    await page.goto("/admin/apps");
    await expectLoaded(page);

    await page.getByRole("button", { name: "Sort by App" }).click();
    await expect(appHeader(page)).toHaveAttribute("aria-sort", "ascending");
    await page.getByRole("button", { name: "Sort by App" }).click();
    await expect(appHeader(page)).toHaveAttribute("aria-sort", "descending");
    await page.getByRole("button", { name: "Sort by App" }).click();
    await expect(appHeader(page)).toHaveAttribute("aria-sort", "ascending");

    // switch to Last Updated → App resets to "none", Updated becomes ascending
    await page.getByRole("button", { name: "Sort by Last Updated" }).click();
    await expect(updatedHeader(page)).toHaveAttribute("aria-sort", "ascending");
    await expect(appHeader(page)).toHaveAttribute("aria-sort", "none");

    // #12b — only one column has a non-"none" aria-sort at a time
    const active = await page
      .locator('th[aria-sort="ascending"], th[aria-sort="descending"]')
      .count();
    expect(active).toBe(1);
  });

  // ── #7a URL persist + reload ──
  test("persists sort in the URL and survives reload", async ({ page }) => {
    await page.goto("/admin/apps");
    await expectLoaded(page);

    await page.getByRole("button", { name: "Sort by App" }).click();
    await expect(page).toHaveURL(/sortBy=app/);
    await expect(page).toHaveURL(/sortOrder=asc/);

    await page.reload();
    await expect(appHeader(page)).toHaveAttribute("aria-sort", "ascending");
  });

  // ── #7b deep-link pre-set sort on first load ──
  test("applies sort from a deep-linked URL on first load", async ({
    page
  }) => {
    await page.goto("/admin/apps?sortBy=app&sortOrder=desc");
    await expectLoaded(page);
    await expect(appHeader(page)).toHaveAttribute("aria-sort", "descending");
    expect(isSortedDesc(await firstCellNames(page))).toBe(true);
  });

  // ── #7c filter + sort combined ──
  test("sorts within an active status filter", async ({ page }) => {
    await page.goto("/admin/apps?status=active&sortBy=app&sortOrder=asc");
    await expectLoaded(page);
    await expect(appHeader(page)).toHaveAttribute("aria-sort", "ascending");
    expect(isSortedAsc(await firstCellNames(page))).toBe(true);
  });

  // ── #4a/#4b/#4c invalid sortBy / sortOrder → no crash, no reorder ──
  test("ignores a sortBy with no accessor without crashing", async ({
    page
  }) => {
    await page.goto("/admin/apps?sortBy=status");
    await expectLoaded(page);
    await expect(page.locator("tbody tr").first()).toBeVisible();
    // status column is not sortable → its header has no aria-sort
    await expect(
      page.getByRole("columnheader", { name: "Status" })
    ).not.toHaveAttribute("aria-sort");
  });

  test("ignores a garbage sortBy without crashing", async ({ page }) => {
    await page.goto("/admin/apps?sortBy=___bogus&sortOrder=asc");
    await expectLoaded(page);
    await expect(page.locator("tbody tr").first()).toBeVisible();
  });

  test("ignores an invalid sortOrder without crashing", async ({ page }) => {
    await page.goto("/admin/apps?sortBy=app&sortOrder=sideways");
    await expectLoaded(page);
    // invalid order → useListQuery yields undefined → column not marked sorted
    await expect(appHeader(page)).toHaveAttribute("aria-sort", "none");
  });

  // ── #12a a11y keyboard ──
  test("sort header is keyboard operable", async ({ page }) => {
    await page.goto("/admin/apps");
    await expectLoaded(page);
    const btn = page.getByRole("button", { name: "Sort by App" });
    await btn.focus();
    await expect(btn).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(appHeader(page)).toHaveAttribute("aria-sort", "ascending");
  });

  // ── R responsive hideBelow (BVA on breakpoints) ──
  test("hides breakpoint columns below their threshold", async ({ page }) => {
    await page.goto("/admin/apps");
    await expectLoaded(page);

    // Category → hidden below sm (640)
    await page.setViewportSize({ width: 639, height: 900 });
    await expect(
      page.getByRole("columnheader", { name: "Category" })
    ).not.toBeVisible();
    await page.setViewportSize({ width: 640, height: 900 });
    await expect(
      page.getByRole("columnheader", { name: "Category" })
    ).toBeVisible();

    // Redirect URIs → hidden below md (768)
    await page.setViewportSize({ width: 767, height: 900 });
    await expect(
      page.getByRole("columnheader", { name: "Redirect URIs" })
    ).not.toBeVisible();
    await page.setViewportSize({ width: 768, height: 900 });
    await expect(
      page.getByRole("columnheader", { name: "Redirect URIs" })
    ).toBeVisible();
  });

  // ── #9 i18n (vi) ──
  test("sorts with Vietnamese locale + localized aria-label", async ({
    page
  }) => {
    await page.goto("/vi/admin/apps");
    await expect(page.locator("tbody tr").first()).toBeVisible();
    const viSortBtn = page.getByRole("button", { name: /sắp xếp theo/i });
    await expect(viSortBtn.first()).toBeVisible();
    await viSortBtn.first().click();
    await expect(page).toHaveURL(/sortBy=/);
    await expect(
      page.locator('th[aria-sort="ascending"], th[aria-sort="descending"]')
    ).toHaveCount(1);
  });
});
