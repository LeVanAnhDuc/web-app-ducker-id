import type { APIResponse } from "@playwright/test";
import type { BaseClient } from "./base.client";
import type { CatalogCategory } from "./category.client";

// Apps — server/src/modules/web-app. The user router (createUserWebAppRoutes)
// serves `GET /apps`: the signed-in user's catalogue, active apps the user may
// open (role default ± entitlement overrides), behind authGuard. Used on a
// request context that already carries a Bearer (`createApiClient(userApi)
// .webApps`); on one without, the same call proves the guard. The admin
// router (/admin/apps*) belongs here too.

/** One app of the user catalogue (server UserAppDto). */
export interface CatalogApp {
  _id: string;
  displayName: string;
  description: string | null;
  iconUrl: string | null;
  homeUrl: string;
  /** In the order the admin chose; the first is the primary category. */
  categories: CatalogCategory[];
  isFavorite: boolean;
}

export interface CatalogPage {
  items: CatalogApp[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

/**
 * Query of GET /apps (server/src/validators/schemas/web-app.ts →
 * listAppsQuerySchema): page ≥ 1, limit 1…100, search ≤ 200 (trimmed),
 * categoryId a 24-hex ObjectId. Unknown keys are stripped. Values are sent as
 * given, so a test can pass an invalid one.
 */
export type CatalogQuery = Record<string, string | number>;

export function createWebAppClient(base: BaseClient) {
  return {
    /** GET /apps — `data: CatalogPage` (default page 1, limit 20). */
    list(
      params: CatalogQuery = {},
      headers?: Record<string, string>
    ): Promise<APIResponse> {
      return base.call("get", "/apps", { params, headers });
    }
  };
}

export type WebAppClient = ReturnType<typeof createWebAppClient>;
