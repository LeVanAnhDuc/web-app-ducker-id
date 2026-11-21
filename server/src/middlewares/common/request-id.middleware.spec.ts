// types
import type { Request, Response } from "express";
// others
import { requestId } from "./request-id.middleware";

const UUID_V4 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

const run = (headers: Record<string, string> = {}) => {
  const req = { headers } as unknown as Request;
  const setHeader = jest.fn();
  const res = { setHeader } as unknown as Response;
  const next = jest.fn();

  requestId(req, res, next);

  return { req, setHeader, next };
};

describe("requestId middleware", () => {
  it("assigns a UUID v4 and returns it in the X-Request-Id header", () => {
    const { req, setHeader, next } = run();

    expect(req.requestId).toMatch(UUID_V4);
    expect(setHeader).toHaveBeenCalledWith("x-request-id", req.requestId);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it("gives every request its own id", () => {
    expect(run().req.requestId).not.toBe(run().req.requestId);
  });

  it("ignores an X-Request-Id sent by the caller", () => {
    const callerId = "caller-chosen-id";

    const { req, setHeader } = run({ "x-request-id": callerId });

    expect(req.requestId).not.toBe(callerId);
    expect(req.requestId).toMatch(UUID_V4);
    expect(setHeader).toHaveBeenCalledWith("x-request-id", req.requestId);
  });
});
