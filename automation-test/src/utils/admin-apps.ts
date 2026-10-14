import type { APIResponse } from "@playwright/test";
import { MongoClient, ObjectId } from "mongodb";
import { createApiClient, type ApiClient } from "@/api";
import type {
  AdminApp,
  AdminAppList,
  AdminAppsQuery,
  AdminAppStatus
} from "@/api/admin-apps.client";
import type { CatalogCategory } from "@/api/category.client";
import { dataOf } from "@/api/response";
import { adminContext } from "@/api/session";
import { MONGO_DB_NAME, MONGO_URL } from "@/config/datastores";
import { E2E_APP_PREFIX } from "@/data/test-data";

// The app registry (module ADMINAPPS) — what the admin API cannot do.
//
// There is no API to delete an app, so:
//   * specs that EDIT go through seeded apps and put them back;
//   * specs that CREATE name every app `e2e-…` (`e2eAppName`) and remove it
//     straight from MongoDB afterwards (`deleteE2EApps`). Seeded apps never
//     match the prefix, so the delete cannot touch seed data.
//
// Apps a spec creates are `inactive` + `admin`-only unless the test needs
// otherwise (`adminAppBody`), so a regular user's /apps never shows them even
// for the few seconds they exist.

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
export function adminAppBody(
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

// ── Reads and restores over the admin API ──────────────────────────────────

/** Throws with the response's status and body unless it is a 2xx. */
async function ok<T>(what: string, res: APIResponse): Promise<T> {
  if (!res.ok()) {
    throw new Error(`${what}: ${res.status()} ${await res.text()}`);
  }
  return dataOf<T>(res);
}

/** Every app GET /admin/apps returns for `params` (the registry is unpaginated). */
export async function listAdminApps(
  api: ApiClient,
  params: AdminAppsQuery = {}
): Promise<AdminApp[]> {
  const data = await ok<AdminAppList>(
    "GET /admin/apps",
    await api.adminApps.list(params)
  );
  return data.items;
}

/** Every category, in display order (public list: same set and order as the admin one). */
export async function listCategories(
  api: ApiClient
): Promise<CatalogCategory[]> {
  return ok<CatalogCategory[]>(
    "GET /apps/categories",
    await api.categories.listPublic()
  );
}

/** Ids of the categories that exist right now, in display order. */
export async function categoryIds(api: ApiClient): Promise<string[]> {
  return (await listCategories(api)).map((c) => c._id);
}

/** slug → _id of every category. */
export async function categoryIdsBySlug(
  api: ApiClient
): Promise<Record<string, string>> {
  return Object.fromEntries(
    (await listCategories(api)).map((c) => [c.slug, c._id])
  );
}

/**
 * Puts a seeded app's display name and status back (not its `name`), as the
 * seeded admin — for `afterEach` / `afterAll`, where fixtures are gone.
 */
export async function restoreApp(
  appName: string,
  displayName: string,
  status: AdminAppStatus
): Promise<void> {
  const ctx = await adminContext();
  try {
    const api = createApiClient(ctx);
    const app = (await listAdminApps(api)).find((a) => a.name === appName);
    if (!app) throw new Error(`restoreApp: app "${appName}" not found`);
    const res = await api.adminApps.update(app._id, { displayName, status });
    if (!res.ok())
      throw new Error(`restoreApp: revert failed (${res.status()})`);
  } finally {
    await ctx.dispose();
  }
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
 * at it, plus the APP_AVAILABLE notifications its activation broadcast
 * (dedupeKey `app:<id>`, server web-app/services/shared/announce-app.ts) so
 * the seeded users' inboxes keep only their seed rows. Returns how many apps
 * went.
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
      db.collection("user_app_usages").deleteMany({ webAppId: { $in: ids } }),
      db.collection("notifications").deleteMany({
        dedupeKey: { $in: ids.map((id) => `app:${id.toString()}`) }
      })
    ]);
    await db.collection("web_apps").deleteMany({ _id: { $in: ids } });
    return apps.length;
  });
}
