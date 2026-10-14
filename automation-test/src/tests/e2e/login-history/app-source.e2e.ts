import { test, expect } from "@/fixtures";
import type { Request } from "@playwright/test";
import { adminContext } from "@/api/session";
import { copy, copyVi } from "@/data/copy";
import { LoginHistoryPage } from "@/pages/dashboard/login-history.page";
import { authRequest, type OidcClient } from "@/utils/oidc";
import {
  authorize,
  deleteOidcClients,
  registerClient
} from "@/utils/oidc-state";
import { IDP_ROW, lastQuery, SILENT_SSO_ROW, stubList } from "./helpers";

// Where a sign-in went (Ducker ID or a satellite app) and silent SSO rows,
// on the user's own /login-history. Role: user (user@test.com).
// Test cases: test-cases/login-history.md (TC-LOGINHISTORY-004 … 011).
//
// Two kinds of test:
//  - stubbed (`page.route`) for rendering, filters and i18n, so assertions do
//    not depend on what the shared DB already holds;
//  - real round-trips through /oauth/authorize on the seeded user's IdP
//    session, into OAuth clients this file registers (one for the user, one
//    admin-only). Deleting the clients in afterAll also deletes the login
//    history and recent-app rows they produced.

const t = copy.loginHistory;
const SSO_APP = SILENT_SSO_ROW.app!.name;

test.describe("My Login History — app source (stubbed)", () => {
  // Row 1 Happy + Row 8 DT: IdP row → "Ducker ID", no badge; silent SSO row →
  // app name + "Auto" badge.
  test(
    'Rows show Ducker ID or the app; silent SSO carries "Auto"',
    { tag: ["@TC-LOGINHISTORY-004", "@smoke"] },
    async ({ page, loginHistoryPage: list }) => {
      await stubList(page, [IDP_ROW, SILENT_SSO_ROW]);
      await list.goto();

      await expect(list.row(t.app.idp)).toHaveCount(1);
      const ssoRow = list.row(SSO_APP);
      await expect(ssoRow).toHaveCount(1);
      await expect(list.exactText(t.app.silent, ssoRow)).toBeVisible();
      await expect(list.exactText(t.method.sso, ssoRow)).toBeVisible();
      await expect(
        list.exactText(t.app.silent, list.row(t.app.idp))
      ).toHaveCount(0);
    }
  );

  // Row 7: nothing is hidden by default — the request carries no
  // interactive filter, so silent SSO rows show up next to manual logins.
  test(
    "The default list hides nothing",
    { tag: "@TC-LOGINHISTORY-005" },
    async ({ page, loginHistoryPage: list }) => {
      const seen: Request[] = [];
      await stubList(page, [IDP_ROW, SILENT_SSO_ROW], { seen });

      await list.goto();
      await expect(list.row(SSO_APP)).toBeVisible();
      expect(lastQuery(seen).has("interactive")).toBe(false);
    }
  );

  // Row 7: method=SSO means every sign-in into an app, silent ones included.
  test(
    "Method = SSO includes silent sign-ins",
    { tag: "@TC-LOGINHISTORY-006" },
    async ({ page, loginHistoryPage: list }) => {
      const seen: Request[] = [];
      await stubList(page, [SILENT_SSO_ROW], { seen });

      await list.goto("?method=sso");
      await expect(list.text(SSO_APP)).toBeVisible();
      expect(lastQuery(seen).get("method")).toBe("sso");
      expect(lastQuery(seen).has("interactive")).toBe(false);
    }
  );

  // Row 7: app filter "Ducker ID" → source=idp, survives a reload (URL state).
  test(
    'App filter "Ducker ID" maps to `source=idp` and survives reload',
    { tag: "@TC-LOGINHISTORY-007" },
    async ({ page, loginHistoryPage: list }) => {
      const seen: Request[] = [];
      await stubList(page, [IDP_ROW], { seen });

      await list.goto("?app=idp");
      await expect(list.text(t.app.idp).first()).toBeVisible();
      expect(lastQuery(seen).get("source")).toBe("idp");

      await page.reload();
      await expect(list.text(t.app.idp).first()).toBeVisible();
      expect(lastQuery(seen).get("source")).toBe("idp");
    }
  );

  // Row 5: filter yields nothing → empty state.
  test(
    "A filter with no match shows the empty state",
    { tag: "@TC-LOGINHISTORY-008" },
    async ({ page, loginHistoryPage: list }) => {
      await stubList(page, []);
      await list.goto("?app=idp");
      await expect(list.emptyState()).toBeVisible();
    }
  );

  // Row 9 i18n (vi).
  test(
    "App column and badge in Vietnamese",
    { tag: "@TC-LOGINHISTORY-009" },
    async ({ page }) => {
      const list = new LoginHistoryPage(page, copyVi, "/vi");
      await stubList(page, [SILENT_SSO_ROW]);
      await list.goto();
      await expect(
        list.columnHeader(copyVi.loginHistory.table.app)
      ).toBeVisible();
      await expect(
        list.exactText(copyVi.loginHistory.app.silent)
      ).toBeVisible();
    }
  );
});

// ── real round-trips ──────────────────────────────────────────────────────

test.describe("My Login History — app source (real SSO)", () => {
  test.describe.configure({ mode: "serial" });

  let userApp: OidcClient | undefined;
  let adminOnlyApp: OidcClient | undefined;

  test.beforeAll(async () => {
    const admin = await adminContext();
    userApp = await registerClient(admin, {
      kind: "public",
      label: "loghist-sso"
    });
    adminOnlyApp = await registerClient(admin, {
      kind: "public",
      label: "loghist-denied",
      requiredRoles: ["admin"]
    });
    await admin.dispose();
  });

  test.afterAll(async () => {
    await deleteOidcClients(
      [userApp, adminOnlyApp].filter((c): c is OidcClient => Boolean(c))
    );
  });

  // An existing IdP session (sid cookie from the setup login) gets a code
  // silently; the row shows up under method = SSO with the Auto badge.
  test(
    "A real silent SSO is recorded and listed",
    { tag: ["@TC-LOGINHISTORY-010", "@smoke"] },
    async ({ page, loginHistoryPage: list }) => {
      const { status, location } = await authorize(
        page.request,
        authRequest(userApp!).params
      );
      expect(status).toBe(302);
      expect(location?.searchParams.get("code")).toBeTruthy();

      await list.goto("?method=sso");
      const row = list.row(userApp!.displayName).first();
      await expect(row).toBeVisible();
      await expect(list.exactText(t.app.silent, row)).toBeVisible();
      await expect(list.exactText(t.status.success, row)).toBeVisible();
    }
  );

  // A regular user is not entitled to an admin-only app → access_denied,
  // recorded as a failed SSO row for that app.
  test(
    "An SSO denied for a missing role is recorded as failed",
    { tag: "@TC-LOGINHISTORY-011" },
    async ({ page, loginHistoryPage: list }) => {
      const { status, location } = await authorize(
        page.request,
        authRequest(adminOnlyApp!).params
      );
      expect(status).toBe(302);
      expect(location?.searchParams.get("error")).toBe("access_denied");

      await list.goto("?method=sso");
      const row = list.row(adminOnlyApp!.displayName).first();
      await expect(row).toBeVisible();
      await expect(list.exactText(t.status.failed, row)).toBeVisible();
    }
  );
});
