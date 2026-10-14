import type { APIResponse } from "@playwright/test";
import { MongoClient, ObjectId } from "mongodb";
import { createApiClient, type ApiClient } from "@/api";
import { bearerHeaders, newContext, type Session } from "@/api/base.client";
import type { RecentAppItem, RecentAppsPage } from "@/api/recent-app.client";
import { dataOf, sessionOf } from "@/api/response";
import { USER } from "@/config/accounts";
import { MONGO_DB_NAME, MONGO_URL } from "@/config/datastores";
import { API_PREFIX } from "@/config/urls";
import { THROWAWAY_DOMAIN } from "@/data/test-data";
import { escapeRegExp } from "./regex";

// Recently used (/users/me/recent-apps) as the specs need it — moved from
// helpers/recentApps.ts:
//   - the seeded user's history, snapshotted and replayed over the API by the
//     browser suite (recently-used has no seeder). Replaying resets each app's
//     open count to 1, which no other suite asserts on;
//   - `ageRecentUse`, which steps a throwaway account across the server's
//     60-second dedupe window in MongoDB instead of waiting;
//   - the list URL the browser calls, and the body a stubbed list returns.
//
// Used by: tests/{e2e,api}/recently-used/*, tests/api/home/stats.api.ts.

/** Path of the history endpoint the browser calls (`/api/v1/users/me/recent-apps`). */
export const RECENT_APPS_PATH = `${API_PREFIX}/users/me/recent-apps`;
/** The list URL, with or without a query — never `/:appId` or `/stats`. */
export const RECENT_APPS_LIST_URL = new RegExp(
  `${escapeRegExp(RECENT_APPS_PATH)}(\\?|$)`
);

// ── The seeded user's history (browser suite setup / teardown) ─────────────

// Cached for the worker: logging in on every call exhausts the login rate
// limit (30 / 15 min per IP). Access tokens live 15 minutes and one worker
// runs the whole suite — re-login after 10.
const TOKEN_MAX_AGE_MS = 10 * 60 * 1000;
let cached: { session: Session; at: number } | null = null;

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

async function ok(what: string, res: APIResponse): Promise<void> {
  if (!res.ok())
    throw new Error(`${what}: ${res.status()} ${await res.text()}`);
}

/** user@test.com's visible history, newest first (up to 100 rows). */
export function getRecentApps(): Promise<RecentAppItem[]> {
  return asUser(async (api) => {
    const res = await api.recentApps.list({ limit: 100 });
    await ok("getRecentApps", res);
    return (await dataOf<RecentAppsPage>(res)).items;
  });
}

/** Hides every row of user@test.com's history. */
export function clearRecentApps(): Promise<void> {
  return asUser(async (api) =>
    ok("clearRecentApps", await api.recentApps.clear())
  );
}

/**
 * Records launches in the given order, so the LAST id ends up newest. Rows
 * written within the dedupe window still move to the top; only the count is
 * held back, which is why each id is recorded once.
 */
export function recordRecentApps(appIds: string[]): Promise<void> {
  return asUser(async (api) => {
    for (const id of appIds) {
      await ok(`recordRecentApps ${id}`, await api.recentApps.record(id));
    }
  });
}

/** Restores a snapshot taken with getRecentApps (newest-first order). */
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

// ── Stubbed list bodies (states live data cannot produce) ──────────────────

/** Stub row `i`: a fixed 24-hex id, "Stub App <i>", opened once just now. */
export const recentStubItem = (
  i: number,
  over: Partial<RecentAppItem> = {}
): RecentAppItem => ({
  _id: `64b7f0c2f1a2b3c4d5e6f7${String(i).padStart(2, "0")}`,
  displayName: `Stub App ${i}`,
  description: null,
  iconUrl: null,
  homeUrl: "https://example.com",
  categories: [],
  isFavorite: false,
  lastUsedAt: new Date().toISOString(),
  useCount: 1,
  ...over
});

/** The success envelope of GET /users/me/recent-apps around `items`. */
export const recentAppsBody = (
  items: RecentAppItem[],
  meta: RecentAppsPage["meta"] = {
    total: items.length,
    page: 1,
    limit: 20,
    totalPages: 1
  }
): string =>
  JSON.stringify({
    timestamp: new Date().toISOString(),
    path: RECENT_APPS_PATH,
    message: "ok",
    data: { items, meta }
  });
