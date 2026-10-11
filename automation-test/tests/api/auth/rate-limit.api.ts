import { test, expect } from "@fixtures";
import type { APIRequestContext, APIResponse } from "@playwright/test";
import { throwawayEmail } from "@helpers/accounts";
import { deleteKeys } from "@helpers/redis";
import {
  API,
  WRONG_PASSWORD,
  clearIpLimit,
  errorOf,
  newApi
} from "@helpers/auth";

// Request rate limits — server/src/constants/redis/rate-limit/index.ts,
// applied before validation by middlewares/common/rate-limiter.middleware.ts.
//
//   endpoint                      per IP (15 min)   per email (15 min)
//   POST /auth/login              30                —
//   POST /auth/login/otp/send     10                5
//   POST /auth/login/magic-link/… 10                5
//   POST /auth/signup/send-otp    5                 3
//
// Each test starts its own counters from zero (the counters it reads are
// deleted first) and deletes them again afterwards, so a 429 here can never
// leak into another spec. The addresses are fresh throwaways that never
// become accounts, so no lockout or code state is touched.

test.use({ role: "guest", keepRateLimits: true });

let api: APIRequestContext;
test.beforeEach(async () => {
  api = await newApi();
});
test.afterEach(async () => {
  await api.dispose();
  await deleteKeys("rate-limit:*");
});

async function expectLimited(res: APIResponse, message: string) {
  expect(res.status()).toBe(429);
  const err = await errorOf(res);
  expect(err.code).toBe("TOO_MANY_REQUESTS");
  expect(err.message).toBe(message);
}

test(
  "password sign-in allows 30 requests per IP, the 31st is refused",
  { tag: ["@TC-AUTH-050"] },
  async () => {
    await clearIpLimit("login");
    const email = throwawayEmail("auth-rl-ip");
    for (let n = 1; n <= 30; n += 1) {
      const res = await api.post(`${API}/auth/login`, {
        data: { email, password: WRONG_PASSWORD }
      });
      expect(res.status(), `request #${n}`).toBe(401);
      if (n === 30) {
        expect(res.headers()["ratelimit-remaining"]).toBe("0");
      }
    }
    const over = await api.post(`${API}/auth/login`, {
      data: { email, password: WRONG_PASSWORD }
    });
    await expectLimited(
      over,
      "Too many login attempts. Please try again later"
    );
    expect(Number(over.headers()["ratelimit-limit"])).toBe(30);

    // The limit is per IP: another address from the same IP is refused too.
    const other = await api.post(`${API}/auth/login`, {
      data: { email: throwawayEmail("auth-rl-ip2"), password: WRONG_PASSWORD }
    });
    expect(other.status()).toBe(429);
  }
);

for (const [path, name] of [
  ["otp/send", "login-otp"],
  ["magic-link/send", "magic-link"]
] as const) {
  test(
    `${path} allows 5 requests per email, the 6th is refused while another email still passes`,
    { tag: ["@TC-AUTH-051"] },
    async () => {
      await clearIpLimit(name);
      const email = throwawayEmail("auth-rl-mail");
      for (let n = 1; n <= 5; n += 1) {
        const res = await api.post(`${API}/auth/login/${path}`, {
          data: { email }
        });
        // 1st: generic success; 2nd–5th: the per-address cooldown.
        expect(res.status(), `request #${n}`).toBe(n === 1 ? 200 : 400);
      }
      const over = await api.post(`${API}/auth/login/${path}`, {
        data: { email }
      });
      await expectLimited(
        over,
        "Too many login attempts. Please try again later"
      );
      // Same IP (6 of 10 used), different address → not limited.
      const other = await api.post(`${API}/auth/login/${path}`, {
        data: { email: throwawayEmail("auth-rl-mail2") }
      });
      expect(other.status()).toBe(200);
    }
  );
}

test(
  "sign-up codes: 3 per email and 5 per IP",
  { tag: ["@TC-AUTH-052"] },
  async () => {
    await clearIpLimit("signup");
    const SEND = `${API}/auth/signup/send-otp`;
    const message = "You have exceeded the allowed number of attempts";

    // Per email: send + 2 cooldown refusals, then 429.
    const email = throwawayEmail("auth-rl-su");
    for (let n = 1; n <= 3; n += 1) {
      const res = await api.post(SEND, { data: { email } });
      expect(res.status(), `request #${n}`).toBe(n === 1 ? 200 : 400);
    }
    await expectLimited(await api.post(SEND, { data: { email } }), message);

    // Per IP: start the IP window over; 5 different addresses pass, the 6th not.
    await clearIpLimit("signup");
    for (let n = 1; n <= 5; n += 1) {
      const res = await api.post(SEND, {
        data: { email: throwawayEmail(`auth-rl-su${n}`) }
      });
      expect(res.status(), `address #${n}`).toBe(200);
    }
    await expectLimited(
      await api.post(SEND, { data: { email: throwawayEmail("auth-rl-su6") } }),
      message
    );
  }
);
