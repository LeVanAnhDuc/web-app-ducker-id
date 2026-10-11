import { test, expect } from "@fixtures";

// An admin qualifies for every app by default. Before access control,
// /oauth/authorize compared the session role against requiredRoles exactly,
// so an admin launching Blog ([user] only) from their own launcher got
// access_denied. Role: admin (read-only — the code is never redeemed).
// Test case: test-cases/oidc.md (TC-OIDC-052).

test.use({ role: "admin" });

const PKCE_CHALLENGE = "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM";

test(
  "an admin signs into a user-only app with SSO",
  { tag: "@TC-OIDC-052" },
  async ({ page }) => {
    const res = await page.request.get(
      `/oauth/authorize?${new URLSearchParams({
        client_id: "client_blog_8f3a",
        redirect_uri: "https://blog.example.com/auth/callback",
        response_type: "code",
        scope: "openid",
        state: "e2e-admin-sso",
        code_challenge: PKCE_CHALLENGE,
        code_challenge_method: "S256"
      })}`,
      { maxRedirects: 0 }
    );

    expect(res.status()).toBe(302);
    expect(res.headers()["location"]).toContain(
      "https://blog.example.com/auth/callback?code="
    );
  }
);
