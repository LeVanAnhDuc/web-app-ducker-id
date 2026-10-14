import type { APIResponse } from "@playwright/test";
import { API_PREFIX } from "@/config/urls";
import { escapeRegExp } from "@/utils/regex";
import type { BaseClient } from "./base.client";
import type { CatalogApp } from "./web-app.client";

// /users/me/recent-apps/* — server/src/modules/recent-app
// (createRecentAppUserRoutes). Every endpoint is behind authGuard: use the
// client on a context that carries a Bearer (`createApiClient(userApi)
// .recentApps`, or api.as(session)); bare, the same calls prove the guard.
// Recording goes through a per-user rate limiter (recordRecentAppByUser).
// Rows are soft-deleted: hide / clear set `hiddenAt`, restore clears it.

/** Query of GET /users/me/recent-apps — values sent as given. */
export type RecentAppsQuery = Record<string, string | number>;

export function createRecentAppClient(base: BaseClient) {
  return {
    /** GET /users/me/recent-apps — one row per app, newest first. */
    list(params: RecentAppsQuery = {}): Promise<APIResponse> {
      return base.call("get", "/users/me/recent-apps", { params });
    },
    /** POST /users/me/recent-apps/:appId — what an Open button records (204). */
    record(appId: string): Promise<APIResponse> {
      return base.call("post", `/users/me/recent-apps/${appId}`);
    },
    /** DELETE /users/me/recent-apps/:appId — hide one row (soft delete, 204). */
    hide(appId: string): Promise<APIResponse> {
      return base.call("delete", `/users/me/recent-apps/${appId}`);
    },
    /** POST /users/me/recent-apps/:appId/restore — the toast's Undo (204). */
    restore(appId: string): Promise<APIResponse> {
      return base.call("post", `/users/me/recent-apps/${appId}/restore`);
    },
    /** DELETE /users/me/recent-apps — hide every row ("Clear History", 204). */
    clear(): Promise<APIResponse> {
      return base.call("delete", "/users/me/recent-apps");
    },
    /** GET /users/me/recent-apps/stats — the figures behind Home. */
    stats(
      params: RecentAppsQuery = {},
      headers?: Record<string, string>
    ): Promise<APIResponse> {
      return base.call("get", "/users/me/recent-apps/stats", {
        params,
        headers
      });
    }
  };
}

/** One row of GET /users/me/recent-apps (server RecentAppDto). */
export interface RecentAppItem extends CatalogApp {
  lastUsedAt: string;
  useCount: number;
}

export interface RecentAppsPage {
  items: RecentAppItem[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export type RecentAppClient = ReturnType<typeof createRecentAppClient>;

/** One row of the stats ranking (server RecentAppsStatsDto.topApps). */
export interface TopApp {
  appId: string;
  displayName: string;
  iconUrl: string | null;
  homeUrl: string;
  /** The app's primary category, or null. */
  category: {
    _id: string;
    slug?: string;
    name: { en: string; vi: string };
  } | null;
  /** Lifetime open count. */
  useCount: number;
  lastUsedAt: string;
}

/** GET /users/me/recent-apps/stats — `data` (server RecentAppsStatsDto). */
export interface RecentAppsStats {
  totalApps: number;
  activeLast7Days: number;
  activeLast30Days: number;
  topApps: TopApp[];
  byCategory: unknown[];
}

/** The browser's stats call (`…/users/me/recent-apps/stats`), for `page.route`. */
export const recentAppsStatsRoute = new RegExp(
  `${escapeRegExp(API_PREFIX)}/users/me/recent-apps/stats(\\?|$)`
);
/** The API path of the stats endpoint, as the envelope's `path` carries it. */
export const recentAppsStatsPath = `${API_PREFIX}/users/me/recent-apps/stats`;
