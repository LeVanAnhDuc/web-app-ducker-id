import { expect } from "@playwright/test";
import type { APIRequestContext, Page, Response } from "@playwright/test";
import { deleteOidcClients, registerClient, setClientStatus } from "./oidc";
import type { OidcClient } from "./oidc";
import { apiAs } from "@fixtures";
import { ADMIN_EMAIL, ADMIN_PASSWORD, USER_EMAIL, USER_PASSWORD } from "./env";

// The user-facing app catalogue (modules HOME, APPS, FAV, RECENT, LOGHIST).
//
// Specs read the catalogue from the live API instead of naming seed apps:
// the database the suite runs against is not guaranteed to hold the
// web-apps seeder's Blog / Notes / IDMS Portal, so a hard-coded name turns a
// working page into a red test. Apps a spec needs to be *absent* for a user
// (admin-only, inactive) are registered by the spec itself through the admin
// API and removed again with `removeFixtureApps()`.

export const APPS_API = "/api/v1/apps";

/**
 * Bearer contexts for `beforeAll` / `afterAll`, where the test-scoped
 * `userApi` / `adminApi` fixtures are not available. Dispose when done.
 */
export const userContext = () => apiAs(USER_EMAIL, USER_PASSWORD);
export const adminContext = () => apiAs(ADMIN_EMAIL, ADMIN_PASSWORD);

export interface CatalogCategory {
  _id: string;
  slug: string;
  name: { en: string; vi: string };
}

export interface CatalogApp {
  _id: string;
  displayName: string;
  description: string | null;
  iconUrl: string | null;
  homeUrl: string;
  categories: CatalogCategory[];
  isFavorite: boolean;
}

interface Page1<T> {
  items: T[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

/** GET /apps for the context's account, as one page of up to 100 apps. */
export async function listCatalog(
  api: APIRequestContext,
  params: Record<string, string | number> = {}
): Promise<Page1<CatalogApp>> {
  const res = await api.get(APPS_API, { params: { limit: 100, ...params } });
  expect(res.status(), `GET /apps → ${res.status()}`).toBe(200);
  return ((await res.json()) as { data: Page1<CatalogApp> }).data;
}

/** The catalogue sorted by name — stable picks for "app A" / "app B". */
export async function catalogByName(
  api: APIRequestContext
): Promise<CatalogApp[]> {
  const { items } = await listCatalog(api);
  return [...items].sort((a, b) => a.displayName.localeCompare(b.displayName));
}

/** True for the catalogue list call, never for /apps/categories. */
export const isAppsListResponse = (r: Response) =>
  r.url().includes(APPS_API) &&
  !r.url().includes("/apps/categories") &&
  r.request().method() === "GET" &&
  r.status() === 200;

export const waitForAppsList = (page: Page) =>
  page.waitForResponse(isAppsListResponse);

/** Escapes a display name for use inside a RegExp. */
export const reEscape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

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

/**
 * Captures window.open calls instead of opening a tab — an app tile opens
 * the app's own (often external) URL.
 */
export const stubWindowOpen = (page: Page) =>
  page.addInitScript(() => {
    (window as unknown as { __opened: string[] }).__opened = [];
    window.open = (url?: string | URL) => {
      (window as unknown as { __opened: string[] }).__opened.push(
        String(url ?? "")
      );
      return null;
    };
  });

export const openedUrls = (page: Page) =>
  page.evaluate(() => (window as unknown as { __opened: string[] }).__opened);
