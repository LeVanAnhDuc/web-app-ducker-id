import type { APIRequestContext } from "@playwright/test";
import { request } from "@playwright/test";

import { MongoClient, ObjectId } from "mongodb";
import {
  BASE_URL,
  MONGO_DB_NAME,
  MONGO_URL,
  USER_EMAIL,
  USER_PASSWORD
} from "./env";
import { THROWAWAY_DOMAIN } from "./accounts";

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
let cachedAt = 0;
// Access tokens live 15 minutes and one worker runs the whole suite, so a
// token cached by an early spec would be dead by a late one. Re-login after 10.
const TOKEN_MAX_AGE_MS = 10 * 60 * 1000;

async function withApi<T>(
  fn: (ctx: APIRequestContext, headers: Record<string, string>) => Promise<T>
): Promise<T> {
  const ctx = await request.newContext({ baseURL: BASE_URL });
  try {
    if (!cachedToken || Date.now() - cachedAt > TOKEN_MAX_AGE_MS) {
      cachedToken = await login(ctx);
      cachedAt = Date.now();
    }
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

// ── Direct database access (throwaway accounts only) ───────────────────────

/**
 * Moves a throwaway user's last use of an app `ms` into the past, so a test
 * can step across the server's 60-second dedupe window without waiting.
 * Refuses any account outside the throwaway domain.
 */
export async function ageRecentUse(
  email: string,
  appId: string,
  ms: number
): Promise<void> {
  if (!email.endsWith(`@${THROWAWAY_DOMAIN}`))
    throw new Error(`ageRecentUse: ${email} is not a throwaway account`);
  const client = new MongoClient(MONGO_URL);
  await client.connect();
  try {
    const d = client.db(MONGO_DB_NAME);
    const user = await d
      .collection("users")
      .findOne({ email: email.toLowerCase() });
    if (!user) throw new Error(`ageRecentUse: no user ${email}`);
    const row = await d.collection("user_app_usages").findOne({
      userId: user._id,
      webAppId: new ObjectId(appId)
    });
    if (!row) throw new Error(`ageRecentUse: no usage row for ${appId}`);
    await d
      .collection("user_app_usages")
      .updateOne(
        { _id: row._id },
        { $set: { lastUsedAt: new Date(row.lastUsedAt.getTime() - ms) } }
      );
  } finally {
    await client.close();
  }
}
