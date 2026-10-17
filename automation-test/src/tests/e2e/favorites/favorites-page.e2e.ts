import { test, expect } from "@/fixtures";
import {
  getCatalogIdsByName,
  getFavoriteIds,
  setFavorites
} from "@/utils/favorites";
import { failListing, waitForFavoritesList } from "./helpers";

// Favorites page (/favorites): list of favourited apps with search, category
// filter, sort (Recent/Name), optimistic remove-on-toggle-off and its error
// and focus behaviour. Role: user (user@test.com). Favourites are set through
// the API (utils/favorites.ts) and the original set is restored in afterAll.
// Test cases: test-cases/favorites.md (TC-FAVORITES-001 … 008, 035, 038).
//
// A, B, C are the first three catalogue apps by name, read at run time —
// the suite does not depend on which apps the database holds.

let originalFavorites: string[] = [];
let idByName: Record<string, string> = {};
let A = "";
let B = "";
let C = "";

test.describe("Favorites page (/favorites)", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeAll(async () => {
    originalFavorites = await getFavoriteIds();
    idByName = await getCatalogIdsByName();
    [A = "", B = "", C = ""] = Object.keys(idByName).sort((x, y) =>
      x.localeCompare(y)
    );
    expect(C, "needs three user-visible catalogue apps").toBeTruthy();
  });

  test.afterAll(async () => {
    await setFavorites(originalFavorites);
  });

  test(
    "Zero favourites shows the empty state",
    { tag: "@TC-FAVORITES-001" },
    async ({ page, favoritesPage }) => {
      await setFavorites([]);
      await Promise.all([waitForFavoritesList(page), favoritesPage.goto()]);
      await expect(favoritesPage.emptyState()).toBeVisible();
    }
  );

  test(
    "Exactly one favourite renders one card",
    { tag: "@TC-FAVORITES-002" },
    async ({ page, favoritesPage }) => {
      await setFavorites([idByName[A]]);
      await Promise.all([waitForFavoritesList(page), favoritesPage.goto()]);
      await expect(favoritesPage.cardTitle(A)).toBeVisible();
      await expect(favoritesPage.cardTitles()).toHaveCount(1);
      await expect(favoritesPage.cardTitle(B)).toHaveCount(0);
    }
  );

  test(
    "Several favourites render as a grid",
    { tag: ["@TC-FAVORITES-003", "@smoke"] },
    async ({ page, favoritesPage }) => {
      await setFavorites([idByName[A], idByName[B], idByName[C]]);
      await Promise.all([waitForFavoritesList(page), favoritesPage.goto()]);
      await expect(favoritesPage.cardTitle(A)).toBeVisible();
      await expect(favoritesPage.cardTitle(B)).toBeVisible();
      await expect(favoritesPage.cardTitle(C)).toBeVisible();
      await expect(favoritesPage.cardTitles()).toHaveCount(3);
    }
  );

  test(
    "Search narrows the favourites and clears",
    { tag: "@TC-FAVORITES-004" },
    async ({ page, favoritesPage }) => {
      await setFavorites([idByName[A], idByName[B], idByName[C]]);
      await Promise.all([waitForFavoritesList(page), favoritesPage.goto()]);
      await expect(favoritesPage.cardTitle(A)).toBeVisible();

      // Match.
      await favoritesPage.search(B);
      await waitForFavoritesList(page);
      await expect(favoritesPage.cardTitle(B)).toBeVisible();
      await expect(favoritesPage.cardTitle(A)).toHaveCount(0);

      // No match → empty state.
      await favoritesPage.search("zzz-no-such-app");
      await waitForFavoritesList(page);
      await expect(favoritesPage.emptyState()).toBeVisible();

      // Clear → all back. Clearing reverts to the initial query key, which
      // React Query serves from cache (no network GET fires).
      await favoritesPage.search("");
      await expect(favoritesPage.cardTitle(A)).toBeVisible();
      await expect(favoritesPage.cardTitle(B)).toBeVisible();
    }
  );

  // Category filter lives in a Filters popover; its state is in the URL
  // (categoryId) and the active count shows as a badge on the button.
  test(
    "The category filter narrows the favourites and clears",
    { tag: "@TC-FAVORITES-005" },
    async ({ page, favoritesPage }) => {
      await setFavorites([idByName[A], idByName[B], idByName[C]]);
      await Promise.all([waitForFavoritesList(page), favoritesPage.goto()]);

      await favoritesPage.openFilters();
      await expect(favoritesPage.filtersPopover()).toBeVisible();
      await favoritesPage.categorySelect().click();
      const filtered = waitForFavoritesList(page);
      await favoritesPage.selectOption(1).click();
      const res = await filtered;

      await expect(page).toHaveURL(/categoryId=/);
      const categoryId = new URL(page.url()).searchParams.get("categoryId");
      const { data } = (await res.json()) as {
        data: { items: { categories: { _id: string }[] }[] };
      };
      for (const app of data.items) {
        expect(app.categories.map((c) => c._id)).toContain(categoryId);
      }
      await expect(favoritesPage.filtersButton()).toContainText("1");

      // The popover stays open after picking (only the inner Select closes);
      // "Clear all" inside it drops categoryId from the URL.
      await expect(favoritesPage.filtersPopover()).toBeVisible();
      await favoritesPage.clearAllButton().click();
      await expect(page).not.toHaveURL(/categoryId=/);
    }
  );

  test(
    "The search term survives a reload",
    { tag: "@TC-FAVORITES-006" },
    async ({ page, favoritesPage }) => {
      await setFavorites([idByName[A], idByName[B]]);
      await Promise.all([
        waitForFavoritesList(page),
        favoritesPage.goto(`?search=${encodeURIComponent(B)}`)
      ]);
      await expect(favoritesPage.cardTitle(B)).toBeVisible();
      await expect(favoritesPage.cardTitle(A)).toHaveCount(0);

      await Promise.all([waitForFavoritesList(page), page.reload()]);
      expect(new URL(page.url()).searchParams.get("search")).toBe(B);
      await expect(favoritesPage.cardTitle(B)).toBeVisible();
      await expect(favoritesPage.cardTitle(A)).toHaveCount(0);
    }
  );

  test(
    "Sort by Recent vs by Name",
    { tag: "@TC-FAVORITES-007" },
    async ({ page, favoritesPage }) => {
      // Favourite A, then B, then C: Recent (newest first) = C, B, A while
      // Name = A, B, C — two different orders, so each sort is observable.
      await setFavorites([]);
      await setFavorites([idByName[A]]);
      await setFavorites([idByName[A], idByName[B]]);
      await setFavorites([idByName[A], idByName[B], idByName[C]]);

      await Promise.all([waitForFavoritesList(page), favoritesPage.goto()]);

      const titles = () => favoritesPage.cardTitles().allTextContents();

      // Default sort = Recent.
      await expect(favoritesPage.cardTitle(A)).toBeVisible();
      expect(await titles()).toEqual([C, B, A]);

      await favoritesPage.openSort();
      const byName = waitForFavoritesList(page);
      await favoritesPage.sortOption("name").click();
      await byName;
      await expect.poll(async () => titles()).toEqual([A, B, C]);
    }
  );

  test(
    "Unstarring on `/favorites` removes the card at once",
    { tag: "@TC-FAVORITES-008" },
    async ({ page, favoritesPage }) => {
      await setFavorites([idByName[A], idByName[B]]);
      await Promise.all([waitForFavoritesList(page), favoritesPage.goto()]);
      await expect(favoritesPage.cardTitle(A)).toBeVisible();

      await favoritesPage.hearts.toggle(A);
      // Optimistic remove: the card disappears immediately.
      await expect(favoritesPage.cardTitle(A)).toHaveCount(0);
      await expect(favoritesPage.cardTitle(B)).toBeVisible();
    }
  );

  test(
    "A failed load shows the error message, not the empty state",
    { tag: "@TC-FAVORITES-035" },
    async ({ favoritesPage }) => {
      // BUG: defects/favorites.md#bug-favorites-01
      test.fail();

      await setFavorites([idByName[A]]);
      await failListing(favoritesPage.page);
      await favoritesPage.goto();

      // React Query retries a 5xx twice (1 s, then 2 s) before it gives up.
      await expect(favoritesPage.errorMessage()).toBeVisible({
        timeout: 15_000
      });
      await expect(favoritesPage.emptyState()).toHaveCount(0);
    }
  );

  test(
    "Unstarring from the keyboard keeps focus on the page",
    { tag: "@TC-FAVORITES-038" },
    async ({ page, favoritesPage }) => {
      // BUG: defects/favorites.md#bug-favorites-02
      test.fail();

      await setFavorites([idByName[A], idByName[B]]);
      await Promise.all([waitForFavoritesList(page), favoritesPage.goto()]);
      await expect(favoritesPage.cardTitle(A)).toBeVisible();

      await favoritesPage.hearts.forApp(A).focus();
      await page.keyboard.press("Enter");
      await expect(favoritesPage.cardTitle(A)).toHaveCount(0);
      await expect(favoritesPage.hearts.forApp(B)).toBeEnabled();

      // The focused heart left the DOM with its card; focus must land on
      // something in the page (the next heart, the grid), not drop to <body>.
      await expect.poll(() => favoritesPage.focusIsOnBody()).toBe(false);
    }
  );
});
