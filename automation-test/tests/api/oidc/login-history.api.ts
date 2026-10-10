import { test, expect, apiAs } from "@fixtures";
import type { APIRequestContext } from "@fixtures";
import { createAccount } from "@helpers/accounts";
import { ADMIN_EMAIL, ADMIN_PASSWORD } from "@helpers/env";
import {
  authRequest,
  authorize,
  guestContext,
  idpSession,
  obtainCode,
  param,
  registerClient,
  retireClients
} from "@helpers/oidc";
import type { OidcClient } from "@helpers/oidc";

// A code handed to a satellite app is audited as an SSO sign-in carrying
// the app (services/authorize.ts#auditAppSignIn — fire-and-forget, so polled).

test.use({ role: "guest" });

let admin: APIRequestContext;
let conf: OidcClient;

test.beforeAll(async () => {
  admin = await apiAs(ADMIN_EMAIL, ADMIN_PASSWORD);
  conf = await registerClient(admin, { kind: "confidential", label: "history" });
});

test.afterAll(async () => {
  await retireClients(admin, [conf]);
});

type HistoryItem = {
  method: string;
  status: string;
  source: string;
  interactive: boolean;
  app: { id: string | null; name: string } | null;
};

async function ssoRows(token: string): Promise<HistoryItem[]> {
  const api = await guestContext();
  try {
    const res = await api.get("/api/v1/login-history?limit=50", {
      headers: { Authorization: `Bearer ${token}` }
    });
    expect(res.ok(), `login-history → ${res.status()}`).toBeTruthy();
    const { data } = (await res.json()) as { data: { items: HistoryItem[] } };
    return data.items.filter((i) => i.source === "oauth");
  } finally {
    await api.dispose();
  }
}

test(
  "silent and interactive satellite sign-ins are recorded with the app",
  { tag: "@TC-OIDC-046" },
  async () => {
    const account = await createAccount({ tag: "oidc-history" });

    // Interactive: guest → login page → sign in → resume auth_req.
    const ctx = await guestContext();
    let accessToken: string;
    try {
      const pending = await authorize(ctx, authRequest(conf).params);
      const id = param(pending.location, "auth_req")!;
      const login = await ctx.post("/api/v1/auth/login", {
        data: { email: account.email, password: account.password }
      });
      expect(login.ok()).toBeTruthy();
      accessToken = ((await login.json()) as { data: { accessToken: string } }).data
        .accessToken;
      const resumed = await authorize(ctx, { auth_req: id });
      expect(param(resumed.location, "code")).toBeTruthy();
    } finally {
      await ctx.dispose();
    }

    await expect
      .poll(async () => (await ssoRows(accessToken)).length, { timeout: 10_000 })
      .toBe(1);

    // Silent: a second session straight to a code.
    const second = await idpSession(account.email, account.password);
    try {
      await obtainCode(second.ctx, conf);
    } finally {
      await second.ctx.dispose();
    }

    await expect
      .poll(async () => (await ssoRows(accessToken)).length, { timeout: 10_000 })
      .toBe(2);

    const rows = await ssoRows(accessToken); // newest first
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
