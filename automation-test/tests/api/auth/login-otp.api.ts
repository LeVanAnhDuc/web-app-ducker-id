import { test, expect } from "@fixtures";
import type { APIRequestContext } from "@playwright/test";
import { KNOWN_OTP, createAccount, throwawayEmail } from "@helpers/accounts";
import { hasCode, plantCode } from "@helpers/redis";
import { API, errorOf, newApi, setCookie } from "@helpers/auth";

// /api/v1/auth/login/otp/{send,verify} — server/src/modules/login
// (strategies/otp-login, guards/otp-cooldown + otp-lockout).
//   6 digits, 5 min, 60 s cooldown, 5 wrong tries → locked 15 min.
//   Send answers the same for an address that cannot sign in (no enumeration).

test.use({ role: "guest" });

let api: APIRequestContext;
test.beforeEach(async () => {
  api = await newApi();
});
test.afterEach(async () => {
  await api.dispose();
});

const SEND = `${API}/auth/login/otp/send`;
const VERIFY = `${API}/auth/login/otp/verify`;

test(
  "send answers identically for a real and an unknown address, then enforces the cooldown",
  { tag: ["@TC-AUTH-034"] },
  async () => {
    const account = await createAccount({ tag: "auth-otp-send" });
    const unknown = throwawayEmail("auth-otp-nobody");

    const real = await api.post(SEND, { data: { email: account.email } });
    const ghost = await api.post(SEND, { data: { email: unknown } });
    expect(real.status()).toBe(200);
    expect(ghost.status()).toBe(200);
    const expected = { success: true, expiresIn: 300, cooldown: 60 };
    expect((await real.json()).data).toEqual(expected);
    expect((await ghost.json()).data).toEqual(expected);
    // …but only the real account was actually issued a code.
    expect(await hasCode("login", account.email)).toBe(true);
    expect(await hasCode("login", unknown)).toBe(false);

    const again = await api.post(SEND, { data: { email: account.email } });
    expect(again.status()).toBe(400);
    const err = await errorOf(again);
    expect(err.code).toBe("LOGIN_OTP_COOLDOWN");
    expect(err.message).toMatch(
      /^Please wait \d+ seconds before requesting a new OTP$/
    );
  }
);

test(
  "a valid code signs in once; the same code cannot be used again",
  { tag: ["@TC-AUTH-035"] },
  async () => {
    const account = await createAccount({ tag: "auth-otp-ok" });
    expect(
      (await api.post(SEND, { data: { email: account.email } })).status()
    ).toBe(200);
    await plantCode("login", account.email, KNOWN_OTP);

    const ok = await api.post(VERIFY, {
      data: { email: account.email, otp: KNOWN_OTP }
    });
    expect(ok.status()).toBe(200);
    const { data } = await ok.json();
    expect(data.accessToken).toBeTruthy();
    expect(data).not.toHaveProperty("refreshToken");
    expect(setCookie(ok, "refreshToken")).toMatch(/HttpOnly/i);

    const replay = await api.post(VERIFY, {
      data: { email: account.email, otp: KNOWN_OTP }
    });
    expect(replay.status()).toBe(401);
    expect((await errorOf(replay)).code).toBe("LOGIN_OTP_INVALID");
  }
);

test(
  "five wrong codes lock code sign-in, even for the right code",
  { tag: ["@TC-AUTH-036"] },
  async () => {
    const account = await createAccount({ tag: "auth-otp-lock" });
    expect(
      (await api.post(SEND, { data: { email: account.email } })).status()
    ).toBe(200);
    await plantCode("login", account.email, KNOWN_OTP);

    for (let attempt = 1; attempt <= 4; attempt += 1) {
      const res = await api.post(VERIFY, {
        data: { email: account.email, otp: "999999" }
      });
      expect(res.status()).toBe(401);
      expect((await errorOf(res)).message).toBe(
        `Invalid OTP code. ${5 - attempt} attempts remaining`
      );
    }
    const fifth = await api.post(VERIFY, {
      data: { email: account.email, otp: "999999" }
    });
    expect(fifth.status()).toBe(429);
    const locked = await errorOf(fifth);
    expect(locked.code).toBe("LOGIN_OTP_LOCKED");
    expect(locked.message).toBe(
      "Too many failed OTP attempts. Please try again in 15 minutes"
    );

    const right = await api.post(VERIFY, {
      data: { email: account.email, otp: KNOWN_OTP }
    });
    expect(right.status()).toBe(429);
    expect((await errorOf(right)).code).toBe("LOGIN_OTP_LOCKED");
  }
);
