import type { Page, Response } from "@playwright/test";
import { API_PREFIX } from "@/config/urls";

// Shared by the favorites e2e specs: the browser's calls to
// /users/me/favorites, as waits and as page.route stubs.

const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");
const FAVORITES_PATH = `${API_PREFIX}/users/me/favorites`;
const F = escape(FAVORITES_PATH);

/** GET /users/me/favorites (the list, with or without a query). */
export const LIST_RE = new RegExp(`${F}(\\?|$)`);
/** POST / DELETE /users/me/favorites/:appId. */
export const TOGGLE_RE = new RegExp(`${F}/[^/?]+$`);

/** True for any request to a single favourite (POST / DELETE …/:appId). */
export const isToggleUrl = (url: string): boolean =>
  url.includes(`${FAVORITES_PATH}/`);

/** The next successful GET of the favourites list. */
export const waitForFavoritesList = (page: Page): Promise<Response> =>
  page.waitForResponse(
    (r) =>
      r.url().includes(FAVORITES_PATH) &&
      r.request().method() === "GET" &&
      r.status() === 200
  );

/**
 * The next POST (star) or DELETE (unstar) of a favourite. Bounded well below
 * the test timeout: a toggle that never leaves the browser must fail as an
 * assertion, not time the whole test out (which `test.fail()` does not accept).
 */
export const waitForToggle = (
  page: Page,
  method: "POST" | "DELETE"
): Promise<Response> =>
  page.waitForResponse(
    (r) => isToggleUrl(r.url()) && r.request().method() === method,
    { timeout: 10_000 }
  );

const serverError = (path: string) => ({
  status: 500,
  contentType: "application/json",
  body: JSON.stringify({
    code: "INTERNAL_ERROR",
    message: "boom",
    timestamp: new Date().toISOString(),
    path
  })
});

/** Every POST /users/me/favorites/:appId answers 500; DELETE goes through. */
export async function failStarring(page: Page): Promise<void> {
  await page.route(TOGGLE_RE, (route) =>
    route.request().method() === "POST"
      ? route.fulfill(serverError(FAVORITES_PATH))
      : route.continue()
  );
}

/** Every GET of the favourites list answers 500 (React Query retries included). */
export async function failListing(page: Page): Promise<void> {
  await page.route(LIST_RE, (route) =>
    route.request().method() === "GET"
      ? route.fulfill(serverError(FAVORITES_PATH))
      : route.continue()
  );
}
