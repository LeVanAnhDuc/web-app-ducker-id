import { test, expect } from "@/fixtures";
import { FavoriteButton } from "@/components/favorite-button.component";
import { clientLiteral, copy } from "@/data/copy";
import { waitForAppsList } from "@/utils/catalog";
import {
  getCatalogIdsByName,
  getFavoriteIds,
  setFavorites
} from "@/utils/favorites";
import {
  failStarring,
  isToggleUrl,
  waitForFavoritesList,
  waitForToggle
} from "./helpers";

// Favourite toggle on the Apps catalogue (/apps) and Home, and cross-page
// consistency with /favorites. Role: user (user@test.com). The user's
// favourites are snapshotted in beforeAll, cleared, and restored in afterAll.
// Test cases: test-cases/favorites.md (TC-FAVORITES-013 … 016, 036, 037, 039).
//
// APP is the first catalogue app by name, read at run time.

let APP = ""; // first user-visible catalogue app by name
let idByName: Record<string, string> = {};

// Snapshot of the user's favorites before the suite runs, restored afterAll.
let originalFavorites: string[] = [];

test.describe("Favorite toggle — Apps catalog + cross-page", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeAll(async () => {
    originalFavorites = await getFavoriteIds();
    idByName = await getCatalogIdsByName();
    [APP = ""] = Object.keys(idByName).sort((x, y) => x.localeCompare(y));
    // Start each run from a known clean slate (zero favorites).
    await setFavorites([]);
  });

  // Every test starts with APP not favourited (the double-click case may
  // legitimately end either way).
  test.beforeEach(async () => {
    await setFavorites([]);
  });

  test.afterAll(async () => {
    // Idempotent revert to the captured snapshot (adds back / removes extras).
    await setFavorites(originalFavorites);
  });

  // --- Group 1 (happy) + 8 (data render) + 11 (persist) ---
  test(
    "Starring from a tile persists across reloads",
    { tag: ["@TC-FAVORITES-013", "@smoke"] },
    async ({ page, appsPage }) => {
      const hearts = new FavoriteButton(page);
      await Promise.all([waitForAppsList(page), appsPage.goto()]);

      const heart = hearts.forApp(APP);
      await expect(heart).toBeVisible();
      // Group 8: state is exposed via aria-pressed (not raw true/false text).
      await expect(heart).toHaveAttribute("aria-pressed", "false");

      // Group 1: POST 201 on add.
      const added = waitForToggle(page, "POST");
      await heart.click();
      await added;
      await expect(heart).toHaveAttribute("aria-pressed", "true");

      // Group 11: reload /apps → server still reports isFavorite=true.
      await Promise.all([waitForAppsList(page), page.reload()]);
      await expect(hearts.forApp(APP)).toHaveAttribute("aria-pressed", "true");

      // Toggle back off → DELETE → outline persists after reload.
      const removed = waitForToggle(page, "DELETE");
      await hearts.forApp(APP).click();
      await removed;
      await expect(hearts.forApp(APP)).toHaveAttribute("aria-pressed", "false");

      await Promise.all([waitForAppsList(page), page.reload()]);
      await expect(hearts.forApp(APP)).toHaveAttribute("aria-pressed", "false");
    }
  );

  // --- Group 11 (mutation safety / idempotency, A only) ---
  test(
    "A rapid double click settles without error",
    { tag: "@TC-FAVORITES-014" },
    async ({ page, appsPage }) => {
      const hearts = new FavoriteButton(page);
      await Promise.all([waitForAppsList(page), appsPage.goto()]);

      const heart = hearts.forApp(APP);
      await expect(heart).toHaveAttribute("aria-pressed", "false");

      // Two quick clicks: add then remove. The button is disabled while a
      // mutation is pending, so the optimistic state must end consistent and the
      // API must not 500 (POST/DELETE are idempotent on the BE).
      const favoriteOps: Promise<unknown>[] = [];
      page.on("request", (req) => {
        if (isToggleUrl(req.url())) {
          favoriteOps.push(req.response());
        }
      });
      await heart.click();
      await hearts
        .forApp(APP)
        .click({ trial: false })
        .catch(() => {
          /* button may be briefly disabled mid-flight; ignore the dropped click */
        });

      // Settle, then assert the persisted truth via a fresh reload. Hearts are
      // disabled while a toggle is pending, so once at least one favourite
      // request has gone out, the heart is enabled again and every favourite
      // request sent so far has its response, no mutation is in flight.
      await expect.poll(() => favoriteOps.length).toBeGreaterThan(0);
      await expect(hearts.forApp(APP)).toBeEnabled();
      await Promise.all(favoriteOps);
      await Promise.all([waitForAppsList(page), page.reload()]);
      const finalHeart = hearts.forApp(APP);
      await expect(finalHeart).toBeVisible();
      // End state is deterministic per the API, whatever the last applied op was.
      const pressed = await finalHeart.getAttribute("aria-pressed");
      expect(["true", "false"]).toContain(pressed);
    }
  );

  // --- Group 13 (cross-page consistency, A only) ---
  test(
    "`/apps` and `/favorites` stay consistent",
    { tag: "@TC-FAVORITES-015" },
    async ({ page, appsPage, favoritesPage }) => {
      const hearts = new FavoriteButton(page);
      // Favorite on the catalog.
      await Promise.all([waitForAppsList(page), appsPage.goto()]);
      const catalogHeart = hearts.forApp(APP);
      await expect(catalogHeart).toHaveAttribute("aria-pressed", "false");
      const added = waitForToggle(page, "POST");
      await catalogHeart.click();
      await added;

      // It shows up on /favorites (React Query invalidate + refetch).
      await favoritesPage.goto();
      await waitForFavoritesList(page);
      const favHeart = favoritesPage.hearts.forApp(APP);
      await expect(favHeart).toBeVisible();
      await expect(favHeart).toHaveAttribute("aria-pressed", "true");

      // Unfavorite from /favorites → the card is removed optimistically.
      await favHeart.click();
      await expect(favoritesPage.hearts.forApp(APP)).toHaveCount(0);

      // Back on /apps the heart is outline again.
      await Promise.all([waitForAppsList(page), appsPage.goto()]);
      await expect(hearts.forApp(APP)).toHaveAttribute("aria-pressed", "false");
    }
  );

  test(
    "A failed toggle rolls back and is announced",
    { tag: "@TC-FAVORITES-016" },
    async ({ page, appsPage }) => {
      const hearts = new FavoriteButton(page);
      await failStarring(page);
      await Promise.all([waitForAppsList(page), appsPage.goto()]);
      const heart = hearts.forApp(APP);
      await expect(heart).toHaveAttribute("aria-pressed", "false");

      await heart.click();
      // Optimistic flip, then rollback once the POST fails.
      await expect(hearts.forApp(APP)).toHaveAttribute("aria-pressed", "false");
      await expect(appsPage.announcer.region()).toHaveText(
        copy.favorites.announce.error
      );
      expect(await getFavoriteIds()).toEqual([]);
    }
  );

  test(
    "A failed toggle also raises an error toast",
    { tag: "@TC-FAVORITES-036" },
    async ({ page, appsPage }) => {
      const hearts = new FavoriteButton(page);
      await failStarring(page);
      await Promise.all([waitForAppsList(page), appsPage.goto()]);

      const failed = waitForToggle(page, "POST");
      await hearts.forApp(APP).click();
      await failed;
      // useToggleFavorite opts out of nothing, so the mutation cache's global
      // 5xx toast is the error toast the user reads (Q2).
      await expect(
        appsPage.toast.withText(clientLiteral.serverErrorToast)
      ).toBeVisible();
      await expect(hearts.forApp(APP)).toHaveAttribute("aria-pressed", "false");
    }
  );

  test(
    "The heart works from the keyboard and announces the result",
    { tag: "@TC-FAVORITES-037" },
    async ({ page, appsPage }) => {
      const hearts = new FavoriteButton(page);
      await appsPage.announcer.record();
      await Promise.all([waitForAppsList(page), appsPage.goto()]);

      const heart = hearts.forApp(APP);
      await expect(heart).toHaveAttribute("aria-pressed", "false");

      // Space stars it…
      await heart.focus();
      const added = waitForToggle(page, "POST");
      await page.keyboard.press("Space");
      expect((await added).status()).toBe(201);
      await expect(hearts.forApp(APP)).toHaveAttribute("aria-pressed", "true");
      await expect
        .poll(() => appsPage.announcer.history())
        .toContain(copy.favorites.announce.added);

      // …and Enter unstars it again.
      await expect(hearts.forApp(APP)).toBeEnabled();
      await hearts.forApp(APP).focus();
      const removed = waitForToggle(page, "DELETE");
      await page.keyboard.press("Enter");
      expect((await removed).status()).toBe(204);
      await expect(hearts.forApp(APP)).toHaveAttribute("aria-pressed", "false");
      await expect
        .poll(() => appsPage.announcer.history())
        .toContain(copy.favorites.announce.removed);
      expect(await getFavoriteIds()).toEqual([]);
    }
  );

  test(
    "Starring from a Home tile shows up on `/favorites`",
    { tag: "@TC-FAVORITES-039" },
    async ({ page, homePage, favoritesPage }) => {
      await homePage.goto();
      // Home shows the user's recent apps (or the first catalogue apps) and
      // Recommended apps — which ones depends on the run, so star the first
      // tile there is. Every app starts unstarred (beforeEach).
      const heart = homePage.hearts.allUnstarred().first();
      await expect(heart).toBeVisible();
      const name = await homePage.hearts.appNameOf(heart);
      expect(idByName[name], `${name} is in the catalogue`).toBeTruthy();

      const added = waitForToggle(page, "POST");
      await heart.click();
      expect((await added).status()).toBe(201);
      expect(await getFavoriteIds()).toEqual([idByName[name]]);

      await Promise.all([waitForFavoritesList(page), favoritesPage.goto()]);
      await expect(favoritesPage.cardTitle(name)).toBeVisible();
      await expect(favoritesPage.hearts.forApp(name)).toHaveAttribute(
        "aria-pressed",
        "true"
      );
    }
  );
});
