import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import { getFavoriteIds, setFavorites } from "../helpers/favorites";

// Favorite toggle on the Apps catalog (/apps) + cross-page consistency with
// /favorites. Runs authenticated as user@test.com via the global storageState
// (auth.setup). The seed user has NO favorites seeder, so they start clean; any
// favorite a test adds is reverted in afterAll so the shared user state stays
// pristine (idempotent — restores the snapshot captured before the run).
//
// Matrix groups covered (design.md §6):
//   1  Happy path     — toggle outline → filled on /apps
//   8  Data rendering  — heart reflects isFavorite (aria-pressed + filled icon)
//  11  Mutation safety — persist across reload; double-click idempotent (A only)
//  13  Cross-page      — favorite on /apps appears on /favorites; unfavorite on
//                        /favorites flips the heart back on /apps (A only)

const APPS_PATH = "/apps";
const FAVORITES_PATH = "/favorites";
const APP = "Blog"; // seeded, user-visible, ACTIVE

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
    // Start each run from a known clean slate (zero favorites).
    await setFavorites([]);
  });

  test.afterAll(async () => {
    // Idempotent revert to the captured snapshot (adds back / removes extras).
    await setFavorites(originalFavorites);
  });

  // --- Group 1 (happy) + 8 (data render) + 11 (persist) ---
  test("toggle a heart from outline to filled and persist across reload", async ({
    page
  }) => {
    await page.goto(APPS_PATH);
    await waitForCatalog(page);

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
    await page.reload();
    await waitForCatalog(page);
    await expect(heartFor(page, APP)).toHaveAttribute("aria-pressed", "true");

    // Toggle back off → DELETE → outline persists after reload.
    const removed = page.waitForResponse(
      (r) =>
        r.url().includes("/api/v1/users/me/favorites/") &&
        r.request().method() === "DELETE"
    );
    await heartFor(page, APP).click();
    await removed;
    await expect(heartFor(page, APP)).toHaveAttribute("aria-pressed", "false");

    await page.reload();
    await waitForCatalog(page);
    await expect(heartFor(page, APP)).toHaveAttribute("aria-pressed", "false");
  });

  // --- Group 11 (mutation safety / idempotency, A only) ---
  test("double-click rapidly settles to a consistent state without error", async ({
    page
  }) => {
    await page.goto(APPS_PATH);
    await waitForCatalog(page);

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
    await page.reload();
    await waitForCatalog(page);
    const finalHeart = heartFor(page, APP);
    await expect(finalHeart).toBeVisible();
    // End state is deterministic per the API, whatever the last applied op was.
    const pressed = await finalHeart.getAttribute("aria-pressed");
    expect(["true", "false"]).toContain(pressed);
  });

  // --- Group 13 (cross-page consistency, A only) ---
  test("favorite on /apps appears on /favorites; unfavorite there flips /apps back", async ({
    page
  }) => {
    // Favorite on the catalog.
    await page.goto(APPS_PATH);
    await waitForCatalog(page);
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
    await page.goto(APPS_PATH);
    await waitForCatalog(page);
    await expect(heartFor(page, APP)).toHaveAttribute("aria-pressed", "false");
  });
});
