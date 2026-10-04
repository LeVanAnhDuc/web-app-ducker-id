import { test, expect } from "@playwright/test";
import type { Page, Request } from "@playwright/test";

// login-history-app-source, admin side. Runs under the `admin` project. Every
// response is stubbed with `page.route`; nothing touches the DB.

const LIST_RE = /\/api\/v1\/admin\/login-history(\?|$)/;
const DETAIL_ID = "0123456789abcdef01234569";

const SILENT_SSO_RECORD = {
  _id: DETAIL_ID,
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

const envelope = (path: string, data: unknown) =>
  JSON.stringify({
    timestamp: new Date().toISOString(),
    path,
    message: "ok",
    data
  });

const stubList = (page: Page, seen: Request[]) =>
  page.route(LIST_RE, (route) => {
    seen.push(route.request());
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: envelope("/api/v1/admin/login-history", {
        items: [SILENT_SSO_RECORD],
        meta: { total: 1, page: 1, limit: 20, totalPages: 1 }
      })
    });
  });

test.describe("Admin Login History — app source", () => {
  // Row 1 + Row 7: admin sees every row by default (no interactive param) and
  // the app column renders the satellite app with the Auto badge.
  test("list shows the app column and sends no interactive filter by default", async ({
    page
  }) => {
    const seen: Request[] = [];
    await stubList(page, seen);
    await page.goto("/admin/login-history");

    const row = page.getByRole("row").filter({ hasText: "Match CV" });
    await expect(row).toBeVisible();
    await expect(row.getByText("Auto", { exact: true })).toBeVisible();
    const query = new URL(seen[seen.length - 1].url()).searchParams;
    expect(query.has("interactive")).toBe(false);
  });

  test("signIn=interactive sends interactive=true", async ({ page }) => {
    const seen: Request[] = [];
    await stubList(page, seen);
    await page.goto("/admin/login-history?signIn=interactive");
    await expect(page.getByText("Match CV")).toBeVisible();
    const query = new URL(seen[seen.length - 1].url()).searchParams;
    expect(query.get("interactive")).toBe("true");
  });

  // Row 8: detail adds Source / App / Sign-in type.
  test("detail shows source, app and sign-in type", async ({ page }) => {
    await page.route("**/api/v1/admin/login-history/*", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: envelope("/api/v1/admin/login-history", SILENT_SSO_RECORD)
      })
    );
    await page.goto(`/admin/login-history/${DETAIL_ID}`);

    await expect(page.getByText("Satellite app (OIDC)")).toBeVisible();
    await expect(page.getByText("Match CV")).toBeVisible();
    await expect(
      page.getByText("Automatic SSO (existing session)")
    ).toBeVisible();
  });
});
