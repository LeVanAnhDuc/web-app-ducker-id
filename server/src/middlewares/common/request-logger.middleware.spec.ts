// others
import { Logger } from "@/libs/logger";
import { requestLogger } from "./request-logger.middleware";

describe("requestLogger", () => {
  afterEach(() => jest.restoreAllMocks());

  it("redacts sensitive fields in the logged body and calls next", () => {
    const httpSpy = jest
      .spyOn(Logger, "http")
      .mockImplementation(() => undefined);
    const next = jest.fn();
    const req = {
      method: "POST",
      originalUrl: "/api/v1/auth/login",
      requestId: "r1",
      ip: "127.0.0.1",
      get: () => "jest",
      body: { email: "a@b.com", password: "secret" },
      query: {},
      params: {}
    } as never;
    const res = { on: jest.fn() } as never;

    requestLogger(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    const meta = httpSpy.mock.calls[0][1] as { body: Record<string, unknown> };
    expect(meta.body).toEqual({ email: "a@b.com", password: "[REDACTED]" });
  });
});
