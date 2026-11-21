// libs
import { StatusCodes } from "http-status-codes";
// others
import {
  AppError,
  BadRequestError,
  ConflictRequestError,
  DatabaseError,
  ForbiddenError,
  InternalServerError,
  NotFoundError,
  OAuthError,
  ServiceUnavailableError,
  TooManyRequestsError,
  UnauthorizedError,
  ValidationError
} from "@/exceptions";

describe("exception classes", () => {
  it.each([
    [BadRequestError, StatusCodes.BAD_REQUEST, "BAD_REQUEST", "Bad Request"],
    [
      UnauthorizedError,
      StatusCodes.UNAUTHORIZED,
      "UNAUTHORIZED",
      "Unauthorized"
    ],
    [ForbiddenError, StatusCodes.FORBIDDEN, "FORBIDDEN", "Forbidden"],
    [NotFoundError, StatusCodes.NOT_FOUND, "NOT_FOUND", "Not Found"],
    [ConflictRequestError, StatusCodes.CONFLICT, "CONFLICT", "Conflict"],
    [
      TooManyRequestsError,
      StatusCodes.TOO_MANY_REQUESTS,
      "TOO_MANY_REQUESTS",
      "Too Many Requests"
    ],
    [
      InternalServerError,
      StatusCodes.INTERNAL_SERVER_ERROR,
      "INTERNAL_SERVER_ERROR",
      "Internal Server Error"
    ],
    [
      ServiceUnavailableError,
      StatusCodes.SERVICE_UNAVAILABLE,
      "SERVICE_UNAVAILABLE",
      "Service Unavailable"
    ]
  ])(
    "%p defaults to its status, code and reason phrase",
    (Cls, status, code, message) => {
      const err = new Cls();

      expect(err).toBeInstanceOf(AppError);
      expect(err).toBeInstanceOf(Error);
      expect(err).toMatchObject({ status, code, message, errors: [] });
      expect(err.name).toBe(Cls.name);
    }
  );

  it("lets the caller override the code and carry a key, params and cause", () => {
    const cause = new Error("root");
    const err = new NotFoundError({
      code: "USER_NOT_FOUND",
      key: "user:errors.notFound",
      params: { id: "1" },
      cause
    });

    expect(err).toMatchObject({
      status: StatusCodes.NOT_FOUND,
      code: "USER_NOT_FOUND",
      key: "user:errors.notFound",
      params: { id: "1" },
      cause
    });
  });

  it("keeps the classes apart for instanceof", () => {
    expect(new NotFoundError()).not.toBeInstanceOf(ForbiddenError);
  });

  it("ValidationError carries field errors", () => {
    const errors = [{ field: "email", reason: "required", message: "x" }];
    const err = new ValidationError({ errors });

    expect(err).toMatchObject({
      status: StatusCodes.BAD_REQUEST,
      code: "VALIDATION_ERROR",
      errors,
      name: "ValidationError"
    });
  });

  it("DatabaseError keeps the operation and the wrapped error", () => {
    const cause = new Error("timeout");
    const err = new DatabaseError("findUser", cause);

    expect(err).toMatchObject({
      operation: "findUser",
      cause,
      name: "DatabaseError",
      code: "DATABASE_ERROR"
    });
  });

  it("OAuthError still reports its own name", () => {
    expect(new OAuthError({ error: "invalid_request" }).name).toBe(
      "OAuthError"
    );
  });
});
