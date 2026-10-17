jest.mock("@/constants/env", () => ({
  __esModule: true,
  default: {
    NODE_ENV: "test",
    OIDC_ISSUER: "https://id.test",
    JWT_REFRESH_SECRET: "test-refresh-secret"
  }
}));

// others
import {
  generateAccessToken,
  signOAuthToken,
  verifyAccessToken,
  verifyOAuthAccessToken
} from "./";

const SUB = "507f1f77bcf86cd799439012";
const AUTH_ID = "507f1f77bcf86cd799439011";

const oauthAccessToken = (audience = "match-cv") =>
  signOAuthToken(
    { sub: SUB, authId: AUTH_ID, sid: "sid-1", scope: "openid email" },
    audience,
    "15m"
  );

describe("verifyOAuthAccessToken", () => {
  it("accepts an access token issued to an OAuth client", () => {
    const payload = verifyOAuthAccessToken(oauthAccessToken());

    expect(payload).toMatchObject({
      sub: SUB,
      authId: AUTH_ID,
      scope: "openid email",
      aud: "match-cv"
    });
  });

  it("rejects a first-party Ducker ID access token (BUG-OIDC-01)", () => {
    const firstParty = generateAccessToken({
      sub: SUB,
      authId: AUTH_ID,
      roles: "user"
    });

    expect(() => verifyOAuthAccessToken(firstParty)).toThrow();
  });

  it("rejects an id_token presented as an access token (BUG-OIDC-02)", () => {
    const idToken = signOAuthToken(
      { sub: SUB, sid: "sid-1", auth_time: 1, email: "u@test.com" },
      "match-cv",
      "15m"
    );

    expect(() => verifyOAuthAccessToken(idToken)).toThrow();
  });

  it("rejects a token signed by someone else", () => {
    const [header, payload] = oauthAccessToken().split(".");

    expect(() =>
      verifyOAuthAccessToken(`${header}.${payload}.forged`)
    ).toThrow();
  });
});

describe("access token mustChangePassword claim", () => {
  it("round-trips the claim when a temporary-password session is signed", () => {
    const token = generateAccessToken({
      sub: SUB,
      authId: AUTH_ID,
      roles: "user",
      mustChangePassword: true
    });

    expect(verifyAccessToken(token).mustChangePassword).toBe(true);
  });
});
