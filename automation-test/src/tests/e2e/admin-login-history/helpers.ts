import { expect } from "@/fixtures";
import type { Page, Request } from "@playwright/test";
import {
  adminLoginHistoryRoutes,
  type AdminLoginHistoryItem
} from "@/api/admin-login-history.client";

// Shared by the admin-login-history e2e specs: the browser's list requests,
// stubbed list / detail responses for page.route, and the records they serve.

const LIST = adminLoginHistoryRoutes.list;

/** Records every list request the page makes; `lastParams()` waits for one. */
export const captureListRequests = (page: Page) => {
  const seen: Request[] = [];
  page.on("request", (r) => {
    if (LIST.test(r.url()) && r.method() === "GET") seen.push(r);
  });
  return {
    lastParams: async () => {
      await expect.poll(() => seen.length).toBeGreaterThan(0);
      return new URL(seen[seen.length - 1].url()).searchParams;
    }
  };
};

const envelope = (data: unknown) =>
  JSON.stringify({
    timestamp: new Date().toISOString(),
    path: adminLoginHistoryRoutes.listPath,
    message: "ok",
    data
  });

/**
 * Answers every list request with `items`. `totalPages` defaults to what
 * the items fill; the page number echoes the request's.
 */
export const stubList = (
  page: Page,
  items: AdminLoginHistoryItem[],
  { total = items.length, seen }: { total?: number; seen?: Request[] } = {}
) =>
  page.route(LIST, (route) => {
    seen?.push(route.request());
    const requested = Number(
      new URL(route.request().url()).searchParams.get("page") ?? "1"
    );
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: envelope({
        items,
        meta: {
          total,
          page: requested,
          limit: 20,
          totalPages: Math.ceil(total / 20)
        }
      })
    });
  });

/** Answers every detail request with `record` (200). */
export const stubDetail = (page: Page, record: AdminLoginHistoryItem) =>
  page.route(adminLoginHistoryRoutes.detail, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: envelope(record)
    })
  );

/** Answers every detail request with an empty 500. */
export const failDetail = (page: Page) =>
  page.route(adminLoginHistoryRoutes.detail, (route) =>
    route.fulfill({ status: 500, body: "{}" })
  );

// ── records ────────────────────────────────────────────────────────────────

/** The id every stubbed detail is opened at. */
export const STUB_ID = "0123456789abcdef01234567";

/** A failed, anomalous password attempt on Ducker ID itself. */
export const FAILED_RECORD: AdminLoginHistoryItem = {
  _id: STUB_ID,
  method: "password",
  status: "failed",
  failReason: "INVALID_CREDENTIALS",
  ip: "203.0.113.9",
  country: "Vietnam",
  city: "Hanoi",
  deviceType: "DESKTOP",
  os: "Windows 10",
  browser: "Chrome 120",
  clientType: "web",
  userAgent: "Mozilla/5.0 (Windows NT 10.0)",
  createdAt: "2026-01-15T08:30:00.000Z",
  userId: "64b7f0c2e1a2b3c4d5e6f7a8",
  usernameAttempted: "victim@test.com",
  timezoneOffset: "+07:00",
  isAnomaly: true,
  anomalyReasons: ["new_device", "new_country"],
  source: "idp",
  app: null,
  interactive: true
};

/** A silent SSO hand-off to the satellite app "Match CV". */
export const SILENT_SSO_RECORD: AdminLoginHistoryItem = {
  _id: "0123456789abcdef01234569",
  method: "sso",
  status: "success",
  failReason: null,
  ip: "203.0.113.9",
  country: "Vietnam",
  city: "Hanoi",
  deviceType: "DESKTOP",
  os: "Windows 10",
  browser: "Chrome 120",
  clientType: "WEB",
  userAgent: "Mozilla/5.0 (Windows NT 10.0)",
  createdAt: "2026-01-15T08:30:00.000Z",
  userId: "64b7f0c2e1a2b3c4d5e6f7a8",
  usernameAttempted: "user@test.com",
  timezoneOffset: null,
  isAnomaly: false,
  anomalyReasons: [],
  source: "oauth",
  app: { id: "0123456789abcdef0123abcd", name: "Match CV", iconUrl: null },
  interactive: false
};
