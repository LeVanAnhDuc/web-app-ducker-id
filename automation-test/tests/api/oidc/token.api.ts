import { test, expect, apiAs } from "@fixtures";
import type { APIRequestContext } from "@fixtures";
import { ADMIN_EMAIL, ADMIN_PASSWORD } from "@helpers/env";
import {
  OTHER_REDIRECT_URI,
  codeKey,
  exchangeCode,
  expireKeyIn,
  guestContext,
  keyExists,
  keyTtl,
  makeVerifier,
  obtainCode,
  registerClient,
  retireClients,
  signedInUser
} from "@helpers/oidc";
import type { OidcClient, SignedIn, TokenSet } from "@helpers/oidc";

// /oauth/token — client authentication (decision table), PKCE, code
// lifecycle. Source: server/src/modules/oauth/services/exchange-token.ts.

test.use({ role: "guest" });

let admin: APIRequestContext;
let conf: OidcClient;
let conf2: OidcClient;
let pub: OidcClient;

test.beforeAll(async () => {
  admin = await apiAs(ADMIN_EMAIL, ADMIN_PASSWORD);
  conf = await registerClient(admin, { kind: "confidential", label: "token-conf" });
  conf2 = await registerClient(admin, { kind: "confidential", label: "token-conf2" });
  pub = await registerClient(admin, { kind: "public", label: "token-pub" });
});

test.afterAll(async () => {
  await retireClients(admin, [conf, conf2, pub]);
});

let me: SignedIn;
test.beforeEach(async ({}, testInfo) => {
  if (testInfo.tags.includes("@needs-session")) me = await signedInUser("oidc-token");
});
test.afterEach(async () => {
  await me?.ctx.dispose().catch(() => undefined);
});

async function oauthError(res: Awaited<ReturnType<typeof exchangeCode>>) {
  return (await res.json()) as { error: string; error_description?: string };
}

test.describe("client authentication — decision table", () => {
  test(
    "confidential client with client_secret_basic gets tokens",
    { tag: ["@TC-OIDC-019", "@smoke", "@needs-session"] },
    async () => {
      expect(conf.clientSecret).toBeTruthy();
      const got = await obtainCode(me.ctx, conf);
      const res = await exchangeCode(me.ctx, {
        client: conf,
        code: got.code,
        verifier: got.verifier,
        auth: "basic"
      });
      expect(res.status(), await res.text()).toBe(200);
      const body = (await res.json()) as TokenSet;
      expect(body.access_token).toBeTruthy();
      expect(body.id_token).toBeTruthy();
      expect(body.token_type).toBe("Bearer");
    }
  );

  test(
    "confidential client with client_secret_post gets tokens",
    { tag: ["@TC-OIDC-020", "@needs-session"] },
    async () => {
      const got = await obtainCode(me.ctx, conf);
      const res = await exchangeCode(me.ctx, {
        client: conf,
        code: got.code,
        verifier: got.verifier,
        auth: "post"
      });
      expect(res.status(), await res.text()).toBe(200);
      expect(((await res.json()) as TokenSet).id_token).toBeTruthy();
    }
  );

  test(
    "confidential client without a valid secret is refused",
    { tag: ["@TC-OIDC-021", "@needs-session"] },
    async () => {
      const rows: [string, { auth: "basic" | "post" | "none"; secret?: string | null }][] = [
        ["no secret at all", { auth: "none" }],
        ["wrong secret via Basic", { auth: "basic", secret: "not-the-secret" }],
        ["wrong secret via post", { auth: "post", secret: "not-the-secret" }],
        ["empty secret via Basic", { auth: "basic", secret: "" }],
        ["other client's secret", { auth: "basic", secret: conf2.clientSecret }]
      ];
      for (const [label, opts] of rows) {
        const got = await obtainCode(me.ctx, conf);
        const res = await exchangeCode(me.ctx, {
          client: conf,
          code: got.code,
          verifier: got.verifier,
          ...opts
        });
        expect(res.status(), label).toBe(401);
        const body = await oauthError(res);
        expect(body.error, label).toBe("invalid_client");
        expect(body).not.toHaveProperty("access_token");
      }
    }
  );

  test(
    "public client is registered without a secret and redeems with PKCE alone",
    { tag: ["@TC-OIDC-022", "@needs-session"] },
    async () => {
      expect(pub.clientSecret).toBeNull();
      const got = await obtainCode(me.ctx, pub);
      const res = await exchangeCode(me.ctx, {
        client: pub,
        code: got.code,
        verifier: got.verifier,
        auth: "none"
      });
      expect(res.status(), await res.text()).toBe(200);
      expect(((await res.json()) as TokenSet).access_token).toBeTruthy();
    }
  );
});

test(
  "token response is a flat, non-cacheable RFC 6749 body",
  { tag: ["@TC-OIDC-023", "@needs-session"] },
  async () => {
    const got = await obtainCode(me.ctx, conf, { scope: "openid email" });
    const res = await exchangeCode(me.ctx, {
      client: conf,
      code: got.code,
      verifier: got.verifier
    });
    expect(res.status()).toBe(200);
    expect(res.headers()["cache-control"]).toBe("no-store");
    expect(res.headers()["pragma"]).toBe("no-cache");
    const body = (await res.json()) as Record<string, unknown>;
    expect(body).toMatchObject({
      token_type: "Bearer",
      expires_in: 900,
      scope: "openid email"
    });
    expect(typeof body.access_token).toBe("string");
    expect(typeof body.id_token).toBe("string");
    for (const envelope of ["data", "timestamp", "path", "message"]) {
      expect(body).not.toHaveProperty(envelope);
    }
  }
);

test.describe("PKCE and code lifecycle", () => {
  test(
    "a wrong code_verifier is rejected and burns the code",
    { tag: ["@TC-OIDC-024", "@needs-session"] },
    async () => {
      const got = await obtainCode(me.ctx, pub);
      const wrong = await exchangeCode(me.ctx, {
        client: pub,
        code: got.code,
        verifier: makeVerifier(64)
      });
      expect(wrong.status()).toBe(400);
      expect(await oauthError(wrong)).toMatchObject({
        error: "invalid_grant",
        error_description: "PKCE verification failed"
      });

      const retry = await exchangeCode(me.ctx, {
        client: pub,
        code: got.code,
        verifier: got.verifier
      });
      expect(retry.status()).toBe(400);
      expect((await oauthError(retry)).error).toBe("invalid_grant");
    }
  );

  test(
    "token request without code or code_verifier is invalid and leaves the code usable",
    { tag: ["@TC-OIDC-025", "@needs-session"] },
    async () => {
      const got = await obtainCode(me.ctx, pub);
      const base = {
        grant_type: "authorization_code",
        client_id: pub.clientId,
        redirect_uri: "https://rp.e2e.example.com/callback"
      };
      for (const form of [
        { ...base, code: got.code },
        { ...base, code_verifier: got.verifier }
      ]) {
        const res = await me.ctx.post("/oauth/token", { form });
        expect(res.status()).toBe(400);
        expect(await res.json()).toMatchObject({ error: "invalid_request" });
      }
      const ok = await exchangeCode(me.ctx, {
        client: pub,
        code: got.code,
        verifier: got.verifier
      });
      expect(ok.status(), await ok.text()).toBe(200);
    }
  );

  test(
    "an authorization code is single-use",
    { tag: ["@TC-OIDC-026", "@needs-session"] },
    async () => {
      const got = await obtainCode(me.ctx, conf);
      const first = await exchangeCode(me.ctx, {
        client: conf,
        code: got.code,
        verifier: got.verifier
      });
      expect(first.status()).toBe(200);
      expect(await keyExists(codeKey(got.code))).toBe(false);

      const second = await exchangeCode(me.ctx, {
        client: conf,
        code: got.code,
        verifier: got.verifier
      });
      expect(second.status()).toBe(400);
      expect(await oauthError(second)).toMatchObject({
        error: "invalid_grant",
        error_description: "Authorization code is invalid, expired or already used"
      });
    }
  );

  test(
    "a fresh code lives 60 seconds",
    { tag: ["@TC-OIDC-027", "@needs-session"] },
    async () => {
      const got = await obtainCode(me.ctx, conf);
      const ttl = await keyTtl(codeKey(got.code));
      expect(ttl).toBeGreaterThan(55);
      expect(ttl).toBeLessThanOrEqual(60);
    }
  );

  test(
    "a code is accepted just before expiry and refused just after",
    { tag: ["@TC-OIDC-028", "@needs-session"] },
    async () => {
      const a = await obtainCode(me.ctx, conf);
      await expireKeyIn(codeKey(a.code), 2000);
      const justBefore = await exchangeCode(me.ctx, {
        client: conf,
        code: a.code,
        verifier: a.verifier
      });
      expect(justBefore.status(), await justBefore.text()).toBe(200);

      const b = await obtainCode(me.ctx, conf);
      await expireKeyIn(codeKey(b.code), 1);
      await expect.poll(() => keyExists(codeKey(b.code))).toBe(false);
      const after = await exchangeCode(me.ctx, {
        client: conf,
        code: b.code,
        verifier: b.verifier
      });
      expect(after.status()).toBe(400);
      expect((await oauthError(after)).error).toBe("invalid_grant");
    }
  );

  test(
    "a code is bound to its client and its redirect URI",
    { tag: ["@TC-OIDC-029", "@needs-session"] },
    async () => {
      const a = await obtainCode(me.ctx, conf);
      const crossClient = await exchangeCode(me.ctx, {
        client: conf,
        code: a.code,
        verifier: a.verifier,
        extra: { client_id: conf2.clientId }
      });
      expect(crossClient.status()).toBe(400);
      expect(await oauthError(crossClient)).toMatchObject({
        error: "invalid_grant",
        error_description: "Authorization code was issued to a different client"
      });

      const b = await obtainCode(me.ctx, conf);
      const otherUri = await exchangeCode(me.ctx, {
        client: conf,
        code: b.code,
        verifier: b.verifier,
        redirectUri: OTHER_REDIRECT_URI
      });
      expect(otherUri.status()).toBe(400);
      expect(await oauthError(otherUri)).toMatchObject({
        error: "invalid_grant",
        error_description: "redirect_uri does not match the authorization request"
      });
    }
  );
});

test(
  "only the authorization_code grant is supported",
  { tag: "@TC-OIDC-030" },
  async () => {
    const ctx = await guestContext();
    try {
      for (const grant of ["refresh_token", "client_credentials", "password", undefined]) {
        const form: Record<string, string> = {
          client_id: conf.clientId,
          client_secret: conf.clientSecret!,
          refresh_token: "x",
          username: "u",
          password: "p"
        };
        if (grant) form.grant_type = grant;
        const res = await ctx.post("/oauth/token", { form });
        expect(res.status(), `grant_type=${grant}`).toBe(400);
        expect(await res.json()).toMatchObject({ error: "unsupported_grant_type" });
      }
    } finally {
      await ctx.dispose();
    }
  }
);

test.describe("code_verifier length — BVA per RFC 7636 §4.1", () => {
  for (const length of [43, 128]) {
    test(
      `a ${length}-character verifier is accepted`,
      { tag: ["@TC-OIDC-031", "@needs-session"] },
      async () => {
        const got = await obtainCode(me.ctx, pub, {}, makeVerifier(length));
        const res = await exchangeCode(me.ctx, {
          client: pub,
          code: got.code,
          verifier: got.verifier
        });
        expect(res.status(), await res.text()).toBe(200);
      }
    );
  }

  for (const length of [42, 129]) {
    test(
      `a ${length}-character verifier is rejected`,
      { tag: ["@TC-OIDC-031", "@needs-session"] },
      async () => {
        // BUG: BUG-021 — the server never checks code_verifier length (RFC 7636 §4.1: 43–128) — any length redeems.
        test.fail();
        const got = await obtainCode(me.ctx, pub, {}, makeVerifier(length));
        const res = await exchangeCode(me.ctx, {
          client: pub,
          code: got.code,
          verifier: got.verifier
        });
        expect(res.status()).toBe(400);
        expect(await res.json()).toMatchObject({ error: "invalid_request" });
      }
    );
  }
});
