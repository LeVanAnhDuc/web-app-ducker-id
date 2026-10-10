jest.mock("@/modules/authentication/helpers");

// types
import type { AuthenticationDocument } from "@/modules/authentication/types";
import type { AuthenticationService } from "@/modules/authentication/services";
import type { UserService } from "@/modules/user/services";
import type { RefreshTokenValidGuard } from "../../guards";
// common
import { ForbiddenError, UnauthorizedError } from "@/common/exceptions";
// modules
import { generateAuthTokensResponse } from "@/modules/authentication/helpers";
// others
import {
  RefreshTokenPresentGuard,
  AuthActiveGuard,
  PasswordNotChangedGuard,
  UserExistsGuard
} from "../../guards";
import { buildAuth } from "@test/factories/user-with-auth.factory";
import { TokenService } from "../";

const mockedGenTokens = generateAuthTokensResponse as jest.MockedFunction<
  typeof generateAuthTokensResponse
>;

const AUTH_ID = "507f1f77bcf86cd799439011";
const USER_ID = "507f1f77bcf86cd799439012";

const TOKENS = {
  accessToken: "access",
  refreshToken: "refresh",
  idToken: "id",
  expiresIn: 900
};

const userForToken = {
  _id: { toString: () => USER_ID },
  email: "user@example.com",
  fullName: "Test User",
  avatar: null
};

/**
 * Only the guard that verifies the JWT is stubbed — the other four are pure
 * classes, so running the real ones is what makes these tests worth having.
 */
const setup = (
  over: {
    auth?: AuthenticationDocument | null;
    user?: typeof userForToken | null;
    tokenVersion?: number;
  } = {}
) => {
  const payload = {
    sub: USER_ID,
    authId: AUTH_ID,
    tokenVersion: over.tokenVersion ?? 0
  };

  const authService = {
    findById: jest
      .fn()
      .mockResolvedValue(
        over.auth === undefined
          ? buildAuth({ _id: AUTH_ID as never })
          : over.auth
      )
  } as unknown as jest.Mocked<AuthenticationService>;

  const userService = {
    findByAuthId: jest
      .fn()
      .mockResolvedValue(over.user === undefined ? userForToken : over.user)
  } as unknown as jest.Mocked<UserService>;

  const refreshTokenValidGuard = {
    assert: jest.fn().mockReturnValue(payload)
  } as unknown as jest.Mocked<RefreshTokenValidGuard>;

  const service = new TokenService(
    authService,
    userService,
    new RefreshTokenPresentGuard(),
    refreshTokenValidGuard,
    new AuthActiveGuard(),
    new PasswordNotChangedGuard(),
    new UserExistsGuard()
  );

  return { service, authService, userService, refreshTokenValidGuard, payload };
};

describe("TokenService.refreshAccessToken", () => {
  beforeEach(() => mockedGenTokens.mockReturnValue(TOKENS));

  it("returns a fresh token triplet for a valid refresh token", async () => {
    const { service } = setup();

    const result = await service.refreshAccessToken("a-refresh-token");

    expect(result).toEqual(TOKENS);
  });

  it("rejects a missing refresh token before looking anything up", async () => {
    const { service, authService, refreshTokenValidGuard } = setup();

    await expect(service.refreshAccessToken(undefined)).rejects.toThrow(
      UnauthorizedError
    );
    expect(refreshTokenValidGuard.assert).not.toHaveBeenCalled();
    expect(authService.findById).not.toHaveBeenCalled();
  });

  it("looks up auth and user by the authId carried in the token", async () => {
    const { service, authService, userService } = setup();

    await service.refreshAccessToken("a-refresh-token");

    expect(authService.findById).toHaveBeenCalledWith(AUTH_ID);
    expect(userService.findByAuthId).toHaveBeenCalledWith(AUTH_ID);
  });

  it("rejects when the account is inactive", async () => {
    const { service } = setup({
      auth: buildAuth({ _id: AUTH_ID as never, isActive: false })
    });

    await expect(service.refreshAccessToken("a-refresh-token")).rejects.toThrow(
      ForbiddenError
    );
  });

  it("rejects when the auth record is gone", async () => {
    const { service } = setup({ auth: null });

    await expect(service.refreshAccessToken("a-refresh-token")).rejects.toThrow(
      ForbiddenError
    );
  });

  it("rejects a token issued before the password changed", async () => {
    const { service } = setup({
      auth: buildAuth({ _id: AUTH_ID as never, tokenVersion: 3 }),
      tokenVersion: 2
    });

    await expect(service.refreshAccessToken("a-refresh-token")).rejects.toThrow(
      ForbiddenError
    );
    expect(mockedGenTokens).not.toHaveBeenCalled();
  });

  it("rejects when the user profile no longer exists", async () => {
    const { service } = setup({ user: null });

    await expect(service.refreshAccessToken("a-refresh-token")).rejects.toThrow(
      ForbiddenError
    );
  });

  it("carries the current tokenVersion forward instead of bumping it", async () => {
    const { service } = setup({
      auth: buildAuth({ _id: AUTH_ID as never, tokenVersion: 4 }),
      tokenVersion: 4
    });

    await service.refreshAccessToken("a-refresh-token");

    expect(mockedGenTokens).toHaveBeenCalledWith(
      expect.objectContaining({ tokenVersion: 4 })
    );
  });

  it("passes mustChangePassword through to the new id token", async () => {
    const { service } = setup({
      auth: buildAuth({ _id: AUTH_ID as never, mustChangePassword: true })
    });

    await service.refreshAccessToken("a-refresh-token");

    expect(mockedGenTokens).toHaveBeenCalledWith(
      expect.objectContaining({ mustChangePassword: true })
    );
  });
});
