import type { Page, Request } from "@playwright/test";
import {
  loginHistoryRoutes,
  type MyLoginHistoryItem
} from "@/api/login-history.client";

// Shared by the login-history e2e specs: the stubbed list response for
// page.route (it records every request the page sends) and the records it
// serves. The stub answers GET /login-history only, never /stats.

const envelope = (data: unknown) =>
  JSON.stringify({
    timestamp: new Date().toISOString(),
    path: loginHistoryRoutes.listPath,
    message: "ok",
    data
  });

/**
 * Answers every list request with one page of `items`, `totalPages` pages in
 * all (the page number echoes the request's). `items` may be a function of
 * the requested page. Every request is pushed onto `seen`.
 */
export const stubList = (
  page: Page,
  items: MyLoginHistoryItem[] | ((pageNo: number) => MyLoginHistoryItem[]),
  { seen, totalPages = 1 }: { seen?: Request[]; totalPages?: number } = {}
) =>
  page.route(loginHistoryRoutes.list, (route) => {
    seen?.push(route.request());
    const pageNo =
      Number(new URL(route.request().url()).searchParams.get("page")) || 1;
    const rows = typeof items === "function" ? items(pageNo) : items;
    const total = totalPages > 1 ? totalPages * 20 : rows.length;
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: envelope({
        items: rows,
        meta: { total, page: pageNo, limit: 20, totalPages }
      })
    });
  });

/** The query of the last recorded list request. */
export const lastQuery = (seen: Request[]): URLSearchParams =>
  new URL(seen[seen.length - 1].url()).searchParams;

// ── records ────────────────────────────────────────────────────────────────

/** A manual password sign-in into Ducker ID itself from the local machine. */
export const IDP_ROW: MyLoginHistoryItem = {
  _id: "0123456789abcdef01234567",
  method: "password",
  status: "success",
  failReason: null,
  ip: "127.0.0.1",
  country: "LOCAL",
  city: "LOCAL",
  deviceType: "DESKTOP",
  os: "Windows 10",
  browser: "Chrome 120",
  clientType: "WEB",
  createdAt: "2026-01-15T08:30:00.000Z",
  source: "idp",
  app: null,
  interactive: true
};

/** A silent SSO hand-off to the satellite app "Match CV". */
export const SILENT_SSO_ROW: MyLoginHistoryItem = {
  ...IDP_ROW,
  _id: "0123456789abcdef01234568",
  method: "sso",
  source: "oauth",
  app: { id: "0123456789abcdef0123abcd", name: "Match CV", iconUrl: null },
  interactive: false
};

/** Row `i` — a public (documentation-range) address in Hanoi, VN. */
export const row = (
  i: number,
  over: Partial<MyLoginHistoryItem> = {}
): MyLoginHistoryItem => ({
  _id: `0123456789abcdef0123${String(i).padStart(4, "0")}`,
  method: "password",
  status: "success",
  failReason: null,
  ip: "203.0.113.7",
  country: "VN",
  city: "Hanoi",
  deviceType: "DESKTOP",
  os: "Windows 10",
  browser: "Chrome 120",
  clientType: "WEB",
  createdAt: new Date(Date.UTC(2026, 9, 1, 8, i)).toISOString(),
  source: "idp",
  app: null,
  interactive: true,
  ...over
});
