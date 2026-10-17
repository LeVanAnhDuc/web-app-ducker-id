import type { Page, Request, Route } from "@playwright/test";
import type { CatalogApp, CatalogPage } from "@/api/web-app.client";
import type { HeaderSearch } from "@/components/header-search.component";
import {
  APPS_LIST_URL,
  APPS_PATH,
  isAppsListResponse,
  searchParamOf
} from "@/utils/catalog";

// Stubbed catalogue responses and network waits shared by the APPS e2e specs
// (catalog, header-search). Only this module uses them.
//
// A stub fulfils GET /apps in the server's envelope so the client renders it
// exactly as a real answer: used where a state needs more apps than the
// database holds, a null field, a held or failing request.

/** The server's success envelope around `data`. */
export const envelope = (data: unknown) => ({
  timestamp: new Date().toISOString(),
  path: APPS_PATH,
  message: "OK",
  data
});

/** The server's error body for a 5xx. */
export const serverError = (message = "Internal Server Error") => ({
  code: "INTERNAL_ERROR",
  message,
  timestamp: new Date().toISOString(),
  path: APPS_PATH
});

/** A catalogue item with a valid-looking ObjectId; override any field. */
export const fakeApp = (
  i: number,
  over: Partial<CatalogApp> = {}
): CatalogApp => ({
  _id: `64b7f0c2f1a2b3c4d5e6${String(i).padStart(4, "0")}`,
  displayName: `Stub App ${i}`,
  description: `Stub description ${i}`,
  iconUrl: null,
  homeUrl: `https://stub-${i}.example.com`,
  categories: [],
  isFavorite: false,
  ...over
});

export const pageOf = (
  items: CatalogApp[],
  meta: Partial<CatalogPage["meta"]> = {}
): CatalogPage => ({
  items,
  meta: { total: items.length, page: 1, limit: 20, totalPages: 1, ...meta }
});

export const fulfillJson = (route: Route, body: unknown, status = 200) =>
  route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body)
  });

/** Answers every GET /apps (list, not categories) with `page`. */
export const stubCatalog = (page: Page, data: CatalogPage) =>
  page.route(APPS_LIST_URL, (route) => fulfillJson(route, envelope(data)));

/** Fulfils GET /apps with `totalPages` pages of 20; records every request. */
export const stubPages = (
  page: Page,
  totalPages: number,
  seen: Request[] = []
) =>
  page.route(APPS_LIST_URL, (route: Route) => {
    seen.push(route.request());
    const p = Number(new URL(route.request().url()).searchParams.get("page"));
    const pageNo = p || 1;
    const items = Array.from({ length: 2 }, (_, i) =>
      fakeApp(pageNo * 100 + i)
    );
    return fulfillJson(
      route,
      envelope({
        items,
        meta: { total: totalPages * 20, page: pageNo, limit: 20, totalPages }
      })
    );
  });

/** Waits for the catalogue response whose `search` equals `term`. */
export const waitForSearch = (page: Page, term: string) =>
  page.waitForResponse(
    (r) => isAppsListResponse(r) && searchParamOf(r.url()) === term
  );

/**
 * Types a query into the header search and waits for the debounced request
 * for it (the client trims before searching).
 */
export async function typeQuery(
  page: Page,
  search: HeaderSearch,
  q: string
): Promise<void> {
  const res = waitForSearch(page, q.trim());
  await search.input().fill(q);
  await res;
}
