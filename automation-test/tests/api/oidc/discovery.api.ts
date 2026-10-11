import crypto from "node:crypto";
import { test, expect } from "@fixtures";
import { ISSUER } from "@helpers/oidc";
import type { Jwk } from "@helpers/oidc";

test.use({ role: "guest" });

test.describe("OIDC discovery and JWKS", () => {
  test(
    "discovery advertises endpoints under the issuer, code + S256 + RS256 only",
    { tag: ["@TC-OIDC-001", "@smoke"] },
    async ({ guestApi }) => {
      const res = await guestApi.get("/.well-known/openid-configuration");
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
    "JWKS publishes an RSA public signing key with no private members",
    { tag: "@TC-OIDC-002" },
    async ({ guestApi }) => {
      const discovery = (await (
        await guestApi.get("/.well-known/openid-configuration")
      ).json()) as { jwks_uri: string };
      const res = await guestApi.get(new URL(discovery.jwks_uri).pathname);
      expect(res.status()).toBe(200);
      const { keys } = (await res.json()) as { keys: (Jwk & Record<string, unknown>)[] };
      expect(keys.length).toBeGreaterThan(0);

      for (const key of keys) {
        expect(key).toMatchObject({ kty: "RSA", alg: "RS256", use: "sig" });
        expect(key.kid).toBeTruthy();
        expect(key.n).toMatch(/^[A-Za-z0-9_-]{300,}$/); // ≥ 2048-bit modulus
        expect(key.e).toBe("AQAB");
        for (const priv of ["d", "p", "q", "dp", "dq", "qi"]) {
          expect(key, `JWKS leaks private member "${priv}"`).not.toHaveProperty(priv);
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
    "well-known and oauth paths are not locale-routed",
    { tag: "@TC-OIDC-003" },
    async ({ guestApi }) => {
      const headers = { "Accept-Language": "vi", Cookie: "NEXT_LOCALE=vi" };

      const disc = await guestApi.get("/.well-known/openid-configuration", {
        headers,
        maxRedirects: 0
      });
      expect(disc.status()).toBe(200);
      expect(((await disc.json()) as { issuer: string }).issuer).toBe(ISSUER);

      const jwks = await guestApi.get("/.well-known/jwks.json", {
        headers,
        maxRedirects: 0
      });
      expect(jwks.status()).toBe(200);

      // Reaches the API (OAuth JSON error for the missing client_id), not
      // next-intl (which would answer with a redirect to /vi/oauth/…).
      const auth = await guestApi.get("/oauth/authorize", {
        headers,
        maxRedirects: 0
      });
      expect(auth.status()).toBe(400);
      expect(auth.headers()["location"]).toBeUndefined();
      expect(await auth.json()).toMatchObject({ error: "invalid_request" });
    }
  );
});
