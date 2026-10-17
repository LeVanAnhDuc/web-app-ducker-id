import { test, expect } from "@/fixtures";
import type { APIRequestContext } from "@playwright/test";
import type { ApiClient } from "@/api";
import type { MyLoginHistoryPage } from "@/api/login-history.client";
import { dataOf, sessionOf } from "@/api/response";
import { apiAs } from "@/api/session";
import { ADMIN_EMAIL, ADMIN_PASSWORD } from "@/config/accounts";
import { createAccount } from "@/utils/accounts";
import { authRequest, locationOf, param, type OidcClient } from "@/utils/oidc";
import {
  idpSession,
  obtainCode,
  registerClient,
  retireClients
} from "@/utils/oidc-state";

// A code handed to a satellite app is audited as an SSO sign-in carrying
// the app (services/authorize.ts#auditAppSignIn — fire-and-forget, so polled).
// Test case: test-cases/oidc.md (TC-OIDC-046).

test.use({ role: "guest" });

let admin: APIRequestContext;
let conf: OidcClient;

test.beforeAll(async () => {
  admin = await apiAs(ADMIN_EMAIL, ADMIN_PASSWORD);
  conf = await registerClient(admin, {
    kind: "confidential",
    label: "history"
  });
});

test.afterAll(async () => {
  await retireClients(admin, [conf]);
});

/** The account's own login-history rows that came from a satellite app. */
async function ssoRows(api: ApiClient, accessToken: string) {
  const res = await api.as({ accessToken }).loginHistory.list({ limit: 50 });
  expect(res.ok(), `login-history → ${res.status()}`).toBeTruthy();
  const { items } = await dataOf<MyLoginHistoryPage>(res);
  return items.filter((i) => i.source === "oauth");
}

test(
  "A satellite sign-in is recorded in login history with its app",
  { tag: "@TC-OIDC-046" },
  async ({ api, newApi }) => {
    const account = await createAccount({ tag: "oidc-history" });

    // Interactive: guest → login page → sign in → resume auth_req.
    const pending = locationOf(
      await api.oauth.authorize(authRequest(conf).params)
    );
    const id = param(pending, "auth_req")!;
    const { accessToken } = await sessionOf(
      await api.auth.login(account.email, account.password)
    );
    const resumed = locationOf(await api.oauth.authorize({ auth_req: id }));
    expect(param(resumed, "code")).toBeTruthy();

    const reader = await newApi();
    await expect
      .poll(async () => (await ssoRows(reader, accessToken)).length, {
        timeout: 10_000
      })
      .toBe(1);

    // Silent: a second session straight to a code.
    const second = await idpSession(account.email, account.password);
    try {
      await obtainCode(second.ctx, conf);
    } finally {
      await second.ctx.dispose();
    }

    await expect
      .poll(async () => (await ssoRows(reader, accessToken)).length, {
        timeout: 10_000
      })
      .toBe(2);

    const rows = await ssoRows(reader, accessToken); // newest first
    for (const row of rows) {
      expect(row).toMatchObject({
        method: "sso",
        status: "success",
        source: "oauth",
        app: { id: conf.id, name: conf.displayName }
      });
    }
    expect(rows.map((r) => r.interactive)).toEqual([false, true]);
  }
);
