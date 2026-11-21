jest.mock("@/modules/token/helpers", () => ({ verifyAccessToken: jest.fn() }));
jest.mock("@/utils/request-context", () => ({
  RequestContext: { setUser: jest.fn() }
}));

// types
import type { NextFunction, Request, Response } from "express";
// common
import { ForbiddenError, UnauthorizedError } from "@/exceptions";
// modules
import { verifyAccessToken } from "@/modules/token/helpers";
// others
import { ERROR_CODES } from "@/constants/error-code";
import { RequestContext } from "@/utils/request-context";
import { authGuard, passwordChangeAuthGuard } from "./auth.guard";

const mockedVerify = verifyAccessToken as jest.MockedFunction<
  typeof verifyAccessToken
>;

const PAYLOAD = { sub: "user-1", authId: "auth-1", roles: "user" };

// A refusal is thrown, not passed to next: Express 5 forwards a thrown error
// to the error filter itself.
const run = (guard: typeof authGuard, authorization?: string) => {
  const req = { headers: { authorization } } as unknown as Request;
  const next = jest.fn() as jest.MockedFunction<NextFunction>;
  let error: unknown;
  try {
    guard(req, {} as Response, next);
  } catch (thrown) {
    error = thrown;
  }
  return { next, error };
};

describe("authGuard", () => {
  it("lets a normal session through and records the user", () => {
    mockedVerify.mockReturnValue(PAYLOAD);

    const { next, error } = run(authGuard, "Bearer token");

    expect(error).toBeUndefined();
    expect(next).toHaveBeenCalledWith();
    expect(RequestContext.setUser).toHaveBeenCalledWith(PAYLOAD);
  });

  it("refuses a request without a bearer token", () => {
    const { next, error } = run(authGuard);

    expect(next).not.toHaveBeenCalled();
    expect(error).toBeInstanceOf(UnauthorizedError);
    expect(error).toMatchObject({ code: ERROR_CODES.AUTH_MISSING_TOKEN });
  });

  it("refuses a temporary-password session (BUG-PASSWORD-01)", () => {
    mockedVerify.mockReturnValue({ ...PAYLOAD, mustChangePassword: true });

    const { next, error } = run(authGuard, "Bearer token");

    expect(next).not.toHaveBeenCalled();
    expect(error).toBeInstanceOf(ForbiddenError);
    expect(error).toMatchObject({
      code: ERROR_CODES.AUTH_PASSWORD_CHANGE_REQUIRED
    });
    expect(RequestContext.setUser).not.toHaveBeenCalled();
  });
});

describe("passwordChangeAuthGuard", () => {
  it("lets a temporary-password session through", () => {
    mockedVerify.mockReturnValue({ ...PAYLOAD, mustChangePassword: true });

    const { next, error } = run(passwordChangeAuthGuard, "Bearer token");

    expect(error).toBeUndefined();
    expect(next).toHaveBeenCalledWith();
    expect(RequestContext.setUser).toHaveBeenCalledWith(PAYLOAD);
  });

  it("still refuses a request without a bearer token", () => {
    const { next, error } = run(passwordChangeAuthGuard);

    expect(next).not.toHaveBeenCalled();
    expect(error).toBeInstanceOf(UnauthorizedError);
  });
});
