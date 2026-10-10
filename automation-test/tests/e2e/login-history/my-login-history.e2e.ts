import { test, expect } from "@fixtures";
import type { Page } from "@playwright/test";

// The user's own Login History page (/login-history) — how IP and location
// are rendered. Role: user. Read-only; `page.route` stubs the list endpoint
// so assertions do not depend on the data.
// Test cases: test-cases/login-history.md (TC-LOGHIST-001 … 003).

// List endpoint: GET /api/v1/login-history?... (CONSTANTS.END_POINTS.LOGIN_HISTORY
// = "/login-history", proxied to the BE under /api/v1). Anchor to avoid
// matching the sibling /login-history/stats endpoint (now shown on Home).
const LIST_RE = /\/api\/v1\/login-history(\?|$)/;

const LOCAL_ITEM = {
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

const fulfillList = (page: Page) =>
  page.route(LIST_RE, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        timestamp: new Date().toISOString(),
        path: "/api/v1/login-history",
        message: "ok",
        data: {
          items: [LOCAL_ITEM],
          meta: { total: 1, page: 1, limit: 20, totalPages: 1 }
        }
      })
    })
  );

test.describe("My Login History — location/IP rendering (LOCAL)", () => {
  // Row 1 Happy + Row 4 EP [country="LOCAL"/ip loopback] + Row 8 DT
  // [city sentinel → country-label only] (en). The row must show the
  // normalized loopback IP (never the raw `::1`/`::ffff:` forms the BE used to
  // emit) and the localized "Local" label (never the raw "LOCAL" sentinel).
  test(
    "row shows normalized loopback IP and the localized Local label (en)",
    { tag: "@TC-LOGHIST-001" },
    async ({ page }) => {
      await fulfillList(page);
      await page.goto("/login-history");
      await expect(page.getByText("127.0.0.1")).toBeVisible();
      await expect(page.getByText("::1")).toHaveCount(0);
      await expect(page.getByText("::ffff:", { exact: false })).toHaveCount(0);
      await expect(page.getByText("Local", { exact: true })).toBeVisible();
      await expect(page.getByText("LOCAL", { exact: true })).toHaveCount(0);
    }
  );

  // Row 9 i18n (vi). Same LOCAL stub under the vi locale — label must be the
  // vi translation "Nội bộ (Local)", never the raw "LOCAL" sentinel.
  test(
    "row shows the vi label 'Nội bộ (Local)', not the raw sentinel",
    { tag: "@TC-LOGHIST-002" },
    async ({ page }) => {
      await fulfillList(page);
      await page.goto("/vi/login-history");
      await expect(
        page.getByText("Nội bộ (Local)", { exact: true })
      ).toBeVisible();
      await expect(page.getByText("LOCAL", { exact: true })).toHaveCount(0);
    }
  );
});

test.describe("My Login History — stats moved to Home", () => {
  test(
    "the page no longer renders the summary stat cards",
    { tag: "@TC-LOGHIST-003" },
    async ({ page }) => {
      await fulfillList(page);
      await page.goto("/login-history");
      await expect(page.getByText("127.0.0.1")).toBeVisible();
      await expect(
        page.getByRole("group", { name: /^Total Logins:/ })
      ).toHaveCount(0);
    }
  );
});
