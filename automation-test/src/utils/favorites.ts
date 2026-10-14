import type { APIResponse } from "@playwright/test";
import { createApiClient, type ApiClient } from "@/api";
import { bearerHeaders, newContext, type Session } from "@/api/base.client";
import { dataOf, sessionOf } from "@/api/response";
import type { CatalogApp, CatalogPage } from "@/api/web-app.client";
import { USER } from "@/config/accounts";

// The seeded user's favourites and catalogue, read and written over the API
// for the browser specs' setup / teardown (moved from helpers/favorites.ts).
// The user-facing behaviour itself is exercised through the UI; these only
// put user@test.com's favourites into a known state and back. Every spec that
// changes them snapshots `getFavoriteIds()` first and restores the snapshot
// with `setFavorites()` (idempotent) in afterAll.
//
// Used by: tests/e2e/favorites/*, tests/e2e/recently-used/recently-used.e2e.ts.

// The session is cached for the worker: logging in on every call exhausts the
// login rate limit (30 / 15 min per IP) across the suite's hooks. Access
// tokens live 15 minutes and one worker runs the whole suite, so a token
// cached by an early spec would be dead by a late one — re-login after 10.
const TOKEN_MAX_AGE_MS = 10 * 60 * 1000;
let cached: { session: Session; at: number } | null = null;

/** Runs `fn` with a client that carries the seeded user's Bearer token. */
async function asUser<T>(fn: (api: ApiClient) => Promise<T>): Promise<T> {
  if (!cached || Date.now() - cached.at > TOKEN_MAX_AGE_MS) {
    const login = await newContext();
    try {
      const res = await createApiClient(login).auth.login(
        USER.email,
        USER.password
      );
      cached = { session: await sessionOf(res), at: Date.now() };
    } finally {
      await login.dispose();
    }
  }
  const ctx = await newContext(bearerHeaders(cached.session));
  try {
    return await fn(createApiClient(ctx));
  } finally {
    await ctx.dispose();
  }
}

/** Throws with the response's status and body unless it is a 2xx. */
async function ok<T>(what: string, res: APIResponse): Promise<T> {
  if (!res.ok()) {
    throw new Error(`${what}: ${res.status()} ${await res.text()}`);
  }
  return dataOf<T>(res);
}

/**
 * displayName → _id of every app user@test.com currently sees in GET /apps.
 * Specs pick apps from it (sorted by name) instead of naming seed apps.
 */
export function getCatalogIdsByName(): Promise<Record<string, string>> {
  return asUser(async (api) => {
    const data = await ok<CatalogPage>(
      "getCatalogIdsByName",
      await api.webApps.list({ limit: 100 })
    );
    return Object.fromEntries(
      data.items.map((app: CatalogApp) => [app.displayName, app._id])
    );
  });
}

/** user@test.com's favourite app ids, newest first (GET /users/me/favorites). */
export function getFavoriteIds(): Promise<string[]> {
  return asUser(async (api) => {
    const data = await ok<{ items: CatalogApp[] }>(
      "getFavoriteIds",
      await api.favorites.list()
    );
    return data.items.map((app) => app._id);
  });
}

/**
 * Makes user@test.com's favourites exactly `desiredIds` (idempotent): removes
 * anything extra, then adds what is missing in the order given — so
 * `setFavorites([a])`, `setFavorites([a, b])` stars a before b. POST and
 * DELETE are both idempotent on the server, so re-running is safe.
 */
export function setFavorites(desiredIds: string[]): Promise<void> {
  return asUser(async (api) => {
    const current = (
      await ok<{ items: CatalogApp[] }>(
        "setFavorites: list",
        await api.favorites.list()
      )
    ).items.map((app) => app._id);
    const desired = new Set(desiredIds);
    for (const id of current) {
      if (!desired.has(id)) await api.favorites.remove(id);
    }
    for (const id of desiredIds) {
      if (!current.includes(id)) await api.favorites.add(id);
    }
  });
}
