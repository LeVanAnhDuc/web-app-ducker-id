import type { APIResponse } from "@playwright/test";
import type { BaseClient } from "./base.client";

// /admin/apps — the admin router of server/src/modules/web-app
// (createAdminWebAppRoutes). Every endpoint sits behind authGuard +
// adminGuard, so the client is used on a request context that already carries
// a Bearer token (`createApiClient(adminApi).adminApps`, or api.as(session)).
// On a context without one, or with a user's token, the same calls prove the
// guards. There is no delete endpoint: utils/admin-apps.ts removes the apps a
// spec creates straight from MongoDB.
//
// Rules: server/src/validators/schemas/web-app.ts (adminListAppsQuerySchema,
// adminCreateAppBodySchema, adminUpdateAppBodySchema). Bodies are sent as
// given, so a test can pass an invalid one. With no `Accept-Language` header
// the server answers in its default locale, Vietnamese.

export type AdminAppStatus = "active" | "inactive";

/** One app as GET / PATCH return it (server AdminAppDto) — never a secret. */
export interface AdminApp {
  _id: string;
  name: string;
  displayName: string;
  description: string | null;
  iconUrl: string | null;
  homeUrl: string;
  /** In the order the admin chose; the first is the primary category. */
  categoryIds: string[];
  status: AdminAppStatus;
  requiredRoles: string[];
  redirectUris: string[];
  postLogoutRedirectUris: string[];
  clientId: string;
  tokenEndpointAuthMethod: string;
  createdAt: string;
  updatedAt: string;
}

/** POST answers the DTO plus the one-time secret (null for a public client). */
export interface AdminAppCreated extends AdminApp {
  clientSecret: string | null;
}

/** `data` of GET /admin/apps — the whole registry, no pagination. */
export interface AdminAppList {
  items: AdminApp[];
}

/** Query of GET /admin/apps: status, categoryId (24 hex), search (≤ 200). */
export type AdminAppsQuery = Record<string, string | number>;

export function createAdminAppsClient(base: BaseClient) {
  return {
    /** GET /admin/apps — `data: AdminAppList`. */
    list(
      params: AdminAppsQuery = {},
      headers?: Record<string, string>
    ): Promise<APIResponse> {
      return base.call("get", "/admin/apps", { params, headers });
    },
    /** POST /admin/apps — 201 `data: AdminAppCreated`. Any body is sent as is. */
    create(
      body: unknown,
      headers?: Record<string, string>
    ): Promise<APIResponse> {
      return base.call("post", "/admin/apps", { data: body, headers });
    },
    /** PATCH /admin/apps/:id — `data: AdminApp`. Any id / body is sent as is. */
    update(
      id: string,
      body: unknown,
      headers?: Record<string, string>
    ): Promise<APIResponse> {
      return base.call("patch", `/admin/apps/${id}`, { data: body, headers });
    }
  };
}

export type AdminAppsClient = ReturnType<typeof createAdminAppsClient>;
