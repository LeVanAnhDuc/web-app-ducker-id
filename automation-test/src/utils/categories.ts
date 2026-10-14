import type { APIResponse } from "@playwright/test";
import type { ApiClient } from "@/api";
import type { AdminApp, AdminAppList } from "@/api/admin-apps.client";
import type {
  AdminCategory,
  CategoryName,
  DeleteImpact,
  MoveDirection
} from "@/api/admin-categories.client";
import { dataOf } from "@/api/response";
import { E2E_CATEGORY_PREFIX } from "@/data/test-data";

// Categories (module ADMINCATEGORIES) as setup and cleanup need them, over the
// admin API — `api` is a client on a context that carries an admin Bearer
// (`createApiClient(await adminContext())` in beforeAll).
//
// Every mutation a spec makes is undone in afterAll: there is no API to
// delete an app, so specs BORROW seeded apps (snapshot their categoryIds,
// change them, restore the snapshot) and only ever delete categories they
// created — all named `E2E …` (`uniqueName`), which no seeded category is.

/** A fresh category name the cleanup will match: `E2E <label> <time>`. */
export const uniqueName = (label: string): string =>
  `${E2E_CATEGORY_PREFIX}${label} ${Date.now().toString(36)}`;

const RETRYABLE = new Set([429, 500, 502, 503]);

/** Cleanup must not die halfway on a transient 429 / 5xx (design §6 seed notes). */
async function withRetry(send: () => Promise<APIResponse>) {
  let res = await send();
  for (let i = 0; i < 3 && RETRYABLE.has(res.status()); i += 1) {
    await new Promise((resolve) => setTimeout(resolve, 1500 * (i + 1)));
    res = await send();
  }
  return res;
}

// ── Categories ────────────────────────────────────────────────────────────

/** Every category, in display order (GET /admin/categories). */
export async function listAdminCategories(
  api: ApiClient
): Promise<AdminCategory[]> {
  return dataOf<AdminCategory[]>(
    await withRetry(() => api.adminCategories.list())
  );
}

export async function categoryBySlug(
  api: ApiClient,
  slug: string
): Promise<AdminCategory> {
  const found = (await listAdminCategories(api)).find((c) => c.slug === slug);
  if (!found) throw new Error(`category ${slug} not found`);
  return found;
}

/** Creates a category; throws unless the answer is 201. */
export async function createCategory(
  api: ApiClient,
  name: CategoryName
): Promise<AdminCategory> {
  const res = await withRetry(() => api.adminCategories.create({ name }));
  if (res.status() !== 201) {
    throw new Error(`create category failed: ${res.status()}`);
  }
  return dataOf<AdminCategory>(res);
}

/**
 * Deletes a category the spec created, moving its orphans to `fallbackId`.
 * Already gone (404) is fine.
 */
export async function removeCategory(
  api: ApiClient,
  id: string,
  fallbackId?: string
): Promise<void> {
  const impactRes = await withRetry(() => api.adminCategories.deleteImpact(id));
  if (impactRes.status() === 404) return;
  const impact = await dataOf<DeleteImpact>(impactRes);
  const reassignments = fallbackId
    ? impact.orphaned.map((app) => ({ appId: app._id, categoryId: fallbackId }))
    : [];
  await withRetry(() => api.adminCategories.remove(id, { reassignments }));
}

/** Deletes every category whose English name starts with "E2E ". */
export async function removeE2ECategories(
  api: ApiClient,
  fallbackId: string
): Promise<void> {
  for (const category of await listAdminCategories(api)) {
    if (category.name.en.startsWith(E2E_CATEGORY_PREFIX)) {
      await removeCategory(api, category._id, fallbackId);
    }
  }
}

/** POST …/move, retried on a transient 429 / 5xx. Returns the raw response. */
export function moveCategory(
  api: ApiClient,
  id: string,
  direction: MoveDirection
): Promise<APIResponse> {
  return withRetry(() => api.adminCategories.move(id, direction));
}

/** Re-applies an order snapshot (ids in display order) with moves. */
export async function restoreCategoryOrder(
  api: ApiClient,
  ids: string[]
): Promise<void> {
  for (let target = 0; target < ids.length; target += 1) {
    let current = (await listAdminCategories(api)).findIndex(
      (c) => c._id === ids[target]
    );
    while (current > target) {
      await moveCategory(api, ids[target], "up");
      current -= 1;
    }
  }
}

// ── Borrowed seeded apps ──────────────────────────────────────────────────

async function apps(api: ApiClient): Promise<AdminApp[]> {
  const res = await withRetry(() => api.adminApps.list());
  return (await dataOf<AdminAppList>(res)).items;
}

/** A registered app by its `name` (blog, notes, team-calendar…). */
export async function appByName(
  api: ApiClient,
  name: string
): Promise<AdminApp> {
  const found = (await apps(api)).find((a) => a.name === name);
  if (!found) throw new Error(`app ${name} not found`);
  return found;
}

export async function setAppCategories(
  api: ApiClient,
  appName: string,
  categoryIds: string[]
): Promise<void> {
  const app = await appByName(api, appName);
  const res = await withRetry(() =>
    api.adminApps.update(app._id, { categoryIds })
  );
  if (!res.ok()) {
    throw new Error(`setAppCategories ${appName}: ${res.status()}`);
  }
}

/** categoryIds of every app by `name`, to restore after borrowing seeded apps. */
export async function snapshotAppCategories(
  api: ApiClient
): Promise<Map<string, string[]>> {
  return new Map((await apps(api)).map((a) => [a.name, a.categoryIds]));
}

export async function restoreAppCategories(
  api: ApiClient,
  snapshot: Map<string, string[]>
): Promise<void> {
  for (const app of await apps(api)) {
    const wanted = snapshot.get(app.name);
    if (wanted && wanted.join() !== app.categoryIds.join()) {
      await setAppCategories(api, app.name, wanted);
    }
  }
}
