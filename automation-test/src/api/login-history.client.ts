import type { APIResponse } from "@playwright/test";
import { API_PREFIX } from "@/config/urls";
import { escapeRegExp } from "@/utils/regex";
import type { BaseClient } from "./base.client";

// /login-history — the user router of server/src/modules/login-history
// (createLoginHistoryUserRoutes). Both endpoints sit behind authGuard and only
// ever read the caller's own rows (the service filters by the session's auth
// id). Used on a request context that already carries a Bearer
// (`createApiClient(userApi).loginHistory`); on one without, the same calls
// prove the guard. The admin router is admin-login-history.client.ts.
//
// Query (server/src/validators/schemas/login-history.ts →
// loginHistoryQuerySchema): page ≥ 1, limit 1…100, enums for status / method /
// deviceType / clientType / source, 24-hex webAppId, boolean interactive, ISO
// fromDate ≤ toDate, text filters country / city / os / browser ≤ 200
// characters, sortBy ∈ createdAt / method / status / country, sortOrder.
// Unknown keys (userId, ip) are stripped. Values are sent as given, so a test
// can pass an invalid one.

/**
 * The browser's calls to these endpoints, for `page.route` /
 * `waitForResponse` in UI specs (the prefix is the client's, never hardcoded).
 */
export const loginHistoryRoutes = {
  /** GET /login-history with or without a query string — never /stats. */
  list: new RegExp(`${escapeRegExp(API_PREFIX)}/login-history(\\?|$)`),
  /** The API path of the list, as the envelope's `path` carries it. */
  listPath: `${API_PREFIX}/login-history`
} as const;

/** One row of the caller's own history (server MyHistoryItemDto). */
export interface MyLoginHistoryItem {
  _id: string;
  method: string;
  status: string;
  failReason: string | null;
  /** Public addresses are masked (`1.2.*.*`); loopback / private ones are not. */
  ip: string;
  country: string;
  city: string;
  deviceType: string;
  os: string;
  browser: string;
  clientType: string;
  createdAt: string;
  source: string;
  app: { id: string | null; name: string; iconUrl: string | null } | null;
  interactive: boolean;
  /** Promised by README / REQ-LOGINHISTORY-01; missing today (BUG-LOGINHISTORY-01). */
  isAnomaly?: boolean;
}

export interface MyLoginHistoryPage {
  items: MyLoginHistoryItem[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export type MyLoginHistoryQuery = Record<string, string | number | boolean>;

export function createLoginHistoryClient(base: BaseClient) {
  return {
    /** GET /login-history — `data: MyLoginHistoryPage`. */
    list(
      params: MyLoginHistoryQuery = {},
      headers?: Record<string, string>
    ): Promise<APIResponse> {
      return base.call("get", "/login-history", { params, headers });
    },
    /**
     * GET /login-history?<rawQuery> — the query string sent verbatim, for
     * shapes `params` cannot express (`status[$ne]=success`).
     */
    listRaw(
      rawQuery: string,
      headers?: Record<string, string>
    ): Promise<APIResponse> {
      return base.call("get", `/login-history?${rawQuery}`, { headers });
    },
    /** GET /login-history/stats — Home's sign-in statistics (module home). */
    stats(
      params: Record<string, string> = {},
      headers?: Record<string, string>
    ): Promise<APIResponse> {
      return base.call("get", "/login-history/stats", { params, headers });
    }
  };
}

export type LoginHistoryClient = ReturnType<typeof createLoginHistoryClient>;

// ── Stats (module home) ─────────────────────────────────────────────────────
// Query (loginHistoryStatsQuerySchema): range 7d / 30d / 90d (default 7d), tz an
// IANA zone Intl knows (≤ 64 characters).

/** The browser's stats call (`…/login-history/stats`), for `page.route` / `waitForRequest`. */
export const loginStatsRoute = new RegExp(
  `${escapeRegExp(API_PREFIX)}/login-history/stats(\\?|$)`
);
/** The API path of the stats endpoint, as the envelope's `path` carries it. */
export const loginStatsPath = `${API_PREFIX}/login-history/stats`;

/** One local calendar day of the stats (`date` is `YYYY-MM-DD`). */
export interface LoginStatsDay {
  date: string;
  total: number;
  successful: number;
  failed: number;
}

/** GET /login-history/stats — `data` (server LoginHistoryStatsDto). */
export interface LoginStats {
  total: number;
  successful: number;
  failed: number;
  /** password, otp, magic-link, forgot-password, sso — always all five. */
  byMethod: Record<string, number>;
  /** DESKTOP, MOBILE, TABLET, UNKNOWN — always all four. */
  byDevice: Record<string, number>;
  /** One zero-filled bucket per local day of the range. */
  byDay: LoginStatsDay[];
  byApp: unknown[];
  anomalies: number;
  range: { from: string; to: string; days: number; timezone: string };
}
