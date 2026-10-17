import { expect } from "@playwright/test";
import type { APIRequestContext, Page, Response } from "@playwright/test";
import { createApiClient } from "@/api";
import type {
  CatalogApp,
  CatalogPage,
  CatalogQuery
} from "@/api/web-app.client";
import { API_PREFIX } from "@/config/urls";
import type { OidcClient } from "./oidc";
import {
  deleteOidcClients,
  registerClient,
  setClientStatus
} from "./oidc-state";
import { clearRateLimits } from "./redis";
import { escapeRegExp } from "./regex";

// The user-facing app catalogue (GET /apps) as other specs need it: modules
// APPS, FAVORITES, RECENTLYUSED, HOME, LOGINHISTORY.
//
// Specs read the catalogue from the live API instead of naming seed apps: the
// database the suite runs against is not guaranteed to hold the web-apps
// seeder's Blog / Notes / IDMS Portal, so a hard-coded name turns a working
// page into a red test. Apps a spec needs to be *absent* for a user
// (admin-only, inactive) are registered by the spec itself through the admin
// API and removed again with `removeFixtureApps()`.

/** Path of the catalogue endpoint the browser calls (`/api/v1/apps`). */
export const APPS_PATH = `${API_PREFIX}/apps`;
/** Path of the public category list (`/api/v1/apps/categories`). */
export const APP_CATEGORIES_PATH = `${API_PREFIX}/apps/categories`;
/** Path of the launch record an Open button posts (`…/users/me/recent-apps/:id`). */
export const recentAppPath = (appId: string): string =>
  `${API_PREFIX}/users/me/recent-apps/${appId}`;
/** The catalogue list URL, with or without a query — never /apps/categories. */
export const APPS_LIST_URL = new RegExp(`${escapeRegExp(APPS_PATH)}(\\?|$)`);

// ── Reading the catalogue ─────────────────────────────────────────────────

/** GET /apps for the context's account, as one page of up to 100 apps. */
export async function listCatalog(
  api: APIRequestContext,
  params: CatalogQuery = {}
): Promise<CatalogPage> {
  const res = await createApiClient(api).webApps.list({
    limit: 100,
    ...params
  });
  expect(res.status(), `GET /apps → ${res.status()}`).toBe(200);
  return ((await res.json()) as { data: CatalogPage }).data;
}

/** The catalogue sorted by name — stable picks for "app A" / "app B". */
export async function catalogByName(
  api: APIRequestContext
): Promise<CatalogApp[]> {
  const { items } = await listCatalog(api);
  return [...items].sort((a, b) => a.displayName.localeCompare(b.displayName));
}

// ── Watching the browser's catalogue calls ────────────────────────────────

/** True for a successful catalogue list call, never for /apps/categories. */
export const isAppsListResponse = (r: Response): boolean =>
  r.url().includes(APPS_PATH) &&
  !r.url().includes("/apps/categories") &&
  r.request().method() === "GET" &&
  r.status() === 200;

export const waitForAppsList = (page: Page): Promise<Response> =>
  page.waitForResponse(isAppsListResponse);

/** The `search` query parameter of a catalogue request URL, or null. */
export const searchParamOf = (url: string): string | null =>
  new URL(url).searchParams.get("search");

// ── Apps a user must not see ──────────────────────────────────────────────

export interface FixtureApps {
  /** ACTIVE, requiredRoles = ["admin"]. */
  adminOnly: OidcClient;
  /** INACTIVE, requiredRoles = ["user", "admin"]. */
  inactive: OidcClient;
}

/**
 * Registers one admin-only and one inactive app through the admin API so a
 * visibility test has something to prove absent. Both carry the OIDC
 * helper's `e2e-oidc-` name prefix, which is what lets `removeFixtureApps`
 * delete them (there is no DELETE for apps).
 */
export async function createFixtureApps(
  adminApi: APIRequestContext,
  label: string
): Promise<FixtureApps> {
  // Callers run this in beforeAll, which the per-test rate-limit reset
  // (core.fixture) does not cover: a preceding rate-limit spec (e.g.
  // apps/categories.api.ts) can leave GET /apps/categories at 429.
  await clearRateLimits();
  const adminOnly = await registerClient(adminApi, {
    kind: "public",
    label: `${label}-adminonly`,
    requiredRoles: ["admin"]
  });
  const inactive = await registerClient(adminApi, {
    kind: "public",
    label: `${label}-inactive`,
    requiredRoles: ["user", "admin"]
  });
  await setClientStatus(adminApi, inactive, "inactive");
  return { adminOnly, inactive };
}

export async function removeFixtureApps(
  fixtures: FixtureApps | OidcClient[] | undefined
): Promise<void> {
  if (!fixtures) return;
  const list = Array.isArray(fixtures)
    ? fixtures
    : [fixtures.adminOnly, fixtures.inactive];
  await deleteOidcClients(list);
}
