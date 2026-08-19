import type { APIRequestContext } from "@playwright/test";
import { request } from "@playwright/test";

// Shared config + API helpers for the favorite-apps E2E suite. Mirrors the
// env-override + fresh-login pattern in helpers/notifications.ts: the page's
// storageState cookie is not directly reusable from a bare request context, so
// we log in via password to mint a fresh bearer token for direct API calls.
//
// These helpers exist for SETUP/TEARDOWN only (seed a known favorites state,
// then restore it) — the user-facing behaviour itself is exercised through the
// UI in the spec files. Favorites have NO seeder, so the seed user starts with
// ZERO favorites; every test that adds a favorite must remove it again so the
// shared user state stays clean (idempotent revert in afterAll).

import { BASE_URL, USER_EMAIL, USER_PASSWORD } from "./env";
export { BASE_URL, USER_EMAIL, USER_PASSWORD };

// Seeded, user-visible, ACTIVE apps (server seeder data/web-apps.ts). The auth
// user has the `user` role, so these three are the catalog they can favorite.
// Admin-only (Analytics Dashboard, Operations Console) and inactive (Team
// Calendar) apps are intentionally NOT here.
export const USER_APP_NAMES = ["Blog", "IDMS Portal", "Notes"] as const;

async function login(ctx: APIRequestContext): Promise<string> {
  const res = await ctx.post("/api/v1/auth/login", {
    data: { email: USER_EMAIL, password: USER_PASSWORD }
  });
  if (!res.ok())
    throw new Error(`favorites helper: login failed (${res.status()})`);
  const body = (await res.json()) as { data?: { accessToken?: string } };
  const token = body?.data?.accessToken;
  if (!token) throw new Error("favorites helper: no access token in response");
  return token;
}

// Cache the bearer token module-wide: logging in on every helper call exhausts
// the BE login rate-limit (30 / 15 min) across the suite's setup/teardown hooks.
let cachedToken: string | null = null;

async function withApi<T>(
  fn: (ctx: APIRequestContext, token: string) => Promise<T>
): Promise<T> {
  const ctx = await request.newContext({ baseURL: BASE_URL });
  try {
    if (!cachedToken) cachedToken = await login(ctx);
    return await fn(ctx, cachedToken);
  } finally {
    await ctx.dispose();
  }
}

interface FavoriteApp {
  _id: string;
  displayName: string;
}

// Returns the displayName → _id map of the apps currently visible to the user
// in the catalog. Lets specs reference apps by their stable seed name without
// hard-coding ObjectIds.
export async function getCatalogIdsByName(): Promise<Record<string, string>> {
  return withApi(async (ctx, token) => {
    const res = await ctx.get("/api/v1/apps", {
      headers: { Authorization: `Bearer ${token}` },
      params: { limit: 100 }
    });
    if (!res.ok())
      throw new Error(`getCatalogIdsByName: failed (${res.status()})`);
    const body = (await res.json()) as { data?: { items?: FavoriteApp[] } };
    const map: Record<string, string> = {};
    for (const app of body.data?.items ?? []) map[app.displayName] = app._id;
    return map;
  });
}

// Current favorite app ids for the user (read straight from the API).
export async function getFavoriteIds(): Promise<string[]> {
  return withApi(async (ctx, token) => {
    const res = await ctx.get("/api/v1/users/me/favorites", {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok()) throw new Error(`getFavoriteIds: failed (${res.status()})`);
    const body = (await res.json()) as { data?: { items?: FavoriteApp[] } };
    return (body.data?.items ?? []).map((a) => a._id);
  });
}

// Force the user's favorites to be exactly `desiredIds` (idempotent). Used by
// afterAll to restore the original state regardless of what the test left
// behind: removes anything extra, adds anything missing. POST/DELETE are both
// idempotent on the BE (unique index + hard delete), so re-running is safe.
export async function setFavorites(desiredIds: string[]): Promise<void> {
  await withApi(async (ctx, token) => {
    const headers = { Authorization: `Bearer ${token}` };
    const current = await (async () => {
      const res = await ctx.get("/api/v1/users/me/favorites", { headers });
      if (!res.ok())
        throw new Error(`setFavorites: list failed (${res.status()})`);
      const body = (await res.json()) as { data?: { items?: FavoriteApp[] } };
      return (body.data?.items ?? []).map((a) => a._id);
    })();
    const desired = new Set(desiredIds);
    for (const id of current) {
      if (!desired.has(id)) {
        await ctx.delete(`/api/v1/users/me/favorites/${id}`, { headers });
      }
    }
    for (const id of desiredIds) {
      if (!current.includes(id)) {
        await ctx.post(`/api/v1/users/me/favorites/${id}`, { headers });
      }
    }
  });
}

// Convenience: clear all favorites (used to reach the zero-favorites empty
// state safely, then restore via setFavorites(original) in afterAll).
export async function clearFavorites(): Promise<void> {
  await setFavorites([]);
}
