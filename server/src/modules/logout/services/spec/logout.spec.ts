jest.mock("@/utils/request-context", () => ({
  RequestContext: { requireUserId: jest.fn() }
}));

// types
import type { Response } from "express";
import type { SessionService } from "@/modules/session/services";
// common
import { UnauthorizedError } from "@/common/exceptions";
// others
import { RequestContext } from "@/utils/request-context";
import { makeMockRequest } from "@test/helpers/request.helper";
import { LogoutService } from "../";

const mockedRequireUserId = RequestContext.requireUserId as jest.MockedFunction<
  typeof RequestContext.requireUserId
>;

const USER_ID = "507f1f77bcf86cd799439011";

const setup = () => {
  const sessionService = {
    end: jest.fn().mockResolvedValue(undefined)
  } as unknown as jest.Mocked<SessionService>;

  return { sessionService, service: new LogoutService(sessionService) };
};

const res = {} as Response;

describe("LogoutService.logout", () => {
  beforeEach(() => mockedRequireUserId.mockReturnValue(USER_ID));

  it("ends the IdP session with the same req/res the handler got", async () => {
    const { sessionService, service } = setup();
    const req = makeMockRequest();

    await service.logout(req, res);

    expect(sessionService.end).toHaveBeenCalledWith(req, res);
  });

  it("does not touch the session when there is no authenticated user", async () => {
    const { sessionService, service } = setup();
    mockedRequireUserId.mockImplementation(() => {
      throw new UnauthorizedError({ message: "no user" });
    });

    await expect(service.logout(makeMockRequest(), res)).rejects.toThrow(
      UnauthorizedError
    );
    expect(sessionService.end).not.toHaveBeenCalled();
  });

  it("propagates a failure to destroy the session", async () => {
    const { sessionService, service } = setup();
    sessionService.end.mockRejectedValue(new Error("redis down"));

    await expect(service.logout(makeMockRequest(), res)).rejects.toThrow(
      "redis down"
    );
  });
});
