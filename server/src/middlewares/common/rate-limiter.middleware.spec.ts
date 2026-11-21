// types
import type { Request } from "express";
import type { RateLimitName } from "./rate-limiter.middleware";
// others
import {
  createRateLimiters,
  emailRateLimitKey,
  isUserKeyed,
  RATE_LIMITS
} from "./rate-limiter.middleware";

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

describe("RATE_LIMITS", () => {
  const entries = Object.entries(RATE_LIMITS);

  it("gives every limiter its own Redis prefix", () => {
    // Two limiters on one prefix would share a counter
    const prefixes = entries.map(([, [config]]) => config.KEY);

    expect(new Set(prefixes).size).toBe(prefixes.length);
  });

  it("uses a positive window and ceiling everywhere", () => {
    for (const [, [config]] of entries) {
      expect(config.WINDOW_SECONDS).toBeGreaterThan(0);
      expect(config.MAX_REQUESTS).toBeGreaterThan(0);
    }
  });
});

describe("createRateLimiters", () => {
  it("builds one middleware per named limiter", () => {
    const redis = { sendCommand: jest.fn().mockResolvedValue("sha") };
    const limiters = createRateLimiters(redis as never);

    expect(Object.keys(limiters).sort()).toEqual(
      Object.keys(RATE_LIMITS).sort()
    );
    for (const limiter of Object.values(limiters)) {
      expect(typeof limiter).toBe("function");
    }
  });
});

describe("isUserKeyed", () => {
  it("names exactly the limiters keyed by the authenticated user", () => {
    const userKeyed = (Object.keys(RATE_LIMITS) as RateLimitName[]).filter(
      isUserKeyed
    );

    expect(userKeyed.sort()).toEqual([
      "adminUserMutationByIpAndUser",
      "categoryMutationByIpAndUser",
      "changePasswordByIpAndUser",
      "entitlementMutationByIpAndUser",
      "recordRecentAppByUser"
    ]);
  });
});
