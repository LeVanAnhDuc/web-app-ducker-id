import crypto from "node:crypto";
import { test, expect } from "@/fixtures";
import type { Jwk } from "@/utils/jwt";
import { ISSUER } from "@/utils/oidc";

// /.well-known/openid-configuration and /.well-known/jwks.json —
// oauth.controller.ts#discovery / #jwks. Test cases: test-cases/oidc.md
// (TC-OIDC-001 … 003).

test.use({ role: "guest" });

test(
  "Discovery document advertises the provider's endpoints and capabilities",
  { tag: ["@TC-OIDC-001", "@smoke"] },
  async ({ api }) => {
    const res = await api.oauth.discovery();
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toContain("application/json");
    const d = (await res.json()) as Record<string, unknown>;

    expect(d.issuer).toBe(ISSUER);
    expect(d).toMatchObject({
      authorization_endpoint: `${ISSUER}/oauth/authorize`,
      token_endpoint: `${ISSUER}/oauth/token`,
      userinfo_endpoint: `${ISSUER}/oauth/userinfo`,
      end_session_endpoint: `${ISSUER}/oauth/logout`,
      jwks_uri: `${ISSUER}/.well-known/jwks.json`,
      response_types_supported: ["code"],
      grant_types_supported: ["authorization_code"],
      code_challenge_methods_supported: ["S256"],
      id_token_signing_alg_values_supported: ["RS256"],
      subject_types_supported: ["public"]
    });
    expect([...(d.scopes_supported as string[])].sort()).toEqual([
      "email",
      "openid",
      "profile"
    ]);
    expect(
      [...(d.token_endpoint_auth_methods_supported as string[])].sort()
    ).toEqual(["client_secret_basic", "client_secret_post", "none"]);
    expect(d.claims_supported).toEqual(
      expect.arrayContaining(["sub", "email", "name", "nonce", "auth_time"])
    );
  }
);

test(
  "JWKS publishes the RSA public signing key and nothing private",
  { tag: ["@TC-OIDC-002", "@smoke"] },
  async ({ api }) => {
    const discovery = (await (await api.oauth.discovery()).json()) as {
      jwks_uri: string;
    };
    const res = await api.oauth.jwks(new URL(discovery.jwks_uri).pathname);
    expect(res.status()).toBe(200);
    const { keys } = (await res.json()) as {
      keys: (Jwk & Record<string, unknown>)[];
    };
    expect(keys.length).toBeGreaterThan(0);

    for (const key of keys) {
      expect(key).toMatchObject({ kty: "RSA", alg: "RS256", use: "sig" });
      expect(key.kid).toBeTruthy();
      expect(key.n).toMatch(/^[A-Za-z0-9_-]{300,}$/); // ≥ 2048-bit modulus
      expect(key.e).toBe("AQAB");
      for (const priv of ["d", "p", "q", "dp", "dq", "qi"]) {
        expect(key, `JWKS leaks private member "${priv}"`).not.toHaveProperty(
          priv
        );
      }
      const pub = crypto.createPublicKey({
        key: { kty: key.kty, n: key.n, e: key.e },
        format: "jwk"
      });
      expect(pub.type).toBe("public");
      expect(pub.asymmetricKeyType).toBe("rsa");
    }
  }
);

test(
  "Well-known and OAuth paths bypass locale routing",
  { tag: "@TC-OIDC-003" },
  async ({ api }) => {
    const headers = { "Accept-Language": "vi", Cookie: "NEXT_LOCALE=vi" };

    const disc = await api.oauth.discovery(headers);
    expect(disc.status()).toBe(200);
    expect(((await disc.json()) as { issuer: string }).issuer).toBe(ISSUER);

    const jwks = await api.oauth.jwks(undefined, headers);
    expect(jwks.status()).toBe(200);

    // Reaches the API (OAuth JSON error for the missing client_id), not
    // next-intl (which would answer with a redirect to /vi/oauth/…).
    const auth = await api.oauth.authorize({}, headers);
    expect(auth.status()).toBe(400);
    expect(auth.headers()["location"]).toBeUndefined();
    expect(await auth.json()).toMatchObject({ error: "invalid_request" });
  }
);
