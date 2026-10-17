import { test, expect } from "@/fixtures";
import type { APIRequestContext } from "@playwright/test";
import { apiAs } from "@/api/session";
import { ADMIN_EMAIL, ADMIN_PASSWORD } from "@/config/accounts";
import { jwtPayload, tamperSignature } from "@/utils/jwt";
import type { OidcClient, TokenSet } from "@/utils/oidc";
import {
  obtainCode,
  registerClient,
  retireClients,
  signedInUser,
  type SignedIn
} from "@/utils/oidc-state";

// GET /oauth/userinfo — oauth.controller.ts#userInfo.
// Test cases: test-cases/oidc.md (TC-OIDC-036 … 041).

test.use({ role: "guest" });

let admin: APIRequestContext;
let conf: OidcClient;

test.beforeAll(async () => {
  admin = await apiAs(ADMIN_EMAIL, ADMIN_PASSWORD);
  conf = await registerClient(admin, {
    kind: "confidential",
    label: "userinfo"
  });
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
  const res = await me.api.oauth.exchangeCode({
    client: conf,
    code: got.code,
    verifier: got.verifier
  });
  expect(res.status(), await res.text()).toBe(200);
  return (await res.json()) as TokenSet;
}

function expectNoClaims(body: Record<string, unknown>) {
  for (const claim of ["sub", "email", "name"])
    expect(body).not.toHaveProperty(claim);
}

test(
  "userinfo returns the user's claims for a valid access token",
  { tag: ["@TC-OIDC-036", "@smoke"] },
  async () => {
    const tokens = await signedInTokens();
    const res = await me!.api.oauth.userinfo(`Bearer ${tokens.access_token}`);
    expect(res.status()).toBe(200);
    expect(res.headers()["cache-control"]).toBe("no-store");
    const body = (await res.json()) as Record<string, unknown>;
    expect(body).toEqual({
      sub: jwtPayload(tokens.id_token).sub,
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
  async ({ api }) => {
    for (const header of [
      undefined,
      "Basic dTpw",
      "Bearer ",
      "bearer abc.def.ghi"
    ]) {
      const res = await api.oauth.userinfo(header);
      expect(res.status(), `Authorization: ${header}`).toBeGreaterThanOrEqual(
        400
      );
      expect(res.status()).toBeLessThan(500);
      const body = (await res.json()) as Record<string, unknown>;
      expect(body.error, `Authorization: ${header}`).toEqual(
        expect.any(String)
      );
      expectNoClaims(body);
    }
  }
);

test(
  "userinfo with a malformed or tampered token is refused",
  { tag: "@TC-OIDC-038" },
  async () => {
    const tokens = await signedInTokens();
    const [h, p] = tokens.access_token.split(".");
    const noneHeader = Buffer.from(
      JSON.stringify({ alg: "none", typ: "JWT" })
    ).toString("base64url");
    for (const [label, token] of [
      ["random string", "not-a-jwt"],
      ["tampered signature", tamperSignature(tokens.access_token)],
      ["alg none", `${noneHeader}.${p}.`],
      [
        "payload swapped",
        `${h}.${Buffer.from('{"sub":"x"}').toString("base64url")}.${tokens.access_token.split(".")[2]}`
      ]
    ]) {
      const res = await me!.api.oauth.userinfo(`Bearer ${token}`);
      expect(res.status(), label).toBeGreaterThanOrEqual(400);
      expect(res.status(), label).toBeLessThan(500);
      const body = (await res.json()) as Record<string, unknown>;
      expect(body.error, label).toEqual(expect.any(String));
      expectNoClaims(body);
    }
  }
);

test(
  "userinfo errors follow RFC 6750 (401 invalid_token)",
  { tag: "@TC-OIDC-039" },
  async ({ api }) => {
    // RFC 6750 §3.1: 401 invalid_token with a WWW-Authenticate: Bearer
    // challenge (fixed BUG-OIDC-04).
    const missing = await api.oauth.userinfo();
    expect(missing.status()).toBe(401);
    expect(missing.headers()["www-authenticate"]).toMatch(/^Bearer/);

    const invalid = await api.oauth.userinfo("Bearer not-a-jwt");
    expect(invalid.status()).toBe(401);
    expect(await invalid.json()).toMatchObject({ error: "invalid_token" });
    expect(invalid.headers()["www-authenticate"]).toContain(
      'error="invalid_token"'
    );
  }
);

test(
  "An ID token presented to userinfo is refused cleanly",
  { tag: "@TC-OIDC-040" },
  async () => {
    // An id_token has no scope / authId, so verifyOAuthAccessToken refuses it
    // (fixed BUG-OIDC-02).
    const tokens = await signedInTokens();
    const res = await me!.api.oauth.userinfo(`Bearer ${tokens.id_token}`);
    expect(res.status()).toBe(401);
    expectNoClaims((await res.json()) as Record<string, unknown>);
  }
);

test(
  "A first-party Ducker ID access token is not accepted by userinfo",
  { tag: "@TC-OIDC-041" },
  async () => {
    // A first-party token carries aud = issuer, which verifyOAuthAccessToken
    // refuses (fixed BUG-OIDC-01).
    me = await signedInUser("oidc-userinfo-fp");
    const res = await me.api.oauth.userinfo(`Bearer ${me.accessToken}`);
    expect(res.status()).toBe(401);
    expectNoClaims((await res.json()) as Record<string, unknown>);
  }
);
