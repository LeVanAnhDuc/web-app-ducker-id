import type { APIRequestContext } from "@playwright/test";
import { request } from "@playwright/test";

import { BASE_URL, USER_EMAIL, USER_PASSWORD } from "./env";

// Setup/teardown helpers for the recently-used E2E suite. Same fresh-login
// pattern as helpers/favorites.ts: a bare request context cannot reuse the
// page's storageState, so we mint a bearer token once and cache it.
//
// Recently used has no seeder. The suite snapshots the user's visible history
// in beforeAll and replays it in afterAll (oldest first, so the order comes
// back). Replaying resets each app's open count to 1, which no other suite
// asserts on.

async function login(ctx: APIRequestContext): Promise<string> {
  const res = await ctx.post("/api/v1/auth/login", {
    data: { email: USER_EMAIL, password: USER_PASSWORD }
  });
  if (!res.ok())
    throw new Error(`recentApps helper: login failed (${res.status()})`);
  const body = (await res.json()) as { data?: { accessToken?: string } };
  const token = body?.data?.accessToken;
  if (!token) throw new Error("recentApps helper: no access token");
  return token;
}

let cachedToken: string | null = null;

async function withApi<T>(
  fn: (ctx: APIRequestContext, headers: Record<string, string>) => Promise<T>
): Promise<T> {
  const ctx = await request.newContext({ baseURL: BASE_URL });
  try {
    if (!cachedToken) cachedToken = await login(ctx);
    return await fn(ctx, { Authorization: `Bearer ${cachedToken}` });
  } finally {
    await ctx.dispose();
  }
}

interface RecentAppItem {
  _id: string;
  displayName: string;
  useCount: number;
}

export async function getRecentApps(): Promise<RecentAppItem[]> {
  return withApi(async (ctx, headers) => {
    const res = await ctx.get("/api/v1/users/me/recent-apps", {
      headers,
      params: { limit: 100 }
    });
    if (!res.ok()) throw new Error(`getRecentApps: failed (${res.status()})`);
    const body = (await res.json()) as { data?: { items?: RecentAppItem[] } };
    return body.data?.items ?? [];
  });
}

export async function clearRecentApps(): Promise<void> {
  await withApi(async (ctx, headers) => {
    const res = await ctx.delete("/api/v1/users/me/recent-apps", { headers });
    if (!res.ok()) throw new Error(`clearRecentApps: failed (${res.status()})`);
  });
}

// Records launches in the given order, so the LAST id ends up newest. Rows
// written within the BE dedupe window still move to the top; only the count
// is held back, which is why each id is recorded once.
export async function recordRecentApps(appIds: string[]): Promise<void> {
  await withApi(async (ctx, headers) => {
    for (const id of appIds) {
      const res = await ctx.post(`/api/v1/users/me/recent-apps/${id}`, {
        headers
      });
      if (!res.ok())
        throw new Error(`recordRecentApps: ${id} failed (${res.status()})`);
    }
  });
}

/** Restore a snapshot taken with getRecentApps (newest-first order). */
export async function restoreRecentApps(
  snapshot: RecentAppItem[]
): Promise<void> {
  await clearRecentApps();
  await recordRecentApps(snapshot.map((a) => a._id).reverse());
}
