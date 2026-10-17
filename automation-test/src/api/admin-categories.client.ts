import type { APIResponse } from "@playwright/test";
import type { BaseClient } from "./base.client";

// /admin/categories — the admin router of server/src/modules/category
// (createCategoryAdminRoutes). Every endpoint sits behind authGuard +
// adminGuard, so the client is used on a request context that already carries
// a Bearer token (`createApiClient(adminApi).adminCategories`, or
// api.as(session)); on a context without one, or with a user's token, the same
// calls prove the guards. POST, PATCH, move and DELETE share one limiter
// (`rate-limit:category-mutation:ip-user:`, 120 / 60 s per IP + admin) applied
// BEFORE the id and body are validated; GET and delete-impact are not limited.
//
// Rules: server/src/validators/schemas/category.ts. Bodies are sent as given,
// so a test can pass an invalid one. With no `Accept-Language` header the
// server answers in its default locale, Vietnamese. The public list
// (GET /apps/categories) lives in category.client.ts.

export interface CategoryName {
  en: string;
  vi: string;
}

/** One category as the admin list, create, update and move return it. */
export interface AdminCategory {
  _id: string;
  slug: string;
  name: CategoryName;
  sortOrder: number;
  appCount: number;
}

/** An app that would be left with no category if this one went. */
export interface OrphanApp {
  _id: string;
  displayName: string;
}

/** `data` of GET /admin/categories/:id/delete-impact. */
export interface DeleteImpact {
  /** Every app referencing the category, active or not. */
  total: number;
  /** Apps that only belong to it, by display name — each needs a target. */
  orphaned: OrphanApp[];
}

export interface CategoryReassignment {
  appId: string;
  categoryId: string;
}

export type MoveDirection = "up" | "down";

export function createAdminCategoriesClient(base: BaseClient) {
  return {
    /** GET /admin/categories — `data: AdminCategory[]`, display order, no pagination. */
    list(
      params: Record<string, string | number> = {},
      headers?: Record<string, string>
    ): Promise<APIResponse> {
      return base.call("get", "/admin/categories", { params, headers });
    },
    /** POST /admin/categories — 201 `data: AdminCategory`. Any body is sent as is. */
    create(
      body: unknown,
      headers?: Record<string, string>
    ): Promise<APIResponse> {
      return base.call("post", "/admin/categories", { data: body, headers });
    },
    /** PATCH /admin/categories/:id — `data: AdminCategory`. Any id / body is sent as is. */
    update(
      id: string,
      body: unknown,
      headers?: Record<string, string>
    ): Promise<APIResponse> {
      return base.call("patch", `/admin/categories/${id}`, {
        data: body,
        headers
      });
    },
    /**
     * POST /admin/categories/:id/move — `data: AdminCategory[]` (the new order).
     * `direction` is a string so a test can send an invalid one.
     */
    move(
      id: string,
      direction: MoveDirection | string,
      headers?: Record<string, string>
    ): Promise<APIResponse> {
      return base.call("post", `/admin/categories/${id}/move`, {
        data: { direction },
        headers
      });
    },
    /** GET /admin/categories/:id/delete-impact — `data: DeleteImpact`. */
    deleteImpact(
      id: string,
      headers?: Record<string, string>
    ): Promise<APIResponse> {
      return base.call("get", `/admin/categories/${id}/delete-impact`, {
        headers
      });
    },
    /**
     * DELETE /admin/categories/:id — 204. `body` is sent as is
     * (`{ reassignments: [...] }`); undefined sends no body at all.
     */
    remove(
      id: string,
      body?: unknown,
      headers?: Record<string, string>
    ): Promise<APIResponse> {
      return base.call("delete", `/admin/categories/${id}`, {
        data: body,
        headers
      });
    }
  };
}

export type AdminCategoriesClient = ReturnType<
  typeof createAdminCategoriesClient
>;
