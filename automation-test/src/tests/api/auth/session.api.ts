import { test, expect } from "@/fixtures";
import { errorOf, setCookie } from "@/api/response";
import { serverMessage } from "@/data/copy";
import { createAccount } from "@/utils/accounts";
import { setAuthFlags } from "@/utils/auth";
import { jwtPayload } from "@/utils/jwt";

// Session continuity and logout — server/src/modules/token (POST
// /auth/token/refresh reads the `refreshToken` cookie) and
// server/src/modules/logout (POST /auth/logout, Bearer-guarded).

test.use({ role: "guest" });

test(
  "Refresh issues a new access token from the cookie and refuses a missing or forged one",
  { tag: ["@TC-AUTH-054", "@smoke"] },
  async ({ newApi }) => {
    const account = await createAccount({ tag: "auth-refresh" });
    const api = await newApi();
    const login = await api.auth.login(account.email, account.password);
    expect(login.status()).toBe(200);
    const first = (await login.json()).data.accessToken as string;

    // The context's cookie jar replays the HttpOnly refreshToken cookie.
    const refreshed = await api.auth.refreshToken();
    expect(refreshed.status()).toBe(200);
    const { data } = await refreshed.json();
    expect(data.accessToken).toBeTruthy();
    // NB: unlike /auth/login, refresh echoes `refreshToken` in the JSON body
    // too (token/dtos) — reported as an observation, not asserted here.
    expect(jwtPayload<{ sub: string }>(data.accessToken).sub).toBe(
      jwtPayload<{ sub: string }>(first).sub
    );

    // The new access token is accepted by a protected endpoint.
    const me = await api
      .as({ accessToken: data.accessToken })
      .call("get", "/users/me");
    expect(me.status()).toBe(200);

    const bare = await newApi();
    const none = await bare.auth.refreshToken();
    expect(none.status()).toBe(401);
    const n = await errorOf(none);
    expect(n.code).toBe("REFRESH_TOKEN_REQUIRED");
    expect(n.message).toBe(serverMessage.login.errors.refreshTokenRequired);

    const forged = await bare.auth.refreshToken(
      "eyJhbGciOiJIUzI1NiJ9.e30.forged"
    );
    expect(forged.status()).toBe(403);
    expect((await errorOf(forged)).code).toBe("REFRESH_TOKEN_INVALID");
  }
);

test(
  "After logout the old refresh token no longer works",
  { tag: ["@TC-AUTH-056", "@smoke"] },
  async ({ newApi }) => {
    // POST /auth/logout only destroys the IdP `sid` session and clears the
    // cookie; the refresh JWT is never revoked (TokenService verifies the
    // signature only), so a copy taken before logout still mints access tokens.
    // BUG: defects/auth.md#bug-auth-01
    test.fail();

    const account = await createAccount({ tag: "auth-logout" });
    const api = await newApi();
    const login = await api.auth.login(account.email, account.password);
    const { accessToken } = (await login.json()).data;
    const stolen = /^refreshToken=([^;]+)/.exec(
      setCookie(login, "refreshToken") ?? ""
    )![1];

    const out = await api.as({ accessToken }).auth.logout();
    expect(out.status()).toBe(204);
    // Both cookies are overwritten with an empty value. (Express's
    // clearCookie keeps the 7-day maxAge from the shared options, so the
    // empty cookie is not expired — harmless, the value is what counts.)
    expect(setCookie(out, "refreshToken")).toMatch(/^refreshToken=;/);
    expect(setCookie(out, "sid")).toMatch(/^sid=;/);

    // …and the cookie jar no longer refreshes.
    const after = await api.auth.refreshToken();
    expect(after.status()).toBe(401);

    // Replaying the refresh token captured before logout must fail.
    const thief = await newApi({ Cookie: `refreshToken=${stolen}` });
    const replay = await thief.auth.refreshToken();
    expect(replay.status(), "old refresh token after logout").not.toBe(200);
  }
);

test(
  "Logout requires a signed-in caller",
  { tag: ["@TC-AUTH-057"] },
  async ({ newApi }) => {
    const api = await newApi();
    const anon = await api.auth.logout();
    expect(anon.status()).toBe(401);
    expect((await errorOf(anon)).code).toBe("AUTH_MISSING_TOKEN");
    // A malformed JWT is refused by verifyAccessToken with 403 JWT_INVALID
    // (the status itself is AUTHZ's concern — REQ-AUTHZ-01).
    const bad = await api.as({ accessToken: "not-a-jwt" }).auth.logout();
    expect([401, 403]).toContain(bad.status());
    expect((await errorOf(bad)).code).toBe("JWT_INVALID");
  }
);

test(
  "Refresh is refused once the account is deactivated",
  { tag: ["@TC-AUTH-065"] },
  async ({ newApi }) => {
    const account = await createAccount({ tag: "auth-refresh-off" });
    const api = await newApi();
    const login = await api.auth.login(account.email, account.password);
    expect(login.status()).toBe(200);

    await setAuthFlags(account.email, { isActive: false });

    const refreshed = await api.auth.refreshToken();
    expect(refreshed.status()).toBe(403);
    const err = await errorOf(refreshed);
    expect(err.code).toBe("REFRESH_TOKEN_INVALID");
    expect(err.message).toBe(serverMessage.login.errors.invalidRefreshToken);
  }
);

test(
  "Refresh keeps the refresh token out of the response body",
  { tag: ["@TC-AUTH-066"] },
  async ({ newApi }) => {
    // toRefreshTokenDto (server/src/modules/token/dtos) echoes refreshToken
    // into the JSON body, where page script can read it (decisions Q5).
    // BUG: defects/auth.md#bug-auth-07
    test.fail();
    const account = await createAccount({ tag: "auth-refresh-body" });
    const api = await newApi();
    expect(
      (await api.auth.login(account.email, account.password)).status()
    ).toBe(200);

    const refreshed = await api.auth.refreshToken();
    expect(refreshed.status()).toBe(200);
    const { data } = (await refreshed.json()) as {
      data: Record<string, unknown>;
    };
    expect(Object.keys(data).sort()).toEqual(
      ["accessToken", "expiresIn", "idToken"].sort()
    );
  }
);
