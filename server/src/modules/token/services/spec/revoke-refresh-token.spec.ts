jest.mock("../../helpers", () => ({ verifyRefreshToken: jest.fn() }));

// types
import type { RevokedRefreshTokenRepository } from "../../repository/revoked-refresh-token.repository";
import type { TokenServiceDeps } from "../deps";
// common
import { ForbiddenError } from "@/exceptions";
// others
import { verifyRefreshToken } from "../../helpers";
import { TokenService } from "../";

const mockedVerify = verifyRefreshToken as jest.MockedFunction<
  typeof verifyRefreshToken
>;

const AUTH_ID = "507f1f77bcf86cd799439011";
const nowSeconds = () => Math.floor(Date.now() / 1000);

const setup = () => {
  const revokedRefreshTokenRepo = {
    revoke: jest.fn().mockResolvedValue(undefined),
    isRevoked: jest.fn()
  } as jest.Mocked<RevokedRefreshTokenRepository>;

  const service = new TokenService({
    revokedRefreshTokenRepo
  } as unknown as TokenServiceDeps);

  return { service, revokedRefreshTokenRepo };
};

describe("TokenService.revokeRefreshToken", () => {
  it("denylists a live token for the rest of its lifetime", async () => {
    const { service, revokedRefreshTokenRepo } = setup();
    mockedVerify.mockReturnValue({
      sub: "u",
      authId: AUTH_ID,
      exp: nowSeconds() + 600
    });

    await service.revokeRefreshToken("live-token");

    expect(revokedRefreshTokenRepo.revoke).toHaveBeenCalledTimes(1);
    const [token, ttl] = revokedRefreshTokenRepo.revoke.mock.calls[0];
    expect(token).toBe("live-token");
    expect(ttl).toBeGreaterThan(590);
    expect(ttl).toBeLessThanOrEqual(600);
  });

  it("does nothing without a token", async () => {
    const { service, revokedRefreshTokenRepo } = setup();

    await service.revokeRefreshToken(undefined);

    expect(mockedVerify).not.toHaveBeenCalled();
    expect(revokedRefreshTokenRepo.revoke).not.toHaveBeenCalled();
  });

  it("skips a forged token instead of failing the logout", async () => {
    const { service, revokedRefreshTokenRepo } = setup();
    mockedVerify.mockImplementation(() => {
      throw new ForbiddenError({ message: "bad signature" });
    });

    await expect(service.revokeRefreshToken("forged")).resolves.toBeUndefined();
    expect(revokedRefreshTokenRepo.revoke).not.toHaveBeenCalled();
  });

  it("skips a token with no lifetime left", async () => {
    const { service, revokedRefreshTokenRepo } = setup();
    mockedVerify.mockReturnValue({
      sub: "u",
      authId: AUTH_ID,
      exp: nowSeconds()
    });

    await service.revokeRefreshToken("expiring");

    expect(revokedRefreshTokenRepo.revoke).not.toHaveBeenCalled();
  });
});
