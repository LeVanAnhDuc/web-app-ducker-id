import { test, expect } from "@/fixtures";
import type { APIRequestContext } from "@playwright/test";
import { apiAs } from "@/api/session";
import { API_PREFIX } from "@/config/urls";
import { ADMIN_EMAIL, ADMIN_PASSWORD } from "@/config/accounts";
import {
  jwtHeader,
  jwtPayload,
  tamperSignature,
  verifyRs256,
  type Jwk
} from "@/utils/jwt";
import {
  ISSUER,
  type AuthorizeOverrides,
  type OidcClient,
  type TokenSet
} from "@/utils/oidc";
import {
  obtainCode,
  registerClient,
  retireClients,
  signedInUser,
  type SignedIn
} from "@/utils/oidc-state";

// RS256 tokens: signature against the JWKS, claims, scope filtering, and the
// audience wall between satellite and first-party tokens.
// Test cases: test-cases/oidc.md (TC-OIDC-032 … 035).

test.use({ role: "guest" });

let admin: APIRequestContext;
let conf: OidcClient;

test.beforeAll(async () => {
  admin = await apiAs(ADMIN_EMAIL, ADMIN_PASSWORD);
  conf = await registerClient(admin, {
    kind: "confidential",
    label: "idtoken"
  });
});

test.afterAll(async () => {
  await retireClients(admin, [conf]);
});

let me: SignedIn;
test.beforeEach(async () => {
  me = await signedInUser("oidc-idtoken");
});
test.afterEach(async () => {
  await me?.ctx.dispose().catch(() => undefined);
});

async function tokensFor(
  overrides: AuthorizeOverrides = {}
): Promise<TokenSet & { nonce: string }> {
  const got = await obtainCode(me.ctx, conf, overrides);
  const res = await me.api.oauth.exchangeCode({
    client: conf,
    code: got.code,
    verifier: got.verifier
  });
  expect(res.status(), await res.text()).toBe(200);
  return { ...((await res.json()) as TokenSet), nonce: got.nonce };
}

test(
  "The ID token is RS256-signed by a key in the JWKS",
  { tag: ["@TC-OIDC-032", "@smoke"] },
  async () => {
    const tokens = await tokensFor();
    const jwksRes = await me.api.oauth.jwks();
    expect(jwksRes.ok()).toBeTruthy();
    const jwks = ((await jwksRes.json()) as { keys: Jwk[] }).keys;

    for (const [label, token] of [
      ["id_token", tokens.id_token],
      ["access_token", tokens.access_token]
    ] as const) {
      const header = jwtHeader(token);
      expect(header.alg, label).toBe("RS256");
      const key = jwks.find((k) => k.kid === header.kid);
      expect(
        key,
        `${label} kid ${String(header.kid)} not in JWKS`
      ).toBeTruthy();
      expect(verifyRs256(token, key!), `${label} signature`).toBe(true);
      expect(
        verifyRs256(tamperSignature(token), key!),
        `${label} tampered`
      ).toBe(false);
    }
  }
);

test(
  "ID token claims identify issuer, audience, user and request",
  { tag: ["@TC-OIDC-033", "@smoke"] },
  async () => {
    const before = Math.floor(Date.now() / 1000) - 5;
    const tokens = await tokensFor();
    const payload = jwtPayload(tokens.id_token);

    expect(payload.iss).toBe(ISSUER);
    expect(payload.aud).toBe(conf.clientId);
    expect(payload.sub).toBe(me.userId);
    expect(payload.nonce).toBe(tokens.nonce);
    expect(payload.sid).toBe(me.sid);
    expect(payload.email).toBe(me.account.email);
    expect(payload.name).toBe(me.account.fullName);

    const iat = payload.iat as number;
    const exp = payload.exp as number;
    expect(iat).toBeGreaterThanOrEqual(before);
    expect(exp - iat).toBe(900);
    expect(exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
    expect(payload.auth_time as number).toBeLessThanOrEqual(iat);

    // The access token is minted for the same client.
    const at = jwtPayload(tokens.access_token);
    expect(at).toMatchObject({
      iss: ISSUER,
      aud: conf.clientId,
      sub: me.userId
    });
  }
);

test(
  "Claims are filtered by the granted scopes",
  { tag: "@TC-OIDC-034" },
  async () => {
    const rows: [string, string[], string[]][] = [
      ["openid", [], ["email", "email_verified", "name", "picture"]],
      ["openid email", ["email", "email_verified"], ["name", "picture"]],
      ["openid profile", ["name", "picture"], ["email", "email_verified"]]
    ];
    for (const [scope, present, absent] of rows) {
      const tokens = await tokensFor({ scope, nonce: undefined });
      expect(tokens.scope, scope).toBe(scope);
      const id = jwtPayload(tokens.id_token);
      expect(id.sub).toBe(me.userId);
      expect(
        id,
        `${scope}: nonce must be absent when none was sent`
      ).not.toHaveProperty("nonce");

      const info = (await (
        await me.api.oauth.userinfo(`Bearer ${tokens.access_token}`)
      ).json()) as Record<string, unknown>;
      expect(info.sub).toBe(me.userId);

      for (const claim of present) {
        expect(id, `${scope}: id_token.${claim}`).toHaveProperty(claim);
        expect(info, `${scope}: userinfo.${claim}`).toHaveProperty(claim);
      }
      for (const claim of absent) {
        expect(id, `${scope}: id_token.${claim}`).not.toHaveProperty(claim);
        expect(info, `${scope}: userinfo.${claim}`).not.toHaveProperty(claim);
      }
    }
  }
);

test(
  "A satellite access token cannot call Ducker ID's own API",
  { tag: "@TC-OIDC-035" },
  async () => {
    const tokens = await tokensFor();
    const res = await me.api
      .as({ accessToken: tokens.access_token })
      .users.me();
    expect([401, 403]).toContain(res.status());
    const body = (await res.json()) as Record<string, unknown>;
    expect(body).toMatchObject({
      code: expect.any(String),
      path: `${API_PREFIX}/users/me`
    });
    expect(body).not.toHaveProperty("data");
  }
);
