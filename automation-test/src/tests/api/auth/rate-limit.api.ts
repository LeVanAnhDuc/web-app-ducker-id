import { test, expect } from "@/fixtures";
import type { APIResponse } from "@playwright/test";
import type { ApiClient } from "@/api";
import { errorOf } from "@/api/response";
import { serverMessage } from "@/data/copy";
import { WRONG_PASSWORD } from "@/data/test-data";
import { throwawayEmail } from "@/utils/accounts";
import { clearIpLimit } from "@/utils/auth";
import { deleteKeys } from "@/utils/redis";

// Request rate limits — server/src/constants/redis/rate-limit/index.ts,
// applied before validation by middlewares/common/rate-limiter.middleware.ts.
//
//   endpoint                      per IP (15 min)   per email (15 min)
//   POST /auth/login              30                —
//   POST /auth/login/otp/send     10                5
//   POST /auth/login/magic-link/… 10                5
//   POST /auth/signup/send-otp    5                 3
//   GET  /auth/signup/check-email 10 (1 min)        —
//
// Each test starts its own counters from zero (the counters it reads are
// deleted first) and deletes them again afterwards, so a 429 here can never
// leak into another spec. The addresses are fresh throwaways that never
// become accounts, so no lockout or code state is touched.

test.use({ role: "guest", keepRateLimits: true });

let api: ApiClient;
test.beforeEach(async ({ newApi }) => {
  api = await newApi();
});
test.afterEach(async () => {
  await deleteKeys("rate-limit:*");
});

async function expectLimited(res: APIResponse, message: string) {
  expect(res.status()).toBe(429);
  const err = await errorOf(res);
  expect(err.code).toBe("TOO_MANY_REQUESTS");
  expect(err.message).toBe(message);
}

test(
  "Password sign-in is limited to 30 requests per IP",
  { tag: ["@TC-AUTH-050"] },
  async () => {
    await clearIpLimit("login");
    const email = throwawayEmail("auth-rl-ip");
    for (let n = 1; n <= 30; n += 1) {
      const res = await api.auth.login(email, WRONG_PASSWORD);
      expect(res.status(), `request #${n}`).toBe(401);
      if (n === 30) {
        expect(res.headers()["ratelimit-remaining"]).toBe("0");
      }
    }
    const over = await api.auth.login(email, WRONG_PASSWORD);
    await expectLimited(over, serverMessage.login.errors.rateLimitExceeded);
    expect(Number(over.headers()["ratelimit-limit"])).toBe(30);

    // The limit is per IP: another address from the same IP is refused too.
    const other = await api.auth.login(
      throwawayEmail("auth-rl-ip2"),
      WRONG_PASSWORD
    );
    expect(other.status()).toBe(429);
  }
);

test.describe("Code and magic-link sends are limited to 5 per email", () => {
  for (const [path, name, send] of [
    ["otp/send", "login-otp", (email: string) => api.auth.sendLoginOtp(email)],
    [
      "magic-link/send",
      "magic-link",
      (email: string) => api.auth.sendMagicLink(email)
    ]
  ] as const) {
    test(
      `${path} allows 5 requests per email, the 6th is refused while another email still passes`,
      { tag: ["@TC-AUTH-051"] },
      async () => {
        await clearIpLimit(name);
        const email = throwawayEmail("auth-rl-mail");
        for (let n = 1; n <= 5; n += 1) {
          const res = await send(email);
          // 1st: generic success; 2nd–5th: the per-address cooldown.
          expect(res.status(), `request #${n}`).toBe(n === 1 ? 200 : 400);
        }
        const over = await send(email);
        await expectLimited(over, serverMessage.login.errors.rateLimitExceeded);
        // Same IP (6 of 10 used), different address → not limited.
        const other = await send(throwawayEmail("auth-rl-mail2"));
        expect(other.status()).toBe(200);
      }
    );
  }
});

test(
  "Sign-up codes are limited to 3 per email and 5 per IP",
  { tag: ["@TC-AUTH-052"] },
  async () => {
    await clearIpLimit("signup");
    const message = serverMessage.signup.errors.rateLimitExceeded;

    // Per email: send + 2 cooldown refusals, then 429.
    const email = throwawayEmail("auth-rl-su");
    for (let n = 1; n <= 3; n += 1) {
      const res = await api.auth.sendSignupOtp(email);
      expect(res.status(), `request #${n}`).toBe(n === 1 ? 200 : 400);
    }
    await expectLimited(await api.auth.sendSignupOtp(email), message);

    // Per IP: start the IP window over; 5 different addresses pass, the 6th not.
    await clearIpLimit("signup");
    for (let n = 1; n <= 5; n += 1) {
      const res = await api.auth.sendSignupOtp(
        throwawayEmail(`auth-rl-su${n}`)
      );
      expect(res.status(), `address #${n}`).toBe(200);
    }
    await expectLimited(
      await api.auth.sendSignupOtp(throwawayEmail("auth-rl-su6")),
      message
    );
  }
);

test(
  "check-email is limited to 10 requests per IP per minute",
  { tag: ["@TC-AUTH-067"] },
  async () => {
    await clearIpLimit("check-email");
    for (let n = 1; n <= 10; n += 1) {
      const res = await api.auth.checkEmail(throwawayEmail(`auth-rl-ce${n}`));
      expect(res.status(), `request #${n}`).toBe(200);
    }
    await expectLimited(
      await api.auth.checkEmail(throwawayEmail("auth-rl-ce11")),
      serverMessage.signup.errors.rateLimitExceeded
    );
  }
);
