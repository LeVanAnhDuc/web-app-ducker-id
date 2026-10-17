import { test, expect } from "@/fixtures";
import type { APIRequestContext } from "@playwright/test";
import { apiAs } from "@/api/session";
import { sessionOf } from "@/api/response";
import { ADMIN_EMAIL, ADMIN_PASSWORD } from "@/config/accounts";
import {
  OIDC_OTHER_REDIRECT_URI,
  OIDC_REDIRECT_URI,
  SEED_BLOG_CLIENT
} from "@/data/test-data";
import { createAccount } from "@/utils/accounts";
import {
  ISSUER,
  authRequest,
  challengeFor,
  isAt,
  locationOf,
  makeVerifier,
  param,
  type OidcClient,
  type TokenSet
} from "@/utils/oidc";
import {
  authorize,
  codeKey,
  findPendingKeysFor,
  obtainCode,
  pendingKey,
  registerClient,
  retireClients,
  setClientStatus,
  signedInUser,
  type SignedIn
} from "@/utils/oidc-state";
import { keyExists, keyTtl } from "@/utils/redis";

// /oauth/authorize — parameter validation, PKCE, client / redirect_uri trust,
// session handling, entitlement. Source: server/src/modules/oauth/services/authorize.ts.
// Test cases: test-cases/oidc.md (TC-OIDC-004 … 018, 052, 055).

test.use({ role: "guest" });

let admin: APIRequestContext;
let conf: OidcClient;
let pub: OidcClient;
let toggled: OidcClient;
let adminOnly: OidcClient;

test.beforeAll(async () => {
  admin = await apiAs(ADMIN_EMAIL, ADMIN_PASSWORD);
  conf = await registerClient(admin, {
    kind: "confidential",
    label: "authz-conf"
  });
  pub = await registerClient(admin, { kind: "public", label: "authz-pub" });
  toggled = await registerClient(admin, {
    kind: "confidential",
    label: "authz-toggle"
  });
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
  if (testInfo.tags.includes("@needs-session"))
    me = await signedInUser("oidc-authz");
});
test.afterEach(async () => {
  await me?.ctx.dispose().catch(() => undefined);
});

test(
  "Signed-in user gets a code at the registered redirect URI",
  { tag: ["@TC-OIDC-004", "@smoke", "@needs-session"] },
  async () => {
    const req = authRequest(conf);
    const { status, location } = await authorize(me.ctx, req.params);
    expect(status).toBe(302);
    expect(isAt(location, OIDC_REDIRECT_URI), String(location)).toBe(true);
    const code = param(location, "code");
    expect(code).toMatch(/^[0-9a-f]{64}$/);
    expect(param(location, "state")).toBe(req.state);
    expect(param(location, "iss")).toBe(ISSUER);
    expect(param(location, "error")).toBeNull();
    expect(await keyExists(codeKey(code!))).toBe(true);
  }
);

test(
  "Authorize without a code_challenge is refused",
  { tag: ["@TC-OIDC-005", "@needs-session", "@smoke"] },
  async () => {
    for (const client of [conf, pub]) {
      const req = authRequest(client, { code_challenge: undefined });
      const { status, location } = await authorize(me.ctx, req.params);
      expect(status, client.kind).toBe(302);
      expect(isAt(location, OIDC_REDIRECT_URI)).toBe(true);
      expect(param(location, "error"), client.kind).toBe("invalid_request");
      expect(param(location, "error_description")).toBe(
        "code_challenge is required"
      );
      expect(param(location, "state")).toBe(req.state);
      expect(param(location, "code")).toBeNull();
    }
  }
);

test(
  "Only code_challenge_method=S256 is accepted",
  { tag: ["@TC-OIDC-006", "@needs-session", "@smoke"] },
  async () => {
    const ok = await authorize(me.ctx, authRequest(conf).params);
    expect(param(ok.location, "code")).toBeTruthy();

    for (const method of ["plain", undefined, "s256", "RS256"]) {
      const req = authRequest(conf, { code_challenge_method: method });
      const { status, location } = await authorize(me.ctx, req.params);
      expect(status, `method=${method}`).toBe(302);
      expect(param(location, "error"), `method=${method}`).toBe(
        "invalid_request"
      );
      expect(param(location, "error_description")).toBe(
        "code_challenge_method must be S256"
      );
      expect(param(location, "code")).toBeNull();
    }
  }
);

test(
  "Missing or unknown client_id is rejected without a redirect",
  { tag: ["@TC-OIDC-007", "@smoke"] },
  async ({ api }) => {
    const cases: [string | undefined, number, string][] = [
      [undefined, 400, "invalid_request"],
      ["", 400, "invalid_request"],
      ["client_unknown000", 401, "invalid_client"]
    ];
    for (const [clientId, httpStatus, error] of cases) {
      const req = authRequest(conf, { client_id: clientId });
      const res = await api.oauth.authorize(req.params);
      expect(res.status(), `client_id=${clientId}`).toBe(httpStatus);
      expect(locationOf(res), "must not redirect").toBeNull();
      expect(await res.json()).toMatchObject({ error });
    }
  }
);

test(
  "A deactivated client cannot start a sign-in",
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
  "Unregistered redirect URIs are rejected as JSON, never redirected to",
  { tag: ["@TC-OIDC-009", "@needs-session", "@smoke"] },
  async () => {
    const variants: (string | undefined)[] = [
      "https://attacker.example.net/callback",
      `${OIDC_REDIRECT_URI}/`,
      `${OIDC_REDIRECT_URI}/extra`,
      `${OIDC_REDIRECT_URI}?next=1`,
      OIDC_REDIRECT_URI.replace("rp.e2e", "RP.e2e"),
      OIDC_REDIRECT_URI.replace("https:", "http:"),
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
  "Any of several registered redirect URIs is honoured exactly",
  { tag: ["@TC-OIDC-010", "@needs-session"] },
  async () => {
    const got = await obtainCode(me.ctx, conf, {
      redirect_uri: OIDC_OTHER_REDIRECT_URI
    });
    const res = await me.api.oauth.exchangeCode({
      client: conf,
      code: got.code,
      verifier: got.verifier,
      redirectUri: OIDC_OTHER_REDIRECT_URI
    });
    expect(res.status(), await res.text()).toBe(200);
  }
);

test(
  "Only response_type=code is supported",
  { tag: ["@TC-OIDC-011", "@needs-session"] },
  async () => {
    for (const rt of ["token", "id_token", "code id_token", undefined]) {
      const req = authRequest(conf, { response_type: rt });
      const { status, location } = await authorize(me.ctx, req.params);
      expect(status, `response_type=${rt}`).toBe(302);
      expect(isAt(location, OIDC_REDIRECT_URI)).toBe(true);
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
  "Scope must include openid and stay within the client's scopes",
  { tag: ["@TC-OIDC-012", "@needs-session"] },
  async () => {
    const ok = await authorize(
      me.ctx,
      authRequest(conf, { scope: "openid" }).params
    );
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
  "Repeated and extra-spaced scope values are normalised, not rejected",
  { tag: ["@TC-OIDC-055", "@needs-session"] },
  async () => {
    const got = await obtainCode(me.ctx, conf, {
      scope: "  openid   openid email  email "
    });
    const res = await me.api.oauth.exchangeCode({
      client: conf,
      code: got.code,
      verifier: got.verifier
    });
    expect(res.status(), await res.text()).toBe(200);
    expect(((await res.json()) as TokenSet).scope).toBe("openid email");
  }
);

test(
  "state is echoed verbatim on success and on error, and omitted when not sent",
  { tag: ["@TC-OIDC-013", "@needs-session"] },
  async () => {
    const tricky = "a&b=c+d/e ?f#g%20h~é";

    const ok = await authorize(
      me.ctx,
      authRequest(conf, { state: tricky }).params
    );
    expect(param(ok.location, "code")).toBeTruthy();
    expect(param(ok.location, "state")).toBe(tricky);

    const err = await authorize(
      me.ctx,
      authRequest(conf, { state: tricky, response_type: "token" }).params
    );
    expect(param(err.location, "error")).toBe("unsupported_response_type");
    expect(param(err.location, "state")).toBe(tricky);

    const none = await authorize(
      me.ctx,
      authRequest(conf, { state: undefined }).params
    );
    expect(param(none.location, "code")).toBeTruthy();
    expect(none.location!.searchParams.has("state")).toBe(false);
  }
);

test(
  "A guest is sent to the login page with a stored authorize request",
  { tag: ["@TC-OIDC-014", "@smoke"] },
  async ({ api, baseURL }) => {
    const res = await api.oauth.authorize(authRequest(conf).params);
    const location = locationOf(res);
    expect(res.status()).toBe(302);
    expect(location!.origin).toBe(new URL(baseURL!).origin);
    expect(location!.pathname).toBe("/login");
    const id = param(location, "auth_req");
    expect(id).toMatch(/^[0-9a-f]{32}$/);
    expect(param(location, "app")).toBe(conf.displayName);
    expect(param(location, "code")).toBeNull();

    const ttl = await keyTtl(pendingKey(id!));
    expect(ttl).toBeGreaterThan(590);
    expect(ttl).toBeLessThanOrEqual(600);
  }
);

test(
  "The stored request resumes after login once, and only once",
  { tag: "@TC-OIDC-015" },
  async ({ api }) => {
    const account = await createAccount({ tag: "oidc-resume" });
    const req = authRequest(conf);
    const first = locationOf(await api.oauth.authorize(req.params));
    const id = param(first, "auth_req")!;
    expect(id).toBeTruthy();

    // Same cookie jar: the login sets the sid the resumed request reads.
    await sessionOf(await api.auth.login(account.email, account.password));

    const resumed = await api.oauth.authorize({ auth_req: id });
    const at = locationOf(resumed);
    expect(resumed.status()).toBe(302);
    expect(isAt(at, OIDC_REDIRECT_URI), String(at)).toBe(true);
    expect(param(at, "state")).toBe(req.state);
    const code = param(at, "code")!;
    const tokens = await api.oauth.exchangeCode({
      client: conf,
      code,
      verifier: req.verifier
    });
    expect(tokens.status(), await tokens.text()).toBe(200);

    for (const replay of [id, "0123456789abcdef0123456789abcdef"]) {
      const again = await api.oauth.authorize({ auth_req: replay });
      expect(again.status(), `auth_req=${replay}`).toBe(400);
      expect(locationOf(again)).toBeNull();
      expect(await again.json()).toMatchObject({ error: "invalid_request" });
    }
  }
);

test(
  "prompt=none with a live session returns a code silently",
  { tag: ["@TC-OIDC-016", "@needs-session", "@smoke"] },
  async () => {
    const req = authRequest(conf, { prompt: "none" });
    const { status, location } = await authorize(me.ctx, req.params);
    expect(status).toBe(302);
    expect(isAt(location, OIDC_REDIRECT_URI)).toBe(true);
    expect(param(location, "code")).toBeTruthy();
    expect(param(location, "state")).toBe(req.state);
  }
);

test(
  "prompt=none without a session returns login_required, never a login screen",
  { tag: ["@TC-OIDC-017", "@smoke"] },
  async ({ api, newApi }) => {
    const forged = await newApi({ Cookie: `sid=${"f".repeat(64)}` });
    for (const [label, client] of [
      ["no cookie", api],
      ["stale sid", forged]
    ] as const) {
      const req = authRequest(conf, { prompt: "none" });
      const before = await findPendingKeysFor(conf.clientId);
      const res = await client.oauth.authorize(req.params);
      const location = locationOf(res) ?? new URL("about:blank");
      expect(res.status(), label).toBe(302);
      expect(isAt(location, OIDC_REDIRECT_URI), `${label}: ${location}`).toBe(
        true
      );
      expect(param(location, "error"), label).toBe("login_required");
      expect(param(location, "state")).toBe(req.state);
      expect(location.pathname).not.toBe("/login");
      expect(await findPendingKeysFor(conf.clientId), label).toEqual(before);
    }
  }
);

test(
  "A user without the app's required role is denied",
  { tag: ["@TC-OIDC-018", "@needs-session"] },
  async () => {
    const req = authRequest(adminOnly);
    const { status, location } = await authorize(me.ctx, req.params);
    expect(status).toBe(302);
    expect(isAt(location, OIDC_REDIRECT_URI)).toBe(true);
    expect(param(location, "error")).toBe("access_denied");
    expect(param(location, "state")).toBe(req.state);
    expect(param(location, "code")).toBeNull();
  }
);

// An admin qualifies for every app by default. Before access control,
// /oauth/authorize compared the session role against requiredRoles exactly,
// so an admin launching Blog ([user] only) got access_denied. Runs on the
// seeded admin's own IdP session (sid from the setup login); the code is
// never redeemed. Moved here from tests/e2e/admin-entitlements/admin-sso.e2e.ts
// (decisions/oidc.md Q4).
test.describe("as the seeded admin", () => {
  test.use({ role: "admin" });

  test(
    "An admin signs in to a user-only app",
    { tag: "@TC-OIDC-052" },
    async ({ api }) => {
      const res = await api.oauth.authorize({
        client_id: SEED_BLOG_CLIENT.clientId,
        redirect_uri: SEED_BLOG_CLIENT.redirectUri,
        response_type: "code",
        scope: "openid",
        state: "e2e-admin-sso",
        code_challenge: challengeFor(makeVerifier()),
        code_challenge_method: "S256"
      });

      expect(res.status()).toBe(302);
      expect(res.headers()["location"]).toContain(
        `${SEED_BLOG_CLIENT.redirectUri}?code=`
      );
    }
  );
});
