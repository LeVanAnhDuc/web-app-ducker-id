import type { APIResponse } from "@playwright/test";
import { API_PREFIX } from "@/config/urls";
import type { BaseClient } from "./base.client";

// /admin/login-history — the admin router of server/src/modules/login-history
// (createLoginHistoryAdminRoutes). Both endpoints sit behind authGuard +
// adminGuard, so the client is used on a request context that already carries
// a Bearer token (`createApiClient(adminApi).adminLoginHistory`, or
// api.as(session)). On a context without one, the same calls prove the guards.
//
// Query (server/src/validators/schemas/login-history.ts →
// loginHistoryAdminQuerySchema): page ≥ 1, limit 1…100, enums for status /
// method / deviceType / clientType / source, 24-hex userId / webAppId,
// boolean interactive, ISO fromDate ≤ toDate, text filters ≤ 200 characters.
// Values are sent as given, so a test can pass an invalid one.

const escapeRegExp = (text: string) =>
  text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * The browser's calls to these endpoints, for `page.route` /
 * `waitForResponse` in UI specs (the prefix is the client's, never hardcoded).
 */
export const adminLoginHistoryRoutes = {
  /** GET /admin/login-history with or without a query string. */
  list: new RegExp(`${escapeRegExp(API_PREFIX)}/admin/login-history(\\?|$)`),
  /** GET /admin/login-history/:id. */
  detail: `**${API_PREFIX}/admin/login-history/*`,
  /** The API path of the list, as the envelope's `path` carries it. */
  listPath: `${API_PREFIX}/admin/login-history`
} as const;

/** One row of the list and the detail (server AllHistoryItemDto). */
export interface AdminLoginHistoryItem {
  _id: string;
  method: string;
  status: "success" | "failed";
  failReason: string | null;
  ip: string;
  country: string;
  city: string;
  deviceType: string;
  os: string;
  browser: string;
  clientType: string;
  createdAt: string;
  /** The account's AUTH id (`auths._id`), not the users `_id`. */
  userId: string | null;
  usernameAttempted: string;
  userAgent: string;
  timezoneOffset: string | null;
  isAnomaly: boolean;
  anomalyReasons: string[];
  source: "idp" | "oauth";
  app: { id: string; name: string; iconUrl: string | null } | null;
  interactive: boolean;
}

export interface AdminLoginHistoryPage {
  items: AdminLoginHistoryItem[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export type AdminLoginHistoryQuery = Record<string, string | number | boolean>;

export function createAdminLoginHistoryClient(base: BaseClient) {
  return {
    /** GET /admin/login-history — `data: AdminLoginHistoryPage`. */
    list(
      params: AdminLoginHistoryQuery = {},
      headers?: Record<string, string>
    ): Promise<APIResponse> {
      return base.call("get", "/admin/login-history", { params, headers });
    },
    /**
     * GET /admin/login-history?<rawQuery> — the query string sent verbatim,
     * for shapes `params` cannot express (`status[$ne]=success`).
     */
    listRaw(
      rawQuery: string,
      headers?: Record<string, string>
    ): Promise<APIResponse> {
      return base.call("get", `/admin/login-history?${rawQuery}`, { headers });
    },
    /** GET /admin/login-history/:id — `data: AdminLoginHistoryItem`. */
    detail(id: string, headers?: Record<string, string>): Promise<APIResponse> {
      return base.call("get", `/admin/login-history/${id}`, { headers });
    }
  };
}

export type AdminLoginHistoryClient = ReturnType<
  typeof createAdminLoginHistoryClient
>;
