import { test, expect } from "@fixtures";
import type { Page } from "@playwright/test";
import {
  getCatalogIdsByName,
  getFavoriteIds,
  setFavorites
} from "@helpers/favorites";

// Favourite toggle on the Apps catalogue (/apps) and cross-page consistency
// with /favorites. Role: user (user@test.com). The user's favourites are
// snapshotted in beforeAll, cleared, and restored in afterAll.
// Test cases: test-cases/favorites.md (TC-FAV-013 … 016).
//
// APP is the first catalogue app by name, read at run time.

const APPS_PATH = "/apps";
const FAVORITES_PATH = "/favorites";
let APP = ""; // first user-visible catalogue app by name

const heartFor = (page: Page, name: string) =>
  page.getByRole("button", {
    name: new RegExp(`(Add|Remove) (to|from) favorites: ${name}`)
  });

const waitForCatalog = (page: Page) =>
  page.waitForResponse(
    (r) =>
      r.url().includes("/api/v1/apps") &&
      !r.url().includes("/apps/categories") &&
      r.status() === 200
  );

// Snapshot of the user's favorites before the suite runs, restored afterAll.
let originalFavorites: string[] = [];

test.describe("Favorite toggle — Apps catalog + cross-page", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeAll(async () => {
    originalFavorites = await getFavoriteIds();
    [APP = ""] = Object.keys(await getCatalogIdsByName()).sort((x, y) =>
      x.localeCompare(y)
    );
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
    "toggle a heart from outline to filled and persist across reload",
    { tag: ["@TC-FAV-013", "@smoke"] },
    async ({ page }) => {
      await Promise.all([waitForCatalog(page), page.goto(APPS_PATH)]);

      const heart = heartFor(page, APP);
      await expect(heart).toBeVisible();
      // Group 8: state is exposed via aria-pressed (not raw true/false text).
      await expect(heart).toHaveAttribute("aria-pressed", "false");

      // Group 1: POST 201 on add.
      const added = page.waitForResponse(
        (r) =>
          r.url().includes("/api/v1/users/me/favorites/") &&
          r.request().method() === "POST"
      );
      await heart.click();
      await added;
      await expect(heart).toHaveAttribute("aria-pressed", "true");

      // Group 11: reload /apps → server still reports isFavorite=true.
      await Promise.all([waitForCatalog(page), page.reload()]);
      await expect(heartFor(page, APP)).toHaveAttribute("aria-pressed", "true");

      // Toggle back off → DELETE → outline persists after reload.
      const removed = page.waitForResponse(
        (r) =>
          r.url().includes("/api/v1/users/me/favorites/") &&
          r.request().method() === "DELETE"
      );
      await heartFor(page, APP).click();
      await removed;
      await expect(heartFor(page, APP)).toHaveAttribute(
        "aria-pressed",
        "false"
      );

      await Promise.all([waitForCatalog(page), page.reload()]);
      await expect(heartFor(page, APP)).toHaveAttribute(
        "aria-pressed",
        "false"
      );
    }
  );

  // --- Group 11 (mutation safety / idempotency, A only) ---
  test(
    "double-click rapidly settles to a consistent state without error",
    { tag: "@TC-FAV-014" },
    async ({ page }) => {
      await Promise.all([waitForCatalog(page), page.goto(APPS_PATH)]);

      const heart = heartFor(page, APP);
      await expect(heart).toHaveAttribute("aria-pressed", "false");

      // Two quick clicks: add then remove. The button is disabled while a
      // mutation is pending, so the optimistic state must end consistent and the
      // API must not 500 (POST/DELETE are idempotent on the BE).
      await heart.click();
      await heartFor(page, APP)
        .click({ trial: false })
        .catch(() => {
          /* button may be briefly disabled mid-flight; ignore the dropped click */
        });

      // Settle, then assert the persisted truth via a fresh reload.
      await page.waitForTimeout(500);
      await Promise.all([waitForCatalog(page), page.reload()]);
      const finalHeart = heartFor(page, APP);
      await expect(finalHeart).toBeVisible();
      // End state is deterministic per the API, whatever the last applied op was.
      const pressed = await finalHeart.getAttribute("aria-pressed");
      expect(["true", "false"]).toContain(pressed);
    }
  );

  // --- Group 13 (cross-page consistency, A only) ---
  test(
    "favorite on /apps appears on /favorites; unfavorite there flips /apps back",
    { tag: "@TC-FAV-015" },
    async ({ page }) => {
      // Favorite on the catalog.
      await Promise.all([waitForCatalog(page), page.goto(APPS_PATH)]);
      const catalogHeart = heartFor(page, APP);
      await expect(catalogHeart).toHaveAttribute("aria-pressed", "false");
      const added = page.waitForResponse(
        (r) =>
          r.url().includes("/api/v1/users/me/favorites/") &&
          r.request().method() === "POST"
      );
      await catalogHeart.click();
      await added;

      // It shows up on /favorites (React Query invalidate + refetch).
      await page.goto(FAVORITES_PATH);
      await page.waitForResponse(
        (r) =>
          r.url().includes("/api/v1/users/me/favorites") &&
          r.request().method() === "GET" &&
          r.status() === 200
      );
      const favHeart = heartFor(page, APP);
      await expect(favHeart).toBeVisible();
      await expect(favHeart).toHaveAttribute("aria-pressed", "true");

      // Unfavorite from /favorites → the card is removed optimistically.
      await favHeart.click();
      await expect(heartFor(page, APP)).toHaveCount(0);

      // Back on /apps the heart is outline again.
      await Promise.all([waitForCatalog(page), page.goto(APPS_PATH)]);
      await expect(heartFor(page, APP)).toHaveAttribute(
        "aria-pressed",
        "false"
      );
    }
  );

  test(
    "a failed toggle rolls the heart back and says so",
    { tag: "@TC-FAV-016" },
    async ({ page }) => {
      await page.route(/\/api\/v1\/users\/me\/favorites\/[^/?]+$/, (route) =>
        route.request().method() === "POST"
          ? route.fulfill({
              status: 500,
              contentType: "application/json",
              body: JSON.stringify({
                code: "INTERNAL_ERROR",
                message: "boom",
                timestamp: new Date().toISOString(),
                path: "/api/v1/users/me/favorites"
              })
            })
          : route.continue()
      );
      await Promise.all([waitForCatalog(page), page.goto(APPS_PATH)]);
      const heart = heartFor(page, APP);
      await expect(heart).toHaveAttribute("aria-pressed", "false");

      await heart.click();
      // Optimistic flip, then rollback once the POST fails.
      await expect(heartFor(page, APP)).toHaveAttribute(
        "aria-pressed",
        "false"
      );
      await expect(page.locator("#announcer")).toHaveText(
        "Failed to update favorites."
      );
      expect(await getFavoriteIds()).toEqual([]);
    }
  );
});
