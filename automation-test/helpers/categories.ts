import type { APIRequestContext, APIResponse } from "@playwright/test";
import { request } from "@playwright/test";
import {
  BASE_URL,
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
  USER_EMAIL,
  USER_PASSWORD
} from "./env";

// API-level helpers for feature `category-management`. Every mutation a spec
// makes through the UI is undone here in `afterAll`: there is no API to delete
// an app, so specs BORROW seeded apps (snapshot their categoryIds, change them,
// restore the snapshot) and only ever delete categories they created.

export type CategoryName = { en: string; vi: string };
export type AdminCategory = {
  _id: string;
  slug: string;
  name: CategoryName;
  sortOrder: number;
  appCount: number;
};
type AdminApp = {
  _id: string;
  name: string;
  displayName: string;
  categoryIds: string[];
};

export const CATEGORIES_API = "/api/v1/admin/categories";
export const PUBLIC_CATEGORIES_API = "/api/v1/apps/categories";

/** Seed baseline (server/src/database/seeders/data/web-app-categories.ts). */
export const SEED_CATEGORIES = [
  { slug: "content", en: "Content", vi: "Nội dung", apps: 1 },
  {
    slug: "internal-tools",
    en: "Internal Tools",
    vi: "Công cụ nội bộ",
    apps: 2
  },
  { slug: "identity", en: "Identity", vi: "Định danh", apps: 1 },
  { slug: "productivity", en: "Productivity", vi: "Năng suất", apps: 2 }
] as const;

export const uniqueName = (label: string) =>
  `E2E ${label} ${Date.now().toString(36)}`;

const RETRYABLE = new Set([429, 500, 502, 503]);

/** Cleanup must not die halfway on a transient 429/5xx (see design §6 seed notes). */
const withRetry = async (send: () => Promise<APIResponse>) => {
  let res = await send();
  for (let i = 0; i < 3 && RETRYABLE.has(res.status()); i += 1) {
    await new Promise((resolve) => setTimeout(resolve, 1500 * (i + 1)));
    res = await send();
  }
  return res;
};

export class CategoryApi {
  private constructor(
    readonly ctx: APIRequestContext,
    readonly auth: Record<string, string>
  ) {}

  /**
   * Login is rate-limited per IP (30 / 15 min) and every spec file needs a
   * token, so tokens are cached for the worker process (workers: 1 → one
   * process for the whole run).
   */
  private static tokens = new Map<string, string>();

  static async login(as: "admin" | "user" = "admin"): Promise<CategoryApi> {
    const ctx = await request.newContext({ baseURL: BASE_URL });
    const cached = CategoryApi.tokens.get(as);
    if (cached) {
      const probe = await ctx.get(CATEGORIES_API, {
        headers: { Authorization: `Bearer ${cached}` }
      });
      if (probe.status() !== 401) {
        return new CategoryApi(ctx, { Authorization: `Bearer ${cached}` });
      }
    }
    const res = await ctx.post("/api/v1/auth/login", {
      data:
        as === "admin"
          ? { email: ADMIN_EMAIL, password: ADMIN_PASSWORD }
          : { email: USER_EMAIL, password: USER_PASSWORD }
    });
    const body = (await res.json()) as { data?: { accessToken?: string } };
    const token = body.data?.accessToken;
    if (!token) throw new Error(`CategoryApi: ${as} login failed`);
    CategoryApi.tokens.set(as, token);
    return new CategoryApi(ctx, { Authorization: `Bearer ${token}` });
  }

  async dispose() {
    await this.ctx.dispose();
  }

  raw = {
    get: (path: string) => this.ctx.get(path, { headers: this.auth }),
    post: (path: string, data?: unknown) =>
      this.ctx.post(path, { headers: this.auth, data }),
    patch: (path: string, data?: unknown) =>
      this.ctx.patch(path, { headers: this.auth, data }),
    delete: (path: string, data?: unknown) =>
      this.ctx.delete(path, { headers: this.auth, data })
  };

  async list(): Promise<AdminCategory[]> {
    const res = await withRetry(() => this.raw.get(CATEGORIES_API));
    return ((await res.json()) as { data: AdminCategory[] }).data;
  }

  async bySlug(slug: string): Promise<AdminCategory> {
    const found = (await this.list()).find((c) => c.slug === slug);
    if (!found) throw new Error(`category ${slug} not found`);
    return found;
  }

  async create(name: CategoryName): Promise<AdminCategory> {
    const res = await withRetry(() => this.raw.post(CATEGORIES_API, { name }));
    if (res.status() !== 201)
      throw new Error(`create category failed: ${res.status()}`);
    return ((await res.json()) as { data: AdminCategory }).data;
  }

  /** Deletes a category the spec created, moving its orphans to `fallbackId`. */
  async remove(id: string, fallbackId?: string): Promise<void> {
    const impactRes = await withRetry(() =>
      this.raw.get(`${CATEGORIES_API}/${id}/delete-impact`)
    );
    if (impactRes.status() === 404) return;
    const impact = (
      (await impactRes.json()) as { data: { orphaned: { _id: string }[] } }
    ).data;
    const reassignments = fallbackId
      ? impact.orphaned.map((app) => ({
          appId: app._id,
          categoryId: fallbackId
        }))
      : [];
    await withRetry(() =>
      this.raw.delete(`${CATEGORIES_API}/${id}`, { reassignments })
    );
  }

  /** Deletes every category whose English name starts with "E2E ". */
  async removeAllE2E(fallbackId: string): Promise<void> {
    for (const category of await this.list()) {
      if (category.name.en.startsWith("E2E ")) {
        await this.remove(category._id, fallbackId);
      }
    }
  }

  async move(id: string, direction: "up" | "down") {
    return withRetry(() =>
      this.raw.post(`${CATEGORIES_API}/${id}/move`, { direction })
    );
  }

  /** Re-applies an order snapshot (ids in display order) with moves. */
  async restoreOrder(ids: string[]): Promise<void> {
    for (let target = 0; target < ids.length; target += 1) {
      let current = (await this.list()).findIndex((c) => c._id === ids[target]);
      while (current > target) {
        await this.move(ids[target], "up");
        current -= 1;
      }
    }
  }

  async apps(): Promise<AdminApp[]> {
    const res = await withRetry(() => this.raw.get("/api/v1/admin/apps"));
    return ((await res.json()) as { data: { items: AdminApp[] } }).data.items;
  }

  async app(name: string): Promise<AdminApp> {
    const found = (await this.apps()).find((a) => a.name === name);
    if (!found) throw new Error(`app ${name} not found`);
    return found;
  }

  async setAppCategories(appName: string, categoryIds: string[]) {
    const app = await this.app(appName);
    const res = await withRetry(() =>
      this.raw.patch(`/api/v1/admin/apps/${app._id}`, { categoryIds })
    );
    if (!res.ok())
      throw new Error(`setAppCategories ${appName}: ${res.status()}`);
  }

  /** categoryIds of every app, to restore after borrowing seeded apps. */
  async snapshotApps(): Promise<Map<string, string[]>> {
    return new Map((await this.apps()).map((a) => [a.name, a.categoryIds]));
  }

  async restoreApps(snapshot: Map<string, string[]>): Promise<void> {
    const current = await this.apps();
    for (const app of current) {
      const wanted = snapshot.get(app.name);
      if (wanted && wanted.join() !== app.categoryIds.join()) {
        await this.setAppCategories(app.name, wanted);
      }
    }
  }
}
