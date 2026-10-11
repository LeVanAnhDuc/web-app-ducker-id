import { test, expect } from "@fixtures";
import type { Page } from "@playwright/test";
import {
  getCatalogIdsByName,
  getFavoriteIds,
  setFavorites
} from "@helpers/favorites";

// i18n: /apps + /favorites in en (no prefix) and vi (/vi prefix). Asserts
// the heart aria-label, sort labels, search placeholder and empty state are
// localised and that no raw message key leaks into the DOM. Role: user.
// Test cases: test-cases/favorites.md (TC-FAV-010 … 012).
//
// APP is the first catalogue app by name, read at run time.

let APP = "";

const EN = {
  add: () => `Add to favorites: ${APP}`,
  sortLabel: /^Sort: /,
  sortRecent: "Recent",
  sortName: "Name",
  searchPlaceholder: "Search favorites...",
  empty: "You haven't favorited any apps yet."
};
const VI = {
  add: () => `Thêm vào yêu thích: ${APP}`,
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
    [APP = ""] = Object.keys(idByName).sort((x, y) => x.localeCompare(y));
    // Heart labels read "Add to …" only while the app is not a favourite.
    await setFavorites([]);
  });

  test.afterAll(async () => {
    await setFavorites(originalFavorites);
  });

  // --- /apps heart aria-label localized ---
  test(
    "apps catalog heart aria-label is English on the default locale",
    { tag: "@TC-FAV-010" },
    async ({ page }) => {
      await Promise.all([waitForCatalog(page), page.goto("/apps")]);
      await expect(
        page.getByRole("button", { name: EN.add(), exact: true })
      ).toBeVisible();
      await assertNoRawKeys(page);
    }
  );

  test(
    "apps catalog heart aria-label is Vietnamese on /vi",
    { tag: "@TC-FAV-010" },
    async ({ page }) => {
      await Promise.all([waitForCatalog(page), page.goto("/vi/apps")]);
      await expect(
        page.getByRole("button", { name: VI.add(), exact: true })
      ).toBeVisible();
      await assertNoRawKeys(page);
    }
  );

  // --- /favorites chrome (sort + search) localized, with content ---
  test(
    "favorites chrome is English on the default locale",
    { tag: "@TC-FAV-011" },
    async ({ page }) => {
      await setFavorites([idByName[APP]]);
      await Promise.all([waitForFavorites(page), page.goto("/favorites")]);

      // Unified toolbar: accessible name is the generic list "Search"; the
      // localized text lives in the placeholder attribute.
      await expect(
        page.getByRole("search").getByRole("textbox")
      ).toHaveAttribute("placeholder", EN.searchPlaceholder);
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
    }
  );

  test(
    "favorites chrome is Vietnamese on /vi",
    { tag: "@TC-FAV-011" },
    async ({ page }) => {
      await setFavorites([idByName[APP]]);
      await Promise.all([waitForFavorites(page), page.goto("/vi/favorites")]);

      await expect(
        page.getByRole("search").getByRole("textbox")
      ).toHaveAttribute("placeholder", VI.searchPlaceholder);
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
    }
  );

  // --- Empty state localized (en + vi) ---
  test(
    "empty state is localized in English",
    { tag: "@TC-FAV-012" },
    async ({ page }) => {
      await setFavorites([]);
      await Promise.all([waitForFavorites(page), page.goto("/favorites")]);
      await expect(page.getByText(EN.empty)).toBeVisible();
    }
  );

  test(
    "empty state is localized in Vietnamese",
    { tag: "@TC-FAV-012" },
    async ({ page }) => {
      await setFavorites([]);
      await Promise.all([waitForFavorites(page), page.goto("/vi/favorites")]);
      await expect(page.getByText(VI.empty)).toBeVisible();
    }
  );
});
