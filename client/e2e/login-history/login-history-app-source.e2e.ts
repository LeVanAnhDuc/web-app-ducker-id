import { test, expect } from "@playwright/test";
import type { Page, Request } from "@playwright/test";

// login-history-app-source — where a sign-in went (Ducker ID or a satellite
// app) and silent SSO rows. Runs under the `chromium` project (regular user).
//
// Two kinds of test:
//  - stubbed (`page.route`) for rendering, filters and i18n, so assertions do
//    not depend on what the shared DB already holds;
//  - real round-trips through /oauth/authorize with seeded clients, which
//    append login_histories rows. Append-only audit rows, nothing to revert.

const LIST_RE = /\/api\/v1\/login-history(\?|$)/;

const IDP_ROW = {
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

const SILENT_SSO_ROW = {
  ...IDP_ROW,
  _id: "0123456789abcdef01234568",
  method: "sso",
  source: "oauth",
  app: { id: "0123456789abcdef0123abcd", name: "Match CV", iconUrl: null },
  interactive: false
};

const stubList = (page: Page, items: unknown[], seen: Request[] = []) =>
  page.route(LIST_RE, (route) => {
    seen.push(route.request());
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        timestamp: new Date().toISOString(),
        path: "/api/v1/login-history",
        message: "ok",
        data: {
          items,
          meta: { total: items.length, page: 1, limit: 20, totalPages: 1 }
        }
      })
    });
  });

const lastQuery = (seen: Request[]) =>
  new URL(seen[seen.length - 1].url()).searchParams;

test.describe("My Login History — app source (stubbed)", () => {
  // Row 1 Happy + Row 8 DT: IdP row → "Ducker ID", no badge; silent SSO row →
  // app name + "Auto" badge.
  test("rows show Ducker ID or the app, and silent SSO carries the Auto badge", async ({
    page
  }) => {
    await stubList(page, [IDP_ROW, SILENT_SSO_ROW]);
    await page.goto("/login-history");

    const rows = page.getByRole("row");
    await expect(rows.filter({ hasText: "Ducker ID" })).toHaveCount(1);
    const ssoRow = rows.filter({ hasText: "Match CV" });
    await expect(ssoRow).toHaveCount(1);
    await expect(ssoRow.getByText("Auto", { exact: true })).toBeVisible();
    await expect(ssoRow.getByText("SSO", { exact: true })).toBeVisible();
    await expect(
      rows.filter({ hasText: "Ducker ID" }).getByText("Auto", { exact: true })
    ).toHaveCount(0);
  });

  // Row 7: nothing is hidden by default — the request carries no
  // interactive filter, so silent SSO rows show up next to manual logins.
  test("the default list sends no interactive filter and shows silent SSO", async ({
    page
  }) => {
    const seen: Request[] = [];
    await stubList(page, [IDP_ROW, SILENT_SSO_ROW], seen);

    await page.goto("/login-history");
    await expect(
      page.getByRole("row").filter({ hasText: "Match CV" })
    ).toBeVisible();
    expect(lastQuery(seen).has("interactive")).toBe(false);
  });

  // Row 7: method=SSO means every sign-in into an app, silent ones included.
  test("method = SSO sends method=sso and no interactive filter", async ({
    page
  }) => {
    const seen: Request[] = [];
    await stubList(page, [SILENT_SSO_ROW], seen);

    await page.goto("/login-history?method=sso");
    await expect(page.getByText("Match CV")).toBeVisible();
    expect(lastQuery(seen).get("method")).toBe("sso");
    expect(lastQuery(seen).has("interactive")).toBe(false);
  });

  // Row 7: app filter "Ducker ID" → source=idp, survives a reload (URL state).
  test("app filter = Ducker ID sends source=idp and survives reload", async ({
    page
  }) => {
    const seen: Request[] = [];
    await stubList(page, [IDP_ROW], seen);

    await page.goto("/login-history?app=idp");
    await expect(page.getByText("Ducker ID").first()).toBeVisible();
    expect(lastQuery(seen).get("source")).toBe("idp");

    await page.reload();
    await expect(page.getByText("Ducker ID").first()).toBeVisible();
    expect(lastQuery(seen).get("source")).toBe("idp");
  });

  // Row 5: filter yields nothing → empty state.
  test("filtering to an app with no sign-ins shows the empty state", async ({
    page
  }) => {
    await stubList(page, []);
    await page.goto("/login-history?app=idp");
    await expect(page.getByText("No login history found")).toBeVisible();
  });

  // Row 9 i18n (vi).
  test("vi locale renders the app column, badge and SSO method", async ({
    page
  }) => {
    await stubList(page, [SILENT_SSO_ROW]);
    await page.goto("/vi/login-history");
    await expect(
      page.getByRole("columnheader", { name: "Ứng dụng" })
    ).toBeVisible();
    await expect(page.getByText("Tự động", { exact: true })).toBeVisible();
  });
});

// ── real round-trips ──────────────────────────────────────────────────────

const PKCE_CHALLENGE = "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM";

const authorizeUrl = (clientId: string, redirectUri: string) =>
  `/oauth/authorize?${new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid",
    state: "e2e-app-source",
    code_challenge: PKCE_CHALLENGE,
    code_challenge_method: "S256"
  })}`;

test.describe("My Login History — app source (real SSO)", () => {
  // Row 1 + Row 7: an existing IdP session (sid cookie from auth.setup) gets
  // a code silently; the row shows up under method = SSO with the Auto badge.
  test("a silent SSO into IDMS Portal is recorded and shown under method = SSO", async ({
    page
  }) => {
    const res = await page.request.get(
      authorizeUrl(
        "client_idms_core",
        "https://idms.example.com/auth/callback"
      ),
      { maxRedirects: 0 }
    );
    expect(res.status()).toBe(302);
    expect(res.headers()["location"]).toContain(
      "https://idms.example.com/auth/callback?code="
    );

    await page.goto("/login-history?method=sso");
    const row = page
      .getByRole("row")
      .filter({ hasText: "IDMS Portal" })
      .first();
    await expect(row).toBeVisible();
    await expect(row.getByText("Auto", { exact: true })).toBeVisible();
  });

  // Row 3 AuthZ: a regular user is not entitled to the admin-only app →
  // access_denied, recorded as a failed SSO row for that app.
  test("an SSO denied for missing role is recorded as failed", async ({
    page
  }) => {
    const res = await page.request.get(
      authorizeUrl(
        "client_analytics_2b7d",
        "https://analytics.example.com/auth/callback"
      ),
      { maxRedirects: 0 }
    );
    expect(res.status()).toBe(302);
    expect(res.headers()["location"]).toContain("error=access_denied");

    await page.goto("/login-history?method=sso");
    const row = page
      .getByRole("row")
      .filter({ hasText: "Analytics Dashboard" })
      .first();
    await expect(row).toBeVisible();
    await expect(row.getByText("Failed", { exact: true })).toBeVisible();
  });
});
