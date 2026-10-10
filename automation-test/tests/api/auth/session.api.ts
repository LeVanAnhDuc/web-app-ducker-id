import { test, expect } from "@fixtures";
import { createAccount } from "@helpers/accounts";
import {
  API,
  errorOf,
  jwtPayload,
  newApi,
  passwordLogin,
  setCookie
} from "@helpers/auth";

// Session continuity and logout — server/src/modules/token (POST
// /auth/token/refresh reads the `refreshToken` cookie) and
// server/src/modules/logout (POST /auth/logout, Bearer-guarded).

test.use({ role: "guest" });

test(
  "refresh issues a new access token from the cookie and refuses a missing or forged one",
  { tag: ["@TC-AUTH-054"] },
  async () => {
    const account = await createAccount({ tag: "auth-refresh" });
    const api = await newApi();
    try {
      const login = await passwordLogin(api, account.email, account.password);
      expect(login.status()).toBe(200);
      const first = (await login.json()).data.accessToken as string;

      // The context's cookie jar replays the HttpOnly refreshToken cookie.
      const refreshed = await api.post(`${API}/auth/token/refresh`);
      expect(refreshed.status()).toBe(200);
      const { data } = await refreshed.json();
      expect(data.accessToken).toBeTruthy();
      // NB: unlike /auth/login, refresh echoes `refreshToken` in the JSON body
      // too (token/dtos) — reported as an observation, not asserted here.
      expect(jwtPayload<{ sub: string }>(data.accessToken).sub).toBe(
        jwtPayload<{ sub: string }>(first).sub
      );

      // The new access token is accepted by a protected endpoint.
      const me = await api.get(`${API}/users/me`, {
        headers: { Authorization: `Bearer ${data.accessToken}` }
      });
      expect(me.status()).toBe(200);
    } finally {
      await api.dispose();
    }

    const bare = await newApi();
    try {
      const none = await bare.post(`${API}/auth/token/refresh`);
      expect(none.status()).toBe(401);
      const n = await errorOf(none);
      expect(n.code).toBe("REFRESH_TOKEN_REQUIRED");
      expect(n.message).toBe("Refresh token is required");

      const forged = await bare.post(`${API}/auth/token/refresh`, {
        headers: { Cookie: "refreshToken=eyJhbGciOiJIUzI1NiJ9.e30.forged" }
      });
      expect(forged.status()).toBe(403);
      expect((await errorOf(forged)).code).toBe("REFRESH_TOKEN_INVALID");
    } finally {
      await bare.dispose();
    }
  }
);

test(
  "logout clears the session cookies and the old refresh token stops working",
  { tag: ["@TC-AUTH-056"] },
  async () => {
    // BUG: BUG-002 — POST /auth/logout only destroys the IdP `sid` session and clears the
    // cookie; the refresh JWT is never revoked (TokenService verifies the
    // signature only), so a copy taken before logout still mints access tokens.
    test.fail();

    const account = await createAccount({ tag: "auth-logout" });
    const api = await newApi();
    let stolen: string;
    try {
      const login = await passwordLogin(api, account.email, account.password);
      const { accessToken } = (await login.json()).data;
      stolen = /^refreshToken=([^;]+)/.exec(
        setCookie(login, "refreshToken") ?? ""
      )![1];

      const out = await api.post(`${API}/auth/logout`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      expect(out.status()).toBe(204);
      // Both cookies are overwritten with an empty value. (Express's
      // clearCookie keeps the 7-day maxAge from the shared options, so the
      // empty cookie is not expired — harmless, the value is what counts.)
      expect(setCookie(out, "refreshToken")).toMatch(/^refreshToken=;/);
      expect(setCookie(out, "sid")).toMatch(/^sid=;/);

      // …and the cookie jar no longer refreshes.
      const after = await api.post(`${API}/auth/token/refresh`);
      expect(after.status()).toBe(401);
    } finally {
      await api.dispose();
    }

    // Replaying the refresh token captured before logout must fail.
    const thief = await newApi({ Cookie: `refreshToken=${stolen}` });
    try {
      const replay = await thief.post(`${API}/auth/token/refresh`);
      expect(replay.status(), "old refresh token after logout").not.toBe(200);
    } finally {
      await thief.dispose();
    }
  }
);

test(
  "logout requires a signed-in caller",
  { tag: ["@TC-AUTH-057"] },
  async () => {
    const api = await newApi();
    try {
      const anon = await api.post(`${API}/auth/logout`);
      expect(anon.status()).toBe(401);
      expect((await errorOf(anon)).code).toBe("AUTH_MISSING_TOKEN");
      // A malformed JWT is refused by verifyAccessToken with 403 JWT_INVALID
      // (the status itself is AUTHZ's concern — REQ-AUTHZ-01).
      const bad = await api.post(`${API}/auth/logout`, {
        headers: { Authorization: "Bearer not-a-jwt" }
      });
      expect([401, 403]).toContain(bad.status());
      expect((await errorOf(bad)).code).toBe("JWT_INVALID");
    } finally {
      await api.dispose();
    }
  }
);
