import type { APIRequestContext } from "@playwright/test";
import { request } from "@playwright/test";
import { MongoClient, ObjectId } from "mongodb";
import {
  BASE_URL,
  ADMIN_EMAIL as EMAIL,
  ADMIN_PASSWORD as PASSWORD,
  MONGO_DB_NAME,
  MONGO_URL
} from "./env";

// Admin app registry helpers.
//
// There is no API to delete an app, so:
//   * specs that EDIT go through seeded apps and put them back (`restoreApp`);
//   * specs that CREATE name every app `e2e-…` (`e2eAppName`) and remove it
//     straight from MongoDB afterwards (`deleteE2EApps`). Seeded apps never
//     match the prefix, so the delete cannot touch seed data.
//
// Apps a spec creates are `inactive` + `admin`-only unless the test needs
// otherwise, so a regular user's /apps never shows them even for the few
// seconds they exist.

type AppDto = {
  _id: string;
  name: string;
  displayName: string;
  status: "active" | "inactive";
};

export const ADMIN_APPS_API = "/api/v1/admin/apps";
export const E2E_APP_PREFIX = "e2e-";

async function adminToken(ctx: APIRequestContext): Promise<string> {
  const res = await ctx.post("/api/v1/auth/login", {
    data: { email: EMAIL, password: PASSWORD }
  });
  const body = (await res.json()) as { data?: { accessToken?: string } };
  const token = body?.data?.accessToken;
  if (!token) throw new Error("adminApps helper: admin login failed");
  return token;
}

export async function restoreApp(
  appName: string,
  displayName: string,
  status: "active" | "inactive"
): Promise<void> {
  const ctx = await request.newContext({ baseURL: BASE_URL });
  try {
    const token = await adminToken(ctx);
    const auth = { Authorization: `Bearer ${token}` };
    const listRes = await ctx.get(ADMIN_APPS_API, { headers: auth });
    const list = (await listRes.json()) as { data?: { items?: AppDto[] } };
    const app = list?.data?.items?.find((a) => a.name === appName);
    if (!app) throw new Error(`restoreApp: app "${appName}" not found`);
    const res = await ctx.patch(`${ADMIN_APPS_API}/${app._id}`, {
      headers: auth,
      data: { displayName, status }
    });
    if (!res.ok())
      throw new Error(`restoreApp: revert failed (${res.status()})`);
  } finally {
    await ctx.dispose();
  }
}

let counter = 0;

/** A fresh app `name` (lowercase, hyphens) that the cleanup will match. */
export function e2eAppName(label = "app"): string {
  counter += 1;
  const safe = label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .slice(0, 20);
  return `${E2E_APP_PREFIX}${safe}-${Date.now().toString(36)}${counter}`;
}

/** A create body that passes every server rule; override what a test varies. */
export function appBody(
  categoryIds: string[],
  overrides: Record<string, unknown> = {}
): Record<string, unknown> {
  const name = (overrides.name as string | undefined) ?? e2eAppName();
  return {
    name,
    displayName: `E2E ${name}`,
    description: "Created by the regression suite",
    homeUrl: "https://e2e.example.com",
    categoryIds,
    status: "inactive",
    requiredRoles: ["admin"],
    redirectUris: ["https://e2e.example.com/callback"],
    ...overrides
  };
}

/** Ids of the categories that exist right now, in display order. */
export async function categoryIds(api: APIRequestContext): Promise<string[]> {
  const res = await api.get("/api/v1/admin/categories");
  const { data } = (await res.json()) as { data: { _id: string }[] };
  return data.map((c) => c._id);
}

/** Every app the admin list returns. */
export async function listApps(
  api: APIRequestContext,
  query = ""
): Promise<(AppDto & Record<string, unknown>)[]> {
  const res = await api.get(`${ADMIN_APPS_API}${query}`);
  const body = (await res.json()) as { data: { items: AppDto[] } };
  return body.data.items as (AppDto & Record<string, unknown>)[];
}

// ── Direct database access (cleanup and read-only checks) ──────────────────

async function withDb<T>(
  fn: (db: ReturnType<MongoClient["db"]>) => Promise<T>
): Promise<T> {
  const client = new MongoClient(MONGO_URL);
  await client.connect();
  try {
    return await fn(client.db(MONGO_DB_NAME));
  } finally {
    await client.close().catch(() => undefined);
  }
}

/** The raw `web_apps` document — for fields the admin DTO does not expose. */
export async function findAppDoc(name: string) {
  return withDb((db) => db.collection("web_apps").findOne({ name }));
}

/**
 * Deletes every app named `e2e-…` and the favourites / usage rows that point
 * at it. Returns how many apps went.
 */
export async function deleteE2EApps(): Promise<number> {
  return withDb(async (db) => {
    const apps = await db
      .collection("web_apps")
      // `e2` is the 2-character name the length BVA registers before renaming.
      .find({ name: { $regex: `^(${E2E_APP_PREFIX}|e2$)` } })
      .project<{ _id: ObjectId }>({ _id: 1 })
      .toArray();
    if (apps.length === 0) return 0;
    const ids = apps.map((a) => a._id);
    await Promise.all([
      db.collection("user_favorites").deleteMany({ webAppId: { $in: ids } }),
      db.collection("user_app_usages").deleteMany({ webAppId: { $in: ids } })
    ]);
    await db.collection("web_apps").deleteMany({ _id: { $in: ids } });
    return apps.length;
  });
}
