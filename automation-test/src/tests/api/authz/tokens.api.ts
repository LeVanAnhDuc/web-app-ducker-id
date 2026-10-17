import { test, expect } from "@/fixtures";
import { createApiClient } from "@/api";
import { dataOf, errorOf, sessionOf, setCookie } from "@/api/response";
import { ADMIN, USER } from "@/config/accounts";
import { withClaims } from "@/utils/jwt";

// Which Bearer values open an admin endpoint (REQ-AUTHZ-01, REQ-AUTHZ-05).
// Test cases: test-cases/authz.md (TC-AUTHZ-009, 019, 020).
//
// server/src/middlewares/guards/auth.guard.ts: no usable `Bearer <token>` →
// 401 AUTH_MISSING_TOKEN; verifyAccessToken (modules/token/helpers) throws
// ForbiddenError → 403 JWT_INVALID for anything that fails RS256 / issuer /
// audience verification; a verified token without `sub` + `authId` → 401
// AUTH_INVALID_TOKEN. Access and ID tokens share the signing key, issuer and
// audience; only the access token carries `authId` and `roles`. The refresh
// token is HS256. Every call targets GET /admin/users.

test.use({ role: "guest" });

test(
  "A forged or malformed token is refused",
  { tag: ["@TC-AUTHZ-009", "@smoke"] },
  async ({ guestApi }) => {
    // No usable Bearer → 401 AUTH_MISSING_TOKEN. A Bearer that fails
    // verification → 403 JWT_INVALID: verifyToken throws ForbiddenError,
    // which the client relies on to tell "refresh and retry" from "signed out".
    const cases: [string, Record<string, string>, number, string][] = [
      ["empty Bearer", { Authorization: "Bearer " }, 401, "AUTH_MISSING_TOKEN"],
      [
        "Basic scheme",
        { Authorization: "Basic YWRtaW46QWRtaW5AMTIz" },
        401,
        "AUTH_MISSING_TOKEN"
      ],
      [
        "garbage Bearer",
        { Authorization: "Bearer not-a-jwt" },
        403,
        "JWT_INVALID"
      ],
      [
        "unsigned alg:none JWT claiming admin",
        {
          Authorization:
            "Bearer eyJhbGciOiJub25lIn0.eyJzdWIiOiJ4Iiwicm9sZXMiOiJhZG1pbiJ9."
        },
        403,
        "JWT_INVALID"
      ]
    ];
    const api = createApiClient(guestApi);
    for (const [label, headers, status, code] of cases) {
      const res = await api.adminUsers.list({}, headers);
      expect(res.status(), label).toBe(status);
      expect((await errorOf(res)).code, label).toBe(code);
    }
  }
);

test(
  "A user who rewrites the roles claim of their own token is refused",
  { tag: ["@TC-AUTHZ-019", "@smoke"] },
  async ({ newApi }) => {
    const api = await newApi();
    const session = await sessionOf(
      await api.auth.login(USER.email, USER.password)
    );

    // Control: the untouched token is a valid session without the admin role.
    const genuine = await api.as(session).adminUsers.list();
    expect(genuine.status()).toBe(403);
    expect((await errorOf(genuine)).code).toBe("AUTH_ADMIN_ONLY");

    // Same header and signature, payload says admin: the signature no longer
    // matches, so the claim is never read.
    const forged = withClaims(session.accessToken, { roles: "admin" });
    const res = await api.as({ accessToken: forged }).adminUsers.list();
    expect(res.status()).toBe(403);
    expect((await errorOf(res)).code).toBe("JWT_INVALID");
  }
);

test(
  "An admin's ID token or refresh token is not accepted as an access token",
  { tag: "@TC-AUTHZ-020" },
  async ({ newApi }) => {
    const api = await newApi();
    const login = await api.auth.login(ADMIN.email, ADMIN.password);
    expect(login.status()).toBe(200);
    const { accessToken, idToken } = await dataOf<{
      accessToken: string;
      idToken: string;
    }>(login);
    const refreshToken = /^refreshToken=([^;]+)/.exec(
      setCookie(login, "refreshToken") ?? ""
    )?.[1];
    expect(refreshToken, "login sets the refresh cookie").toBeTruthy();

    // Control: the access token itself opens the endpoint.
    const ok = await api.as({ accessToken }).adminUsers.list();
    expect(ok.status()).toBe(200);

    // ID token: verifies (same key, issuer, audience) but has no authId.
    const asId = await api.as({ accessToken: idToken }).adminUsers.list();
    expect(asId.status()).toBe(401);
    expect((await errorOf(asId)).code).toBe("AUTH_INVALID_TOKEN");

    // Refresh token: HS256, refused by the RS256-only access verification.
    const asRefresh = await api
      .as({ accessToken: refreshToken! })
      .adminUsers.list();
    expect(asRefresh.status()).toBe(403);
    expect((await errorOf(asRefresh)).code).toBe("JWT_INVALID");
  }
);
