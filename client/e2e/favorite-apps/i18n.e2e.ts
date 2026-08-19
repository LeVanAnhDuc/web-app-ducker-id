import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import {
  getCatalogIdsByName,
  getFavoriteIds,
  setFavorites
} from "../helpers/favorites";

// i18n (matrix group 9): render /apps + /favorites in BOTH en (default, no
// prefix) and vi (/vi prefix). Assert the favorite heart aria-label, sort
// labels, search placeholder, and empty state are localized — and that no raw
// message key (e.g. "favorites.card.add") leaks into the rendered DOM.
//
// Locale switching is URL-prefix based (next-intl `as-needed`): en = "/apps",
// vi = "/vi/apps" — same mechanism the other i18n e2e specs use.

const APP = "Blog";

const EN = {
  add: `Add to favorites: ${APP}`,
  sortLabel: /^Sort: /,
  sortRecent: "Recent",
  sortName: "Name",
  searchPlaceholder: "Search favorites...",
  empty: "You haven't favorited any apps yet."
};
const VI = {
  add: `Thêm vào yêu thích: ${APP}`,
  sortLabel: /^Sắp xếp: /,
  sortRecent: "Gần đây",
  sortName: "Tên",
  searchPlaceholder: "Tìm trong yêu thích...",
  empty: "Bạn chưa yêu thích ứng dụng nào."
};

const waitForCatalog = (page: Page) =>
  page.waitForResponse(
    (r) =>
      r.url().includes("/api/v1/apps") &&
      !r.url().includes("/apps/categories") &&
      r.status() === 200
  );

const waitForFavorites = (page: Page) =>
  page.waitForResponse(
    (r) =>
      r.url().includes("/api/v1/users/me/favorites") &&
      r.request().method() === "GET" &&
      r.status() === 200
  );

// Assert no leaked i18n key string is visible anywhere in the body.
const assertNoRawKeys = async (page: Page) => {
  const body = await page.locator("body").innerText();
  expect(body).not.toMatch(/favorites\.(card|sort|search|empty|announce)/);
  expect(body).not.toMatch(/apps\.card\./);
};

let originalFavorites: string[] = [];
let idByName: Record<string, string> = {};

test.describe("Favorites i18n (en + vi)", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeAll(async () => {
    originalFavorites = await getFavoriteIds();
    idByName = await getCatalogIdsByName();
  });

  test.afterAll(async () => {
    await setFavorites(originalFavorites);
  });

  // --- /apps heart aria-label localized ---
  test("apps catalog heart aria-label is English on the default locale", async ({
    page
  }) => {
    await page.goto("/apps");
    await waitForCatalog(page);
    await expect(
      page.getByRole("button", { name: EN.add, exact: true })
    ).toBeVisible();
    await assertNoRawKeys(page);
  });

  test("apps catalog heart aria-label is Vietnamese on /vi", async ({
    page
  }) => {
    await page.goto("/vi/apps");
    await waitForCatalog(page);
    await expect(
      page.getByRole("button", { name: VI.add, exact: true })
    ).toBeVisible();
    await assertNoRawKeys(page);
  });

  // --- /favorites chrome (sort + search) localized, with content ---
  test("favorites chrome is English on the default locale", async ({
    page
  }) => {
    await setFavorites([idByName.Blog]);
    await page.goto("/favorites");
    await waitForFavorites(page);

    // Unified toolbar: accessible name is the generic list "Search"; the
    // localized text lives in the placeholder attribute.
    await expect(page.getByRole("search").getByRole("textbox")).toHaveAttribute(
      "placeholder",
      EN.searchPlaceholder
    );
    const sort = page.getByRole("button", { name: EN.sortLabel });
    await expect(sort).toBeVisible();
    await sort.click();
    await expect(
      page.getByRole("menuitem", { name: EN.sortRecent, exact: true })
    ).toBeVisible();
    await expect(
      page.getByRole("menuitem", { name: EN.sortName, exact: true })
    ).toBeVisible();
    await page.keyboard.press("Escape");
    await assertNoRawKeys(page);
  });

  test("favorites chrome is Vietnamese on /vi", async ({ page }) => {
    await setFavorites([idByName.Blog]);
    await page.goto("/vi/favorites");
    await waitForFavorites(page);

    await expect(page.getByRole("search").getByRole("textbox")).toHaveAttribute(
      "placeholder",
      VI.searchPlaceholder
    );
    const sort = page.getByRole("button", { name: VI.sortLabel });
    await expect(sort).toBeVisible();
    await sort.click();
    await expect(
      page.getByRole("menuitem", { name: VI.sortRecent, exact: true })
    ).toBeVisible();
    await expect(
      page.getByRole("menuitem", { name: VI.sortName, exact: true })
    ).toBeVisible();
    await page.keyboard.press("Escape");
    await assertNoRawKeys(page);
  });

  // --- Empty state localized (en + vi) ---
  test("empty state is localized in English", async ({ page }) => {
    await setFavorites([]);
    await page.goto("/favorites");
    await waitForFavorites(page);
    await expect(page.getByText(EN.empty)).toBeVisible();
  });

  test("empty state is localized in Vietnamese", async ({ page }) => {
    await setFavorites([]);
    await page.goto("/vi/favorites");
    await waitForFavorites(page);
    await expect(page.getByText(VI.empty)).toBeVisible();
  });
});
