import type { APIRequestContext, Page } from "@playwright/test";
import { request, expect } from "@playwright/test";
import {
  BASE_URL,
  USER_AUTH_FILE as AUTH_FILE,
  USER_EMAIL as EMAIL,
  USER_PASSWORD as DEFAULT_PASSWORD
} from "./env";

const CHANGE_PASSWORD_PATH = "/auth/change-password";

/** Tracks whether a PATCH /auth/change-password request was fired by the page. */
export interface PatchTracker {
  patchCalled: boolean;
}

/**
 * Starts listening for PATCH /auth/change-password requests on the given page.
 * Use with `expectNoPatch` to assert client-side validation blocked the call.
 */
export function trackPatch(page: Page): PatchTracker {
  const tracker: PatchTracker = { patchCalled: false };
  page.on("request", (r) => {
    if (r.method() === "PATCH" && r.url().includes(CHANGE_PASSWORD_PATH)) {
      tracker.patchCalled = true;
    }
  });
  return tracker;
}

/** Asserts that no PATCH /auth/change-password request was fired. */
export function expectNoPatch(tracker: PatchTracker): void {
  expect(tracker.patchCalled).toBe(false);
}

const CHANGE_PASSWORD_GLOB = "**/api/v1/auth/change-password";

export interface MockChangePasswordOptions {
  /** HTTP status the mocked PATCH should return. */
  status: number;
  /** JSON body the mocked PATCH should return. */
  body: Record<string, unknown>;
  /** Optional delay (ms) before fulfilling — used to assert in-flight UI. */
  delayMs?: number;
}

/**
 * Intercepts PATCH /api/v1/auth/change-password and fulfills it with a mocked
 * response, so the test asserts the FE's handling of a given server response
 * WITHOUT issuing a real PATCH (which would consume the BE rate-limit bucket:
 * 5 requests / IP+user / 900s). Non-PATCH requests (and other methods) pass
 * through untouched. Call `page.unroute(CHANGE_PASSWORD_GLOB)` after asserting.
 */
export async function mockChangePassword(
  page: Page,
  { status, body, delayMs }: MockChangePasswordOptions
): Promise<void> {
  await page.route(CHANGE_PASSWORD_GLOB, async (route) => {
    if (route.request().method() !== "PATCH") return route.continue();
    if (delayMs) await new Promise((resolve) => setTimeout(resolve, delayMs));
    return route.fulfill({
      status,
      contentType: "application/json",
      body: JSON.stringify(body)
    });
  });
}

/**
 * Re-establishes the shared auth storageState after a REAL password change.
 *
 * A real change-password bumps the user's `passwordChangedAt`, which REVOKES
 * every refresh token issued before it — including the one captured by
 * `auth.setup.ts` into `e2e/.auth/user.json`. Because every test builds a fresh
 * browser context from that file, the FIRST real change would otherwise log out
 * every subsequent browser test (SessionGate's /token/refresh 401s -> /login).
 *
 * Call this RIGHT AFTER any real change (with the password the seed user is
 * currently at) to log in fresh via the page's request context and overwrite
 * `e2e/.auth/user.json` with a valid refresh cookie, so the serial chain stays
 * authenticated. See reference_e2e_suite_session_contamination.
 */
export async function reestablishStorageState(
  page: Page,
  currentPassword: string
): Promise<void> {
  const res = await page.request.post("/api/v1/auth/login", {
    data: { email: EMAIL, password: currentPassword }
  });
  expect(
    res.ok(),
    `reestablishStorageState: login with the post-change password failed (${res.status()})`
  ).toBeTruthy();
  await page.context().storageState({ path: AUTH_FILE });
}

async function tryLogin(
  ctx: APIRequestContext,
  password: string
): Promise<string | null> {
  const res = await ctx.post("/api/v1/auth/login", {
    data: { email: EMAIL, password }
  });
  if (!res.ok()) return null;
  const body = (await res.json()) as { data?: { accessToken?: string } };
  return body?.data?.accessToken ?? null;
}

// Every non-default password any spec in this suite may set. ensureDefaultPassword
// tries DEFAULT_PASSWORD first, then each of these, so the revert succeeds no
// matter which test left the seed user in a non-default state (or aborted
// mid-way through a serial block). Keep this list in sync with the spec.
export const KNOWN_CANDIDATE_PASSWORDS: readonly string[] = [
  "NewPass@123", // NEW_PASSWORD — happy path, error/loading mocks, double-submit
  "Ab@3xyzz" // 8-char boundary value
];

// Restore the seed user's password to DEFAULT_PASSWORD.
// Robust revert: log in with DEFAULT_PASSWORD first (no-op if already restored);
// otherwise try each candidate password (the explicit `currentGuess` plus the
// suite-wide KNOWN_CANDIDATE_PASSWORDS) and change back from whichever works.
// Accepts a single guess or a list; pass the full candidate list from afterAll.
export async function ensureDefaultPassword(
  currentGuess: string | readonly string[] = []
): Promise<void> {
  const guesses = Array.isArray(currentGuess)
    ? currentGuess
    : [currentGuess as string];
  // De-duplicate while preserving order: explicit guess(es) first, then the
  // suite-wide known candidates.
  const candidates = Array.from(
    new Set([...guesses, ...KNOWN_CANDIDATE_PASSWORDS].filter(Boolean))
  );

  const ctx = await request.newContext({ baseURL: BASE_URL });
  try {
    // Already at default -> nothing to do but refresh the shared auth file: a
    // prior real change in this describe may have revoked the refresh token
    // captured by auth.setup, so re-save a fresh DEFAULT-based storageState.
    if (await tryLogin(ctx, DEFAULT_PASSWORD)) {
      await ctx.storageState({ path: AUTH_FILE });
      return;
    }

    for (const candidate of candidates) {
      if (candidate === DEFAULT_PASSWORD) continue;
      const token = await tryLogin(ctx, candidate);
      if (!token) continue;
      const res = await ctx.patch("/api/v1/auth/change-password", {
        headers: { Authorization: `Bearer ${token}` },
        data: {
          currentPassword: candidate,
          newPassword: DEFAULT_PASSWORD,
          confirmPassword: DEFAULT_PASSWORD
        }
      });
      if (res.ok()) {
        // Log in fresh as DEFAULT (the change above rotated/revoked tokens) and
        // overwrite the shared auth file so the next browser context is authed.
        await tryLogin(ctx, DEFAULT_PASSWORD);
        await ctx.storageState({ path: AUTH_FILE });
        return;
      }
      // 4xx here means the candidate logged in but the change was rejected;
      // keep trying the remaining candidates before giving up.
    }

    throw new Error(
      "ensureDefaultPassword: could not restore default password from any known candidate"
    );
  } finally {
    await ctx.dispose();
  }
}
