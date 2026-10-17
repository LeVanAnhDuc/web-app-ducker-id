import { test, expect } from "@/fixtures";
import type { Locator } from "@playwright/test";
import { FavoriteButton } from "@/components/favorite-button.component";
import { copy, copyVi } from "@/data/copy";
import { AppsPage } from "@/pages/dashboard/apps.page";
import { FavoritesPage } from "@/pages/dashboard/favorites.page";
import { waitForAppsList } from "@/utils/catalog";
import {
  getCatalogIdsByName,
  getFavoriteIds,
  setFavorites
} from "@/utils/favorites";
import { waitForFavoritesList } from "./helpers";

// i18n: /apps + /favorites in en (no prefix) and vi (/vi prefix). Asserts
// the heart aria-label, sort labels, search placeholder and empty state are
// localised and that no raw message key leaks into the DOM. Role: user.
// Test cases: test-cases/favorites.md (TC-FAVORITES-010 … 012).
//
// APP is the first catalogue app by name, read at run time.

let APP = "";

// Assert no leaked i18n key string is visible anywhere in the body.
const assertNoRawKeys = async (body: Locator) => {
  const text = await body.innerText();
  expect(text).not.toMatch(/favorites\.(card|sort|search|empty|announce)/);
  expect(text).not.toMatch(/apps\.card\./);
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
  test.describe(
    "The heart's label is localised on `/apps`",
    { tag: "@TC-FAVORITES-010" },
    () => {
      test("en (default locale)", async ({ page, appsPage }) => {
        await Promise.all([waitForAppsList(page), appsPage.goto()]);
        await expect(new FavoriteButton(page).add(APP)).toBeVisible();
        await assertNoRawKeys(appsPage.body());
      });

      test("vi (/vi)", async ({ page }) => {
        const appsVi = new AppsPage(page, "vi");
        await Promise.all([waitForAppsList(page), appsVi.goto()]);
        await expect(new FavoriteButton(page, copyVi).add(APP)).toBeVisible();
        await assertNoRawKeys(appsVi.body());
      });
    }
  );

  // --- /favorites chrome (sort + search) localized, with content ---
  test.describe(
    "`/favorites` chrome is localised",
    { tag: "@TC-FAVORITES-011" },
    () => {
      for (const locale of ["en", "vi"] as const) {
        test(locale, async ({ page }) => {
          const favorites = new FavoritesPage(page, locale);
          const t = locale === "vi" ? copyVi : copy;
          await setFavorites([idByName[APP]]);
          await Promise.all([waitForFavoritesList(page), favorites.goto()]);

          // Unified toolbar: accessible name is the generic list "Search"; the
          // localized text lives in the placeholder attribute.
          await expect(favorites.searchInput()).toHaveAttribute(
            "placeholder",
            t.favorites.search.placeholder
          );
          await expect(favorites.sortButton()).toBeVisible();
          await favorites.openSort();
          await expect(favorites.sortOption("recent")).toBeVisible();
          await expect(favorites.sortOption("name")).toBeVisible();
          await page.keyboard.press("Escape");
          await assertNoRawKeys(favorites.body());
        });
      }
    }
  );

  // --- Empty state localized (en + vi) ---
  test.describe(
    "The empty state is localised",
    { tag: "@TC-FAVORITES-012" },
    () => {
      for (const locale of ["en", "vi"] as const) {
        test(locale, async ({ page }) => {
          const favorites = new FavoritesPage(page, locale);
          await setFavorites([]);
          await Promise.all([waitForFavoritesList(page), favorites.goto()]);
          await expect(favorites.emptyState()).toBeVisible();
        });
      }
    }
  );
});
