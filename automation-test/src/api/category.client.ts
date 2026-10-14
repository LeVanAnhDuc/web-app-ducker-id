import type { APIResponse } from "@playwright/test";
import type { BaseClient } from "./base.client";

// Categories — server/src/modules/category. The public list (`GET
// /apps/categories`, createCategoryUserRoutes) is behind optionalAuthGuard and
// a per-IP limiter (100 / 5 min): no header passes as anonymous, a header with
// a bad token is still rejected. It answers `Cache-Control: public,
// max-age=60`. The admin surface (/admin/categories*) is admin-categories.client.ts.

/** A category as the public list and every user app DTO carry it. */
export interface CatalogCategory {
  _id: string;
  slug: string;
  name: { en: string; vi: string };
}

export function createCategoryClient(base: BaseClient) {
  return {
    /** GET /apps/categories — `data: CatalogCategory[]`, display order. */
    listPublic(headers?: Record<string, string>): Promise<APIResponse> {
      return base.call("get", "/apps/categories", { headers });
    }
  };
}

export type CategoryClient = ReturnType<typeof createCategoryClient>;
