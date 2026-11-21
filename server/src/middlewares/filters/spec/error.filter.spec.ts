// types
import type { Request, Response } from "express";
// others
import { handleError } from "../error.filter";
import { InternalServerError, NotFoundError } from "@/exceptions";
import { Logger } from "@/libs/logger";

/** body-parser raises http-errors objects: a 4xx status, a type, expose. */
const bodyParserError = (status: number, type: string) =>
  Object.assign(new SyntaxError("Unexpected end of JSON input"), {
    status,
    statusCode: status,
    type,
    expose: true,
    body: '{"email":'
  });

const run = (err: unknown) => {
  const req = {
    originalUrl: "/api/v1/auth/login",
    t: jest.fn((key: string) => `t(${key})`)
  } as unknown as Request;
  const json = jest.fn();
  const res = { status: jest.fn().mockReturnValue({ json }) };
  handleError(err, req, res as unknown as Response, jest.fn());
  return { status: res.status.mock.calls[0][0], body: json.mock.calls[0][0] };
};

describe("handleError — request body errors", () => {
  it("answers a malformed JSON body with 400 MALFORMED_BODY", () => {
    const { status, body } = run(bodyParserError(400, "entity.parse.failed"));

    expect(status).toBe(400);
    expect(body).toMatchObject({
      code: "MALFORMED_BODY",
      message: "t(common:errors.malformedBody)",
      path: "/api/v1/auth/login"
    });
  });

  it("never echoes body-parser's own message or the body", () => {
    const { body } = run(bodyParserError(400, "entity.parse.failed"));

    expect(JSON.stringify(body)).not.toContain("JSON input");
    expect(JSON.stringify(body)).not.toContain("email");
  });

  it("answers an oversized body with 413 PAYLOAD_TOO_LARGE", () => {
    const { status, body } = run(bodyParserError(413, "entity.too.large"));

    expect(status).toBe(413);
    expect(body).toMatchObject({
      code: "PAYLOAD_TOO_LARGE",
      message: "t(common:errors.payloadTooLarge)"
    });
  });

  it("answers an unsupported charset with 415 UNSUPPORTED_MEDIA_TYPE", () => {
    const { status, body } = run(bodyParserError(415, "charset.unsupported"));

    expect(status).toBe(415);
    expect(body.code).toBe("UNSUPPORTED_MEDIA_TYPE");
  });

  it("still answers an unknown error with 500", () => {
    const { status, body } = run(new Error("boom"));

    expect(status).toBe(500);
    expect(body.code).toBe("INTERNAL_SERVER_ERROR");
  });
});

describe("handleError — logging", () => {
  let logError: jest.SpyInstance;

  beforeEach(() => {
    logError = jest.spyOn(Logger, "error").mockImplementation(() => {});
  });

  it("logs an unknown error with its stack", () => {
    const boom = new TypeError("x is undefined");
    run(boom);

    expect(logError).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/auth/login"),
      boom,
      expect.any(Object)
    );
  });

  it("logs a 5xx AppError together with the error it wraps", () => {
    const cause = new Error("connection reset");
    run(new InternalServerError({ cause }));

    expect(logError).toHaveBeenCalledTimes(1);
    expect(logError.mock.calls[0][2]).toMatchObject({
      code: "INTERNAL_SERVER_ERROR",
      cause: cause.stack
    });
  });

  it("does not log a 4xx — the client's mistake is not ours", () => {
    run(new NotFoundError({ key: "common:errors.notFound" }));

    expect(logError).not.toHaveBeenCalled();
  });

  it("never sends the cause to the client", () => {
    const { body } = run(
      new InternalServerError({ cause: new Error("secret detail") })
    );

    expect(JSON.stringify(body)).not.toContain("secret detail");
  });
});
