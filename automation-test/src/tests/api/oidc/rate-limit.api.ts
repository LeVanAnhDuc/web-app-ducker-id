import { test, expect } from "@/fixtures";
import { errorOf } from "@/api/response";
import { serverMessage } from "@/data/copy";
import { clearIpLimit } from "@/utils/auth";

// /oauth/authorize and /oauth/token sit behind the per-IP password-login
// limiter (oauth.routes.ts → rl.loginByIp: 30 requests / 900 s, Redis key
// `rate-limit:login:ip:*`), so they share one budget with POST /auth/login.
// Every request counts, failed ones included. The 429 comes from the shared
// limiter handler: the API's error envelope, not an OAuth error body.
// Test case: test-cases/oidc.md (TC-OIDC-057).

test.use({ role: "guest", keepRateLimits: true });

const LOGIN_BUDGET_PER_IP = 30;

test(
  "Authorize and token requests share the per-IP sign-in rate limit",
  { tag: "@TC-OIDC-057" },
  async ({ newApi }) => {
    // keepRateLimits leaves every counter alone; start this one from zero.
    await clearIpLimit("login");
    const api = await newApi();

    // Cheapest request the limiter counts: no client_id → 400 JSON.
    for (let i = 1; i <= LOGIN_BUDGET_PER_IP; i += 1) {
      const res = await api.oauth.authorize({});
      expect(res.status(), `request ${i}`).toBe(400);
    }

    const authorize = await api.oauth.authorize({});
    expect(authorize.status()).toBe(429);
    expect(await errorOf(authorize)).toMatchObject({
      code: "TOO_MANY_REQUESTS",
      message: serverMessage.login.errors.rateLimitExceeded
    });

    const token = await api.oauth.token({ grant_type: "authorization_code" });
    expect(token.status()).toBe(429);

    const login = await api.auth.login("nobody@e2e.example.com", "x");
    expect(login.status()).toBe(429);

    await clearIpLimit("login");
  }
);
