import { test, expect } from "@/fixtures";
import type { ApiClient } from "@/api";
import { errorOf, setCookie } from "@/api/response";
import { fill, pattern, serverMessage } from "@/data/copy";
import { KNOWN_OTP } from "@/data/test-data";
import { createAccount, throwawayEmail } from "@/utils/accounts";
import { deleteKeyOnceSet, hasCode, plantCode } from "@/utils/redis";

// /auth/login/otp/{send,verify} — server/src/modules/login
// (strategies/otp-login, guards/otp-cooldown + otp-lockout).
//   6 digits, 5 min, 60 s cooldown, 5 wrong tries → locked 15 min.
//   Send answers the same for an address that cannot sign in (no enumeration).

test.use({ role: "guest" });

let api: ApiClient;
test.beforeEach(async ({ newApi }) => {
  api = await newApi();
});

const loginErrors = serverMessage.login.errors;

/**
 * Sends a login code `count` times, dropping the 60 s cooldown key before each
 * repeat to stand in for the wait. Returns the last answer's status and code.
 */
async function sendRepeatedly(
  client: ApiClient,
  email: string,
  count: number
): Promise<{ status: number; code: string | undefined }> {
  let last = { status: 0, code: undefined as string | undefined };
  for (let n = 1; n <= count; n += 1) {
    // Stand in for the 60 s wait. The server writes the cooldown after it
    // answers, so wait for the key before dropping it.
    if (n > 1) await deleteKeyOnceSet(`otp-login-cooldown:${email}`);
    const res = await client.auth.sendLoginOtp(email);
    const body = (await res.json()) as { code?: string };
    last = { status: res.status(), code: body.code };
    if (n < count) expect(last.status, `send #${n} to ${email}`).toBe(200);
  }
  return last;
}

test(
  "Code send hides whether the address exists and enforces a cooldown",
  { tag: ["@TC-AUTH-034"] },
  async () => {
    const account = await createAccount({ tag: "auth-otp-send" });
    const unknown = throwawayEmail("auth-otp-nobody");

    const real = await api.auth.sendLoginOtp(account.email);
    const ghost = await api.auth.sendLoginOtp(unknown);
    expect(real.status()).toBe(200);
    expect(ghost.status()).toBe(200);
    const expected = { success: true, expiresIn: 300, cooldown: 60 };
    expect((await real.json()).data).toEqual(expected);
    expect((await ghost.json()).data).toEqual(expected);
    // …but only the real account was actually issued a code.
    expect(await hasCode("login", account.email)).toBe(true);
    expect(await hasCode("login", unknown)).toBe(false);

    const again = await api.auth.sendLoginOtp(account.email);
    expect(again.status()).toBe(400);
    const err = await errorOf(again);
    expect(err.code).toBe("LOGIN_OTP_COOLDOWN");
    expect(err.message).toMatch(
      pattern(loginErrors.otpCooldown, {}, { exact: true })
    );
  }
);

test(
  "A valid code signs in once and cannot be reused",
  { tag: ["@TC-AUTH-035", "@smoke"] },
  async () => {
    const account = await createAccount({ tag: "auth-otp-ok" });
    expect((await api.auth.sendLoginOtp(account.email)).status()).toBe(200);
    await plantCode("login", account.email, KNOWN_OTP);

    const ok = await api.auth.verifyLoginOtp(account.email, KNOWN_OTP);
    expect(ok.status()).toBe(200);
    const { data } = await ok.json();
    expect(data.accessToken).toBeTruthy();
    expect(data).not.toHaveProperty("refreshToken");
    expect(setCookie(ok, "refreshToken")).toMatch(/HttpOnly/i);

    const replay = await api.auth.verifyLoginOtp(account.email, KNOWN_OTP);
    expect(replay.status()).toBe(401);
    expect((await errorOf(replay)).code).toBe("LOGIN_OTP_INVALID");
  }
);

test(
  "Five wrong codes lock code sign-in, even for the right code",
  { tag: ["@TC-AUTH-036"] },
  async () => {
    const account = await createAccount({ tag: "auth-otp-lock" });
    expect((await api.auth.sendLoginOtp(account.email)).status()).toBe(200);
    await plantCode("login", account.email, KNOWN_OTP);

    for (let attempt = 1; attempt <= 4; attempt += 1) {
      const res = await api.auth.verifyLoginOtp(account.email, "999999");
      expect(res.status()).toBe(401);
      expect((await errorOf(res)).message).toBe(
        fill(loginErrors.invalidOtpWithRemaining, { remaining: 5 - attempt })
      );
    }
    const fifth = await api.auth.verifyLoginOtp(account.email, "999999");
    expect(fifth.status()).toBe(429);
    const locked = await errorOf(fifth);
    expect(locked.code).toBe("LOGIN_OTP_LOCKED");
    expect(locked.message).toBe(fill(loginErrors.otpLocked, { minutes: 15 }));

    const right = await api.auth.verifyLoginOtp(account.email, KNOWN_OTP);
    expect(right.status()).toBe(429);
    expect((await errorOf(right)).code).toBe("LOGIN_OTP_LOCKED");
  }
);

test(
  "The login code must be exactly 6 digits",
  { tag: ["@TC-AUTH-061"] },
  async () => {
    const account = await createAccount({ tag: "auth-otp-bva" });

    const cases: [string, string][] = [
      ["12345", "string.length"], // 5 — min − 1
      ["1234567", "string.length"], // 7 — max + 1
      ["12a456", "string.pattern.base"], // 6, not all digits
      ["", "string.empty"]
    ];
    for (const [otp, reason] of cases) {
      const res = await api.auth.verifyLoginOtp(account.email, otp);
      expect(res.status(), `otp "${otp}"`).toBe(400);
      const err = await errorOf(res);
      expect(err.code).toBe("VALIDATION_ERROR");
      expect(err.errors).toContainEqual(
        expect.objectContaining({ field: "otp", reason })
      );
    }

    // Six digits pass validation; a wrong one is a business error.
    const sixDigits = await api.auth.verifyLoginOtp(account.email, "000000");
    expect(sixDigits.status()).toBe(401);
    expect((await errorOf(sixDigits)).code).toBe("LOGIN_OTP_INVALID");
  }
);

test(
  "Login code sends are capped at three per code lifetime",
  { tag: ["@TC-AUTH-062"] },
  async () => {
    // Many sequential sends, each several round trips to the cloud Redis.
    test.slow();
    const account = await createAccount({ tag: "auth-otp-cap" });
    expect((await sendRepeatedly(api, account.email, 3)).status).toBe(200);

    await deleteKeyOnceSet(`otp-login-cooldown:${account.email}`);
    const fourth = await api.auth.sendLoginOtp(account.email);
    expect(fourth.status()).toBe(400);
    const err = await errorOf(fourth);
    expect(err.code).toBe("LOGIN_OTP_RESEND_LIMIT");
    expect(err.message).toBe(loginErrors.otpResendLimitExceeded);
  }
);

test(
  "The code-send cap answers an unknown address the same way",
  { tag: ["@TC-AUTH-063"] },
  async () => {
    // The cap is checked before the eligibility branch, so a real address and a
    // ghost get the same 4th answer (fixed BUG-AUTH-05).
    test.slow(); // eight sends, each several round trips to the cloud Redis
    const account = await createAccount({ tag: "auth-otp-capenum" });
    const ghost = throwawayEmail("auth-otp-capghost");

    const real = await sendRepeatedly(api, account.email, 4);
    const unknown = await sendRepeatedly(api, ghost, 4);
    expect(real.status).toBe(400);
    expect(unknown).toEqual(real);
  }
);
