import type { APIResponse } from "@playwright/test";
import { API_PREFIX } from "@/config/urls";
import type { BaseClient } from "./base.client";

// /admin/users/* — the admin router of server/src/modules/user
// (createUserAdminRoutes). Every endpoint sits behind authGuard + adminGuard,
// so the client is used on a request context that already carries a Bearer
// token (`createApiClient(adminApi).adminUsers`, or api.as(session)). On a
// context without one, the same calls prove the guards.
//
// The mutations go through the admin-mutation rate limiter (20 / 15 min per
// IP + admin) BEFORE the id is validated.

const escapeRegExp = (text: string) =>
  text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * The browser's calls to these endpoints, for `page.route` /
 * `waitForResponse` in UI specs (the prefix is the client's, never hardcoded).
 */
export const adminUsersRoutes = {
  /** GET /admin/users with or without a query string. */
  list: new RegExp(`${escapeRegExp(API_PREFIX)}/admin/users(\\?|$)`),
  lock: `**${API_PREFIX}/admin/users/*/lock`,
  unlock: `**${API_PREFIX}/admin/users/*/unlock`,
  resetPassword: `**${API_PREFIX}/admin/users/*/reset-password`
} as const;

export interface AdminUserItem {
  _id: string;
  fullName: string;
  email: string;
  avatar: string | null;
  role: "user" | "admin";
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface AdminUsersPage {
  items: AdminUserItem[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

/** Query of GET /admin/users (server/src/validators/schemas/user.ts). */
export type AdminUsersQuery = Record<string, string | number | boolean>;

export function createAdminUsersClient(base: BaseClient) {
  return {
    /** GET /admin/users — paginated, filtered list (`data: AdminUsersPage`). */
    list(
      params: AdminUsersQuery = {},
      headers?: Record<string, string>
    ): Promise<APIResponse> {
      return base.call("get", "/admin/users", { params, headers });
    },
    /** PATCH /admin/users/:id/lock. */
    lock(id: string, headers?: Record<string, string>): Promise<APIResponse> {
      return base.call("patch", `/admin/users/${id}/lock`, { headers });
    },
    /** PATCH /admin/users/:id/unlock. */
    unlock(id: string, headers?: Record<string, string>): Promise<APIResponse> {
      return base.call("patch", `/admin/users/${id}/unlock`, { headers });
    },
    /** lock / unlock by the wanted state: `active: true` unlocks. */
    setActive(
      id: string,
      active: boolean,
      headers?: Record<string, string>
    ): Promise<APIResponse> {
      return active ? this.unlock(id, headers) : this.lock(id, headers);
    },
    /** POST /admin/users/:id/reset-password — emails a temporary password. */
    resetPassword(
      id: string,
      headers?: Record<string, string>
    ): Promise<APIResponse> {
      return base.call("post", `/admin/users/${id}/reset-password`, {
        headers
      });
    }
  };
}

export type AdminUsersClient = ReturnType<typeof createAdminUsersClient>;
