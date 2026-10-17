// types
import type { Request } from "express";
// others
import { emailRateLimitKey } from "./rate-limiter.middleware";

const withBody = (body: unknown) => ({ body }) as Request;

describe("emailRateLimitKey", () => {
  it("lower-cases a string email", () => {
    expect(emailRateLimitKey(withBody({ email: "User@Test.COM" }))).toBe(
      "user@test.com"
    );
  });

  it.each([
    ["a boolean", true],
    ["a number", 123],
    ["an array", ["a@b.com"]],
    ["an object", { $ne: "" }],
    ["null", null],
    ["an empty string", ""]
  ])("falls back to the shared bucket for %s, without throwing", (_, email) => {
    expect(emailRateLimitKey(withBody({ email }))).toBe("unknown");
  });

  it("falls back when there is no body at all", () => {
    expect(emailRateLimitKey(withBody(undefined))).toBe("unknown");
    expect(emailRateLimitKey(withBody({}))).toBe("unknown");
  });
});
