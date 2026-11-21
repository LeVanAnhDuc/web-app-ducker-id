jest.mock("@/utils/request-context", () => ({
  RequestContext: { requireUserId: jest.fn() }
}));

// types
import type { SessionService } from "@/modules/session/services";
import type { TokenService } from "@/modules/token/services";
// common
import { UnauthorizedError } from "@/exceptions";
// others
import { RequestContext } from "@/utils/request-context";
import { LogoutService } from "../";

const mockedRequireUserId = RequestContext.requireUserId as jest.MockedFunction<
  typeof RequestContext.requireUserId
>;

const USER_ID = "507f1f77bcf86cd799439011";

const setup = () => {
  const sessionService = {
    end: jest.fn().mockResolvedValue(undefined)
  } as unknown as jest.Mocked<SessionService>;

  const tokenService = {
    revokeRefreshToken: jest.fn().mockResolvedValue(undefined)
  } as unknown as jest.Mocked<TokenService>;

  return {
    sessionService,
    tokenService,
    service: new LogoutService(sessionService, tokenService)
  };
};

const SID = "sid-abc";

describe("LogoutService.logout", () => {
  beforeEach(() => mockedRequireUserId.mockReturnValue(USER_ID));

  it("ends the IdP session the request carried", async () => {
    const { sessionService, service } = setup();

    await service.logout("the-refresh-token", SID);

    expect(sessionService.end).toHaveBeenCalledWith(SID);
  });

  it("revokes the refresh token the request carries (BUG-AUTH-01)", async () => {
    const { tokenService, service } = setup();

    await service.logout("the-refresh-token", SID);

    expect(tokenService.revokeRefreshToken).toHaveBeenCalledWith(
      "the-refresh-token"
    );
  });

  it("still ends the session when there is no refresh cookie", async () => {
    const { sessionService, tokenService, service } = setup();

    await service.logout(undefined, SID);

    expect(tokenService.revokeRefreshToken).toHaveBeenCalledWith(undefined);
    expect(sessionService.end).toHaveBeenCalledWith(SID);
  });

  it("does not touch the session when there is no authenticated user", async () => {
    const { sessionService, tokenService, service } = setup();
    mockedRequireUserId.mockImplementation(() => {
      throw new UnauthorizedError({ message: "no user" });
    });

    await expect(service.logout("t", SID)).rejects.toThrow(UnauthorizedError);
    expect(sessionService.end).not.toHaveBeenCalled();
    expect(tokenService.revokeRefreshToken).not.toHaveBeenCalled();
  });

  it("propagates a failure to destroy the session", async () => {
    const { sessionService, service } = setup();
    sessionService.end.mockRejectedValue(new Error("redis down"));

    await expect(service.logout("t", SID)).rejects.toThrow("redis down");
  });
});
