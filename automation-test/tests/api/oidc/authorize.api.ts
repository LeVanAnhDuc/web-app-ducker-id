import { test, expect, apiAs } from "@fixtures";
import type { APIRequestContext } from "@fixtures";
import { createAccount } from "@helpers/accounts";
import { ADMIN_EMAIL, ADMIN_PASSWORD } from "@helpers/env";
import {
  ISSUER,
  OTHER_REDIRECT_URI,
  REDIRECT_URI,
  authRequest,
  authorize,
  codeKey,
  exchangeCode,
  findPendingKeysFor,
  guestContext,
  isAt,
  keyExists,
  keyTtl,
  obtainCode,
  param,
  pendingKey,
  registerClient,
  retireClients,
  setClientStatus,
  signedInUser
} from "@helpers/oidc";
import type { OidcClient, SignedIn } from "@helpers/oidc";

// /oauth/authorize — parameter validation, PKCE, client / redirect_uri trust,
// session handling. Source: server/src/modules/oauth/services/authorize.ts.

test.use({ role: "guest" });

let admin: APIRequestContext;
let conf: OidcClient;
let pub: OidcClient;
let toggled: OidcClient;
let adminOnly: OidcClient;

test.beforeAll(async () => {
  admin = await apiAs(ADMIN_EMAIL, ADMIN_PASSWORD);
  conf = await registerClient(admin, { kind: "confidential", label: "authz-conf" });
  pub = await registerClient(admin, { kind: "public", label: "authz-pub" });
  toggled = await registerClient(admin, { kind: "confidential", label: "authz-toggle" });
  adminOnly = await registerClient(admin, {
    kind: "confidential",
    label: "authz-admin-only",
    requiredRoles: ["admin"]
  });
});

test.afterAll(async () => {
  await retireClients(admin, [conf, pub, toggled, adminOnly]);
});

let me: SignedIn;
test.beforeEach(async ({}, testInfo) => {
  // Cases that start as a guest create their own account.
  if (testInfo.tags.includes("@needs-session")) me = await signedInUser("oidc-authz");
});
test.afterEach(async () => {
  await me?.ctx.dispose().catch(() => undefined);
});

test(
  "signed-in user is redirected to the registered URI with code, state and iss",
  { tag: ["@TC-OIDC-004", "@smoke", "@needs-session"] },
  async () => {
    const req = authRequest(conf);
    const { status, location } = await authorize(me.ctx, req.params);
    expect(status).toBe(302);
    expect(isAt(location, REDIRECT_URI), String(location)).toBe(true);
    const code = param(location, "code");
    expect(code).toMatch(/^[0-9a-f]{64}$/);
    expect(param(location, "state")).toBe(req.state);
    expect(param(location, "iss")).toBe(ISSUER);
    expect(param(location, "error")).toBeNull();
    expect(await keyExists(codeKey(code!))).toBe(true);
  }
);

test(
  "authorize without code_challenge is refused for confidential and public clients",
  { tag: ["@TC-OIDC-005", "@needs-session"] },
  async () => {
    for (const client of [conf, pub]) {
      const req = authRequest(client, { code_challenge: undefined });
      const { status, location } = await authorize(me.ctx, req.params);
      expect(status, client.kind).toBe(302);
      expect(isAt(location, REDIRECT_URI)).toBe(true);
      expect(param(location, "error"), client.kind).toBe("invalid_request");
      expect(param(location, "error_description")).toBe("code_challenge is required");
      expect(param(location, "state")).toBe(req.state);
      expect(param(location, "code")).toBeNull();
    }
  }
);

test(
  "only code_challenge_method=S256 yields a code",
  { tag: ["@TC-OIDC-006", "@needs-session"] },
  async () => {
    const ok = await authorize(me.ctx, authRequest(conf).params);
    expect(param(ok.location, "code")).toBeTruthy();

    for (const method of ["plain", undefined, "s256", "RS256"]) {
      const req = authRequest(conf, { code_challenge_method: method });
      const { status, location } = await authorize(me.ctx, req.params);
      expect(status, `method=${method}`).toBe(302);
      expect(param(location, "error"), `method=${method}`).toBe("invalid_request");
      expect(param(location, "error_description")).toBe(
        "code_challenge_method must be S256"
      );
      expect(param(location, "code")).toBeNull();
    }
  }
);

test(
  "missing, empty or unknown client_id is rejected as JSON without a redirect",
  { tag: "@TC-OIDC-007" },
  async () => {
    const guest = await guestContext();
    try {
      const cases: [string | undefined, number, string][] = [
        [undefined, 400, "invalid_request"],
        ["", 400, "invalid_request"],
        ["client_unknown000", 401, "invalid_client"]
      ];
      for (const [clientId, httpStatus, error] of cases) {
        const req = authRequest(conf, { client_id: clientId });
        const { res, status, location } = await authorize(guest, req.params);
        expect(status, `client_id=${clientId}`).toBe(httpStatus);
        expect(location, "must not redirect").toBeNull();
        expect(await res.json()).toMatchObject({ error });
      }
    } finally {
      await guest.dispose();
    }
  }
);

test(
  "a deactivated client cannot start a sign-in until reactivated",
  { tag: ["@TC-OIDC-008", "@needs-session"] },
  async () => {
    const active = await authorize(me.ctx, authRequest(toggled).params);
    expect(param(active.location, "code")).toBeTruthy();

    await setClientStatus(admin, toggled, "inactive");
    try {
      const { res, status, location } = await authorize(
        me.ctx,
        authRequest(toggled).params
      );
      expect(status).toBe(401);
      expect(location).toBeNull();
      expect(await res.json()).toMatchObject({ error: "invalid_client" });
    } finally {
      await setClientStatus(admin, toggled, "active");
    }

    const again = await authorize(me.ctx, authRequest(toggled).params);
    expect(param(again.location, "code")).toBeTruthy();
  }
);

test(
  "unregistered redirect URIs are rejected as JSON and never redirected to",
  { tag: ["@TC-OIDC-009", "@needs-session"] },
  async () => {
    const variants: (string | undefined)[] = [
      "https://attacker.example.net/callback",
      `${REDIRECT_URI}/`,
      `${REDIRECT_URI}/extra`,
      `${REDIRECT_URI}?next=1`,
      REDIRECT_URI.replace("rp.e2e", "RP.e2e"),
      REDIRECT_URI.replace("https:", "http:"),
      "https://rp.e2e.example.com/callbac",
      undefined
    ];
    for (const uri of variants) {
      const req = authRequest(conf, { redirect_uri: uri });
      const { res, status, location } = await authorize(me.ctx, req.params);
      expect(status, `redirect_uri=${uri}`).toBe(400);
      expect(location, `redirected for ${uri}`).toBeNull();
      expect(await res.json()).toMatchObject({
        error: "invalid_request",
        error_description: "redirect_uri does not match a registered value"
      });
    }
  }
);

test(
  "a second registered redirect URI is honoured end to end",
  { tag: ["@TC-OIDC-010", "@needs-session"] },
  async () => {
    const got = await obtainCode(me.ctx, conf, { redirect_uri: OTHER_REDIRECT_URI });
    const res = await exchangeCode(me.ctx, {
      client: conf,
      code: got.code,
      verifier: got.verifier,
      redirectUri: OTHER_REDIRECT_URI
    });
    expect(res.status(), await res.text()).toBe(200);
  }
);

test(
  "response_type other than code is unsupported",
  { tag: ["@TC-OIDC-011", "@needs-session"] },
  async () => {
    for (const rt of ["token", "id_token", "code id_token", undefined]) {
      const req = authRequest(conf, { response_type: rt });
      const { status, location } = await authorize(me.ctx, req.params);
      expect(status, `response_type=${rt}`).toBe(302);
      expect(isAt(location, REDIRECT_URI)).toBe(true);
      expect(param(location, "error"), `response_type=${rt}`).toBe(
        "unsupported_response_type"
      );
      expect(param(location, "state")).toBe(req.state);
      expect(param(location, "code")).toBeNull();
      expect(location?.hash ?? "").not.toContain("token");
    }
  }
);

test(
  "scope must include openid and stay within the client's scopes",
  { tag: ["@TC-OIDC-012", "@needs-session"] },
  async () => {
    const ok = await authorize(me.ctx, authRequest(conf, { scope: "openid" }).params);
    expect(param(ok.location, "code")).toBeTruthy();

    for (const scope of [
      "profile email",
      undefined,
      "",
      "openid admin",
      "openid offline_access"
    ]) {
      const req = authRequest(conf, { scope });
      const { status, location } = await authorize(me.ctx, req.params);
      expect(status, `scope=${scope}`).toBe(302);
      expect(param(location, "error"), `scope=${scope}`).toBe("invalid_scope");
      expect(param(location, "state")).toBe(req.state);
      expect(param(location, "code")).toBeNull();
    }
  }
);

test(
  "state is echoed verbatim on success and error, and omitted when not sent",
  { tag: ["@TC-OIDC-013", "@needs-session"] },
  async () => {
    const tricky = "a&b=c+d/e ?f#g%20h~é";

    const ok = await authorize(me.ctx, authRequest(conf, { state: tricky }).params);
    expect(param(ok.location, "code")).toBeTruthy();
    expect(param(ok.location, "state")).toBe(tricky);

    const err = await authorize(
      me.ctx,
      authRequest(conf, { state: tricky, response_type: "token" }).params
    );
    expect(param(err.location, "error")).toBe("unsupported_response_type");
    expect(param(err.location, "state")).toBe(tricky);

    const none = await authorize(me.ctx, authRequest(conf, { state: undefined }).params);
    expect(param(none.location, "code")).toBeTruthy();
    expect(none.location!.searchParams.has("state")).toBe(false);
  }
);

test(
  "a guest is sent to the login page with a stored authorize request",
  { tag: "@TC-OIDC-014" },
  async ({ baseURL }) => {
    const guest = await guestContext();
    try {
      const { status, location } = await authorize(guest, authRequest(conf).params);
      expect(status).toBe(302);
      expect(location!.origin).toBe(new URL(baseURL!).origin);
      expect(location!.pathname).toBe("/login");
      const id = param(location, "auth_req");
      expect(id).toMatch(/^[0-9a-f]{32}$/);
      expect(param(location, "app")).toBe(conf.displayName);
      expect(param(location, "code")).toBeNull();

      const ttl = await keyTtl(pendingKey(id!));
      expect(ttl).toBeGreaterThan(590);
      expect(ttl).toBeLessThanOrEqual(600);
    } finally {
      await guest.dispose();
    }
  }
);

test(
  "the stored request resumes once after login, then is gone",
  { tag: "@TC-OIDC-015" },
  async () => {
    const account = await createAccount({ tag: "oidc-resume" });
    const ctx = await guestContext();
    try {
      const req = authRequest(conf);
      const first = await authorize(ctx, req.params);
      const id = param(first.location, "auth_req")!;
      expect(id).toBeTruthy();

      const login = await ctx.post("/api/v1/auth/login", {
        data: { email: account.email, password: account.password }
      });
      expect(login.ok()).toBeTruthy();

      const resumed = await authorize(ctx, { auth_req: id });
      expect(resumed.status).toBe(302);
      expect(isAt(resumed.location, REDIRECT_URI), String(resumed.location)).toBe(true);
      expect(param(resumed.location, "state")).toBe(req.state);
      const code = param(resumed.location, "code")!;
      const tokens = await exchangeCode(ctx, {
        client: conf,
        code,
        verifier: req.verifier
      });
      expect(tokens.status(), await tokens.text()).toBe(200);

      for (const replay of [id, "0123456789abcdef0123456789abcdef"]) {
        const again = await authorize(ctx, { auth_req: replay });
        expect(again.status, `auth_req=${replay}`).toBe(400);
        expect(again.location).toBeNull();
        expect(await again.res.json()).toMatchObject({ error: "invalid_request" });
      }
    } finally {
      await ctx.dispose();
    }
  }
);

test(
  "prompt=none with a live session returns a code silently",
  { tag: ["@TC-OIDC-016", "@needs-session"] },
  async () => {
    const req = authRequest(conf, { prompt: "none" });
    const { status, location } = await authorize(me.ctx, req.params);
    expect(status).toBe(302);
    expect(isAt(location, REDIRECT_URI)).toBe(true);
    expect(param(location, "code")).toBeTruthy();
    expect(param(location, "state")).toBe(req.state);
  }
);

test(
  "prompt=none without a session returns login_required and stores nothing",
  { tag: "@TC-OIDC-017" },
  async () => {
    const guest = await guestContext();
    const forged = await guestContext();
    try {
      const forgedHeaders = { Cookie: `sid=${"f".repeat(64)}` };
      for (const [label, ctx, headers] of [
        ["no cookie", guest, {}],
        ["stale sid", forged, forgedHeaders]
      ] as const) {
        const req = authRequest(conf, { prompt: "none" });
        const before = await findPendingKeysFor(conf.clientId);
        const res = await ctx.get(
          `/oauth/authorize?${new URLSearchParams(req.params as Record<string, string>)}`,
          { maxRedirects: 0, headers }
        );
        const location = new URL(res.headers()["location"] ?? "about:blank");
        expect(res.status(), label).toBe(302);
        expect(isAt(location, REDIRECT_URI), `${label}: ${location}`).toBe(true);
        expect(param(location, "error"), label).toBe("login_required");
        expect(param(location, "state")).toBe(req.state);
        expect(location.pathname).not.toBe("/login");
        expect(await findPendingKeysFor(conf.clientId), label).toEqual(before);
      }
    } finally {
      await guest.dispose();
      await forged.dispose();
    }
  }
);

test(
  "a user without the app's required role is denied",
  { tag: ["@TC-OIDC-018", "@needs-session"] },
  async () => {
    const req = authRequest(adminOnly);
    const { status, location } = await authorize(me.ctx, req.params);
    expect(status).toBe(302);
    expect(isAt(location, REDIRECT_URI)).toBe(true);
    expect(param(location, "error")).toBe("access_denied");
    expect(param(location, "state")).toBe(req.state);
    expect(param(location, "code")).toBeNull();
  }
);
