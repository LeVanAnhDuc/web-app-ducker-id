import { test, expect } from "@fixtures";
import type { Page } from "@playwright/test";
import {
  getCatalogIdsByName,
  getFavoriteIds,
  setFavorites
} from "@helpers/favorites";

// Favorites page (/favorites): list of favourited apps with search, category
// filter, sort (Recent/Name) and optimistic remove-on-toggle-off. Role: user
// (user@test.com). Favourites are set through the API helper and the
// original set is restored in afterAll.
// Test cases: test-cases/favorites.md (TC-FAV-001 … 008).
//
// A, B, C are the first three catalogue apps by name, read at run time —
// the suite does not depend on which apps the database holds.

const FAVORITES_PATH = "/favorites";
const EMPTY_TEXT = "You haven't favorited any apps yet.";

const heartFor = (page: Page, name: string) =>
  page.getByRole("button", {
    name: new RegExp(`(Add|Remove) (to|from) favorites: ${name}`)
  });

const cardTitle = (page: Page, name: string) =>
  page.getByRole("heading", { name, exact: true });

const waitForFavorites = (page: Page) =>
  page.waitForResponse(
    (r) =>
      r.url().includes("/api/v1/users/me/favorites") &&
      r.request().method() === "GET" &&
      r.status() === 200
  );

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
    "zero favorites renders the empty state",
    { tag: "@TC-FAV-001" },
    async ({ page }) => {
      await setFavorites([]);
      await Promise.all([waitForFavorites(page), page.goto(FAVORITES_PATH)]);
      await expect(page.getByText(EMPTY_TEXT)).toBeVisible();
    }
  );

  test(
    "exactly one favorite renders a single card",
    { tag: "@TC-FAV-002" },
    async ({ page }) => {
      await setFavorites([idByName[A]]);
      await Promise.all([waitForFavorites(page), page.goto(FAVORITES_PATH)]);
      await expect(cardTitle(page, A)).toBeVisible();
      await expect(page.getByRole("heading", { level: 3 })).toHaveCount(1);
      await expect(cardTitle(page, B)).toHaveCount(0);
    }
  );

  test(
    "multiple favorites render as a grid (happy path)",
    { tag: ["@TC-FAV-003", "@smoke"] },
    async ({ page }) => {
      await setFavorites([idByName[A], idByName[B], idByName[C]]);
      await Promise.all([waitForFavorites(page), page.goto(FAVORITES_PATH)]);
      await expect(cardTitle(page, A)).toBeVisible();
      await expect(cardTitle(page, B)).toBeVisible();
      await expect(cardTitle(page, C)).toBeVisible();
      await expect(page.getByRole("heading", { level: 3 })).toHaveCount(3);
    }
  );

  test(
    "search filters the favorites list and clears",
    { tag: "@TC-FAV-004" },
    async ({ page }) => {
      await setFavorites([idByName[A], idByName[B], idByName[C]]);
      await Promise.all([waitForFavorites(page), page.goto(FAVORITES_PATH)]);
      await expect(cardTitle(page, A)).toBeVisible();

      const search = page.getByRole("search").getByRole("textbox");
      // Match.
      await search.fill(B);
      await waitForFavorites(page);
      await expect(cardTitle(page, B)).toBeVisible();
      await expect(cardTitle(page, A)).toHaveCount(0);

      // No match → empty state.
      await search.fill("zzz-no-such-app");
      await waitForFavorites(page);
      await expect(page.getByText(EMPTY_TEXT)).toBeVisible();

      // Clear → all back. Clearing reverts to the initial query key, which
      // React Query serves from cache (no network GET fires).
      await search.fill("");
      await expect(cardTitle(page, A)).toBeVisible();
      await expect(cardTitle(page, B)).toBeVisible();
    }
  );

  // Category filter lives in a Filters popover; its state is in the URL
  // (categoryId) and the active count shows as a badge on the button.
  test(
    "category filter (Filters popover) narrows favorites and clears",
    { tag: "@TC-FAV-005" },
    async ({ page }) => {
      await setFavorites([idByName[A], idByName[B], idByName[C]]);
      await Promise.all([waitForFavorites(page), page.goto(FAVORITES_PATH)]);

      await page.getByRole("button", { name: /Filters/ }).click();
      const popover = page.locator('[data-slot="popover-content"]');
      await expect(popover).toBeVisible();
      await popover.getByRole("combobox").first().click();
      const filtered = waitForFavorites(page);
      await page.getByRole("option").nth(1).click();
      const res = await filtered;

      await expect(page).toHaveURL(/categoryId=/);
      const categoryId = new URL(page.url()).searchParams.get("categoryId");
      const { data } = (await res.json()) as {
        data: { items: { categories: { _id: string }[] }[] };
      };
      for (const app of data.items) {
        expect(app.categories.map((c) => c._id)).toContain(categoryId);
      }
      await expect(page.getByRole("button", { name: /Filters/ })).toContainText(
        "1"
      );

      // The popover stays open after picking (only the inner Select closes);
      // "Clear all" inside it drops categoryId from the URL.
      await expect(popover).toBeVisible();
      await popover.getByRole("button", { name: /Clear all/i }).click();
      await expect(page).not.toHaveURL(/categoryId=/);
    }
  );

  test(
    "search term persists in the URL and survives reload",
    { tag: "@TC-FAV-006" },
    async ({ page }) => {
      await setFavorites([idByName[A], idByName[B]]);
      await Promise.all([
        waitForFavorites(page),
        page.goto(`${FAVORITES_PATH}?search=${encodeURIComponent(B)}`)
      ]);
      await expect(cardTitle(page, B)).toBeVisible();
      await expect(cardTitle(page, A)).toHaveCount(0);

      await Promise.all([waitForFavorites(page), page.reload()]);
      expect(new URL(page.url()).searchParams.get("search")).toBe(B);
      await expect(cardTitle(page, B)).toBeVisible();
      await expect(cardTitle(page, A)).toHaveCount(0);
    }
  );

  test(
    "sort switches between Recent and Name ordering",
    { tag: "@TC-FAV-007" },
    async ({ page }) => {
      // Favourite A, then B, then C: Recent (newest first) = C, B, A while
      // Name = A, B, C — two different orders, so each sort is observable.
      await setFavorites([]);
      await setFavorites([idByName[A]]);
      await setFavorites([idByName[A], idByName[B]]);
      await setFavorites([idByName[A], idByName[B], idByName[C]]);

      await Promise.all([waitForFavorites(page), page.goto(FAVORITES_PATH)]);

      const titles = () =>
        page.getByRole("heading", { level: 3 }).allTextContents();

      // Default sort = Recent.
      await expect(cardTitle(page, A)).toBeVisible();
      expect(await titles()).toEqual([C, B, A]);

      await page.getByRole("button", { name: /^Sort: / }).click();
      const byName = waitForFavorites(page);
      await page.getByRole("menuitem", { name: "Name", exact: true }).click();
      await byName;
      await expect.poll(async () => titles()).toEqual([A, B, C]);
    }
  );

  test(
    "toggling a heart off removes the card from the list",
    { tag: "@TC-FAV-008" },
    async ({ page }) => {
      await setFavorites([idByName[A], idByName[B]]);
      await Promise.all([waitForFavorites(page), page.goto(FAVORITES_PATH)]);
      await expect(cardTitle(page, A)).toBeVisible();

      await heartFor(page, A).click();
      // Optimistic remove: the card disappears immediately.
      await expect(cardTitle(page, A)).toHaveCount(0);
      await expect(cardTitle(page, B)).toBeVisible();
    }
  );
});
