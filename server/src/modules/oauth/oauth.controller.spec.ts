jest.mock("@/modules/token/helpers", () => ({
  verifyOAuthAccessToken: jest.fn()
}));

// types
import type { Request, Response } from "express";
import type { OAuthService } from "./services";
// common
import { OAuthError } from "@/exceptions";
// modules
import { verifyOAuthAccessToken } from "@/modules/token/helpers";
// others
import { OAuthController } from "./oauth.controller";

const mockedVerify = verifyOAuthAccessToken as jest.MockedFunction<
  typeof verifyOAuthAccessToken
>;

const setup = (authorization?: string) => {
  const service = {
    getUserInfo: jest.fn().mockResolvedValue({ sub: "user-1" })
  } as unknown as jest.Mocked<OAuthService>;
  const res = { set: jest.fn(), json: jest.fn() };
  const req = { headers: { authorization } } as unknown as Request;
  const call = () =>
    new OAuthController(service).userInfo(req, res as unknown as Response);
  return { service, res, call };
};

describe("OAuthController.userInfo — RFC 6750 errors (BUG-OIDC-04)", () => {
  it("answers a missing token with 401 and a bare Bearer challenge", async () => {
    const { res, call } = setup();

    const promise = call();

    await expect(promise).rejects.toBeInstanceOf(OAuthError);
    await expect(promise).rejects.toMatchObject({
      status: 401,
      oauthError: "invalid_token"
    });
    expect(res.set).toHaveBeenCalledWith("WWW-Authenticate", "Bearer");
  });

  it("answers a token that does not verify with 401 invalid_token", async () => {
    const { res, service, call } = setup("Bearer not-a-jwt");
    mockedVerify.mockImplementation(() => {
      throw new OAuthError({ error: "x" });
    });

    await expect(call()).rejects.toMatchObject({
      status: 401,
      oauthError: "invalid_token"
    });
    expect(res.set).toHaveBeenCalledWith(
      "WWW-Authenticate",
      expect.stringContaining('error="invalid_token"')
    );
    expect(service.getUserInfo).not.toHaveBeenCalled();
  });

  it("returns the claims for a valid OAuth access token", async () => {
    const { res, service, call } = setup("Bearer good");
    mockedVerify.mockReturnValue({
      sub: "user-1",
      authId: "auth-1",
      sid: "sid-1",
      scope: "openid",
      aud: "match-cv"
    });

    await call();

    expect(service.getUserInfo).toHaveBeenCalledWith(
      "auth-1",
      "user-1",
      "openid"
    );
    expect(res.json).toHaveBeenCalledWith({ sub: "user-1" });
  });
});
