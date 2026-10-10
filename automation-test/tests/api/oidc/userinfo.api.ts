import { test, expect, apiAs } from "@fixtures";
import type { APIRequestContext } from "@fixtures";
import { ADMIN_EMAIL, ADMIN_PASSWORD } from "@helpers/env";
import {
  decodeJwt,
  exchangeCode,
  guestContext,
  obtainCode,
  registerClient,
  retireClients,
  signedInUser,
  tamperSignature
} from "@helpers/oidc";
import type { OidcClient, SignedIn, TokenSet } from "@helpers/oidc";

// GET /oauth/userinfo — oauth.controller.ts#userInfo.

test.use({ role: "guest" });

let admin: APIRequestContext;
let conf: OidcClient;

test.beforeAll(async () => {
  admin = await apiAs(ADMIN_EMAIL, ADMIN_PASSWORD);
  conf = await registerClient(admin, { kind: "confidential", label: "userinfo" });
});

test.afterAll(async () => {
  await retireClients(admin, [conf]);
});

let me: SignedIn | undefined;
test.afterEach(async () => {
  await me?.ctx.dispose().catch(() => undefined);
  me = undefined;
});

async function signedInTokens(): Promise<TokenSet> {
  me = await signedInUser("oidc-userinfo");
  const got = await obtainCode(me.ctx, conf);
  const res = await exchangeCode(me.ctx, {
    client: conf,
    code: got.code,
    verifier: got.verifier
  });
  expect(res.status(), await res.text()).toBe(200);
  return (await res.json()) as TokenSet;
}

async function userinfo(ctx: APIRequestContext, authorization?: string) {
  return ctx.get("/oauth/userinfo", {
    headers: authorization ? { Authorization: authorization } : {}
  });
}

function expectNoClaims(body: Record<string, unknown>) {
  for (const claim of ["sub", "email", "name"]) expect(body).not.toHaveProperty(claim);
}

test(
  "a valid access token returns the user's claims",
  { tag: ["@TC-OIDC-036", "@smoke"] },
  async () => {
    const tokens = await signedInTokens();
    const res = await userinfo(me!.ctx, `Bearer ${tokens.access_token}`);
    expect(res.status()).toBe(200);
    expect(res.headers()["cache-control"]).toBe("no-store");
    const body = (await res.json()) as Record<string, unknown>;
    expect(body).toEqual({
      sub: decodeJwt(tokens.id_token).payload.sub,
      name: me!.account.fullName,
      picture: null,
      email: me!.account.email,
      email_verified: true
    });
    expect(body.sub).toBe(me!.userId);
  }
);

test(
  "userinfo without a Bearer token is refused",
  { tag: "@TC-OIDC-037" },
  async () => {
    const ctx = await guestContext();
    try {
      for (const header of [undefined, "Basic dTpw", "Bearer ", "bearer abc.def.ghi"]) {
        const res = await userinfo(ctx, header);
        expect(res.status(), `Authorization: ${header}`).toBeGreaterThanOrEqual(400);
        expect(res.status()).toBeLessThan(500);
        const body = (await res.json()) as Record<string, unknown>;
        expect(body.error, `Authorization: ${header}`).toEqual(expect.any(String));
        expectNoClaims(body);
      }
    } finally {
      await ctx.dispose();
    }
  }
);

test(
  "userinfo with a malformed or tampered token is refused",
  { tag: "@TC-OIDC-038" },
  async () => {
    const tokens = await signedInTokens();
    const [h, p] = tokens.access_token.split(".");
    const noneHeader = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString(
      "base64url"
    );
    for (const [label, token] of [
      ["random string", "not-a-jwt"],
      ["tampered signature", tamperSignature(tokens.access_token)],
      ["alg none", `${noneHeader}.${p}.`],
      ["payload swapped", `${h}.${Buffer.from('{"sub":"x"}').toString("base64url")}.${tokens.access_token.split(".")[2]}`]
    ]) {
      const res = await userinfo(me!.ctx, `Bearer ${token}`);
      expect(res.status(), label).toBeGreaterThanOrEqual(400);
      expect(res.status(), label).toBeLessThan(500);
      const body = (await res.json()) as Record<string, unknown>;
      expect(body.error, label).toEqual(expect.any(String));
      expectNoClaims(body);
    }
  }
);

test(
  "userinfo errors follow RFC 6750: 401 invalid_token with WWW-Authenticate",
  { tag: "@TC-OIDC-039" },
  async () => {
    // BUG: BUG-022 — userinfo answers 400 invalid_request / 400 invalid_grant with no WWW-Authenticate (RFC 6750 §3.1 wants 401 invalid_token).
    test.fail();
    const ctx = await guestContext();
    try {
      const missing = await userinfo(ctx);
      expect(missing.status()).toBe(401);
      expect(missing.headers()["www-authenticate"]).toMatch(/^Bearer/);

      const invalid = await userinfo(ctx, "Bearer not-a-jwt");
      expect(invalid.status()).toBe(401);
      expect(await invalid.json()).toMatchObject({ error: "invalid_token" });
      expect(invalid.headers()["www-authenticate"]).toContain('error="invalid_token"');
    } finally {
      await ctx.dispose();
    }
  }
);

test(
  "an ID token presented to userinfo is refused cleanly",
  { tag: "@TC-OIDC-040" },
  async () => {
    // BUG: BUG-009 — an id_token passes verifyOAuthAccessToken (same key + issuer, no typ/aud check), has no authId, and userinfo crashes with 500 server_error.
    test.fail();
    const tokens = await signedInTokens();
    const res = await userinfo(me!.ctx, `Bearer ${tokens.id_token}`);
    expect(res.status()).toBe(401);
    expectNoClaims((await res.json()) as Record<string, unknown>);
  }
);

test(
  "a first-party Ducker ID access token is not accepted by userinfo",
  { tag: "@TC-OIDC-041" },
  async () => {
    // BUG: BUG-008 — verifyOAuthAccessToken checks issuer but not audience, so a first-party token (aud = issuer) gets 200 { sub } from userinfo.
    test.fail();
    me = await signedInUser("oidc-userinfo-fp");
    const res = await userinfo(me.ctx, `Bearer ${me.accessToken}`);
    expect(res.status()).toBe(401);
    expectNoClaims((await res.json()) as Record<string, unknown>);
  }
);
