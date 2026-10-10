import { test, expect } from "@fixtures";
import type { APIRequestContext } from "@playwright/test";
import { KNOWN_OTP, findUserByEmail, throwawayEmail } from "@helpers/accounts";
import { USER_EMAIL } from "@helpers/env";
import {
  clearEmailState,
  deleteKeys,
  hasCode,
  plantCode
} from "@helpers/redis";
import {
  API,
  completeBody,
  errorOf,
  newApi,
  verifiedSignupSession
} from "@helpers/auth";

// /api/v1/auth/signup/* — server/src/modules/signup.
//   OTP: 6 digits, 5 min, 60 s resend cooldown, 5 wrong tries → locked,
//   max 5 resends / hour (constants/index.ts). Verify issues a 64-hex
//   session token that complete-signup consumes.
//   Schema: validators/schemas/signup.ts + base.ts.

test.use({ role: "guest" });

let api: APIRequestContext;
test.beforeEach(async () => {
  api = await newApi();
});
test.afterEach(async () => {
  await api.dispose();
});

const SEND = `${API}/auth/signup/send-otp`;
const RESEND = `${API}/auth/signup/resend-otp`;
const VERIFY = `${API}/auth/signup/verify-otp`;
const COMPLETE = `${API}/auth/signup/complete`;
/** Right length, never issued by the server. */
const FAKE_SESSION = "0".repeat(64);

async function freshEmail(tag: string): Promise<string> {
  const email = throwawayEmail(tag);
  await clearEmailState(email);
  return email;
}

test(
  "check-email tells a registered address from a free one",
  { tag: ["@TC-AUTH-007"] },
  async () => {
    const taken = await api.get(
      `${API}/auth/signup/check-email/${encodeURIComponent(USER_EMAIL)}`
    );
    expect(taken.status()).toBe(200);
    expect((await taken.json()).data).toEqual({ available: false });

    const free = await api.get(
      `${API}/auth/signup/check-email/${encodeURIComponent(throwawayEmail("auth-free"))}`
    );
    expect((await free.json()).data).toEqual({ available: true });

    const bad = await api.get(`${API}/auth/signup/check-email/not-an-email`);
    expect(bad.status()).toBe(400);
    expect((await errorOf(bad)).code).toBe("VALIDATION_ERROR");
  }
);

test(
  "send-otp issues a code and verify-otp exchanges it for a session token",
  { tag: ["@TC-AUTH-011"] },
  async () => {
    const email = await freshEmail("auth-su-ok");

    const send = await api.post(SEND, { data: { email } });
    expect(send.status()).toBe(200);
    expect((await send.json()).data).toEqual({
      success: true,
      expiresIn: 300,
      cooldownSeconds: 60
    });
    expect(await hasCode("signup", email)).toBe(true);

    await plantCode("signup", email, KNOWN_OTP);
    const verify = await api.post(VERIFY, {
      data: { email, otp: KNOWN_OTP }
    });
    expect(verify.status()).toBe(200);
    const { data } = await verify.json();
    expect(data.success).toBe(true);
    expect(data.sessionToken).toMatch(/^[a-f0-9]{64}$/);
    expect(data.expiresIn).toBe(30 * 60);
    // No account exists until the info step is completed.
    expect(await findUserByEmail(email)).toBeNull();
  }
);

test(
  "the OTP must be exactly 6 digits",
  { tag: ["@TC-AUTH-012"] },
  async () => {
    const email = await freshEmail("auth-su-bva");
    expect((await api.post(SEND, { data: { email } })).status()).toBe(200);

    const cases: [string, string][] = [
      ["12345", "string.length"], // 5 — min − 1
      ["1234567", "string.length"], // 7 — max + 1
      ["12a456", "string.pattern.base"], // 6, not all digits
      ["", "string.empty"]
    ];
    for (const [otp, reason] of cases) {
      const res = await api.post(VERIFY, { data: { email, otp } });
      expect(res.status(), `otp "${otp}"`).toBe(400);
      const err = await errorOf(res);
      expect(err.code).toBe("VALIDATION_ERROR");
      expect(err.errors).toContainEqual(
        expect.objectContaining({ field: "otp", reason })
      );
    }

    // A 6-digit code passes validation; a wrong one is a business error.
    const sixDigits = await api.post(VERIFY, {
      data: { email, otp: "000000" }
    });
    expect(sixDigits.status()).toBe(400);
    expect((await errorOf(sixDigits)).code).toBe("SIGNUP_OTP_INVALID");
  }
);

test(
  "a registered email cannot start sign-up",
  { tag: ["@TC-AUTH-013"] },
  async () => {
    const res = await api.post(SEND, { data: { email: USER_EMAIL } });
    expect(res.status()).toBe(409);
    const err = await errorOf(res);
    expect(err.code).toBe("SIGNUP_EMAIL_EXISTS");
    expect(err.message).toBe("Email is already registered");
  }
);

test(
  "resend is refused during the cooldown and counted once it has passed",
  { tag: ["@TC-AUTH-014"] },
  async () => {
    const email = await freshEmail("auth-su-cd");
    expect((await api.post(SEND, { data: { email } })).status()).toBe(200);

    for (const url of [SEND, RESEND]) {
      const early = await api.post(url, { data: { email } });
      expect(early.status(), url).toBe(400);
      expect((await errorOf(early)).code).toBe("SIGNUP_OTP_COOLDOWN");
    }

    // Cooldown over (the 60 s key expires) → resend works and is counted.
    await deleteKeys(`otp-signup-cooldown:${email}`);
    const resend = await api.post(RESEND, { data: { email } });
    expect(resend.status()).toBe(200);
    expect((await resend.json()).data).toEqual({
      success: true,
      expiresIn: 300,
      cooldownSeconds: 60,
      resendCount: 1,
      maxResends: 5,
      remainingResends: 4
    });

    // The resent code replaces the first one.
    await plantCode("signup", email, KNOWN_OTP);
    const verify = await api.post(VERIFY, { data: { email, otp: KNOWN_OTP } });
    expect(verify.status()).toBe(200);
  }
);

test(
  "five wrong codes lock verification and the right code is refused afterwards",
  { tag: ["@TC-AUTH-015"] },
  async () => {
    const email = await freshEmail("auth-su-lock");
    expect((await api.post(SEND, { data: { email } })).status()).toBe(200);
    await plantCode("signup", email, KNOWN_OTP);

    for (let attempt = 1; attempt <= 4; attempt += 1) {
      const res = await api.post(VERIFY, { data: { email, otp: "111111" } });
      expect(res.status()).toBe(400);
      const err = await errorOf(res);
      expect(err.code).toBe("SIGNUP_OTP_INVALID");
      expect(err.message).toBe(
        `Invalid OTP. You have ${5 - attempt} attempt(s) remaining`
      );
    }
    const fifth = await api.post(VERIFY, { data: { email, otp: "111111" } });
    expect(fifth.status()).toBe(400);
    expect((await errorOf(fifth)).code).toBe("SIGNUP_OTP_LOCKED");

    const right = await api.post(VERIFY, { data: { email, otp: KNOWN_OTP } });
    expect(right.status()).toBe(400);
    const err = await errorOf(right);
    expect(err.code).toBe("SIGNUP_OTP_LOCKED");
    expect(err.message).toBe(
      "Too many failed attempts. Please try again later"
    );
  }
);

test(
  "a code that was already used cannot verify again",
  { tag: ["@TC-AUTH-016"] },
  async () => {
    const email = await freshEmail("auth-su-reuse");
    await verifiedSignupSession(api, email);

    const again = await api.post(VERIFY, { data: { email, otp: KNOWN_OTP } });
    expect(again.status()).toBe(400);
    expect((await errorOf(again)).code).toBe("SIGNUP_OTP_INVALID");
  }
);

test(
  "sign-up cannot be completed without a verified code",
  { tag: ["@TC-AUTH-017"] },
  async () => {
    // State: code sent but never verified.
    const email = await freshEmail("auth-su-skip");
    expect((await api.post(SEND, { data: { email } })).status()).toBe(200);

    const res = await api.post(COMPLETE, {
      data: completeBody(email, FAKE_SESSION)
    });
    expect(res.status()).toBe(400);
    const err = await errorOf(res);
    expect(err.code).toBe("SIGNUP_SESSION_INVALID");
    expect(err.message).toBe(
      "Session expired or invalid. Please verify OTP again"
    );
    expect(await findUserByEmail(email)).toBeNull();

    // Another address's session token does not carry over.
    const other = await freshEmail("auth-su-other");
    const otherToken = await verifiedSignupSession(api, other);
    const crossed = await api.post(COMPLETE, {
      data: completeBody(email, otherToken)
    });
    expect((await errorOf(crossed)).code).toBe("SIGNUP_SESSION_INVALID");
    expect(await findUserByEmail(email)).toBeNull();
  }
);

test(
  "the session token works once: completing creates the account, a replay is refused",
  { tag: ["@TC-AUTH-018"] },
  async () => {
    const email = await freshEmail("auth-su-once");
    const sessionToken = await verifiedSignupSession(api, email);

    const first = await api.post(COMPLETE, {
      data: completeBody(email, sessionToken)
    });
    expect(first.status()).toBe(201);
    const { data } = await first.json();
    expect(data.user).toMatchObject({ email, fullName: "Auth Tester" });
    expect(data.tokens.accessToken).toBeTruthy();
    expect(await findUserByEmail(email)).not.toBeNull();

    const replay = await api.post(COMPLETE, {
      data: completeBody(email, sessionToken)
    });
    expect(replay.status()).toBe(400);
    expect((await errorOf(replay)).code).toBe("SIGNUP_SESSION_INVALID");

    // The new account can sign in with the password it chose.
    const login = await api.post(`${API}/auth/login`, {
      data: { email, password: "Signup@123" }
    });
    expect(login.status()).toBe(200);
  }
);

test(
  "password strength policy — boundaries and character classes",
  { tag: ["@TC-AUTH-019"] },
  async () => {
    const email = throwawayEmail("auth-su-pw");
    const tail128 = "Aa1@" + "x".repeat(124);
    const cases: [string, string | null][] = [
      ["Abcd@12", "string.min"], // 7 chars — min − 1
      ["Abcd@123", null], // 8 chars — min
      [tail128, null], // 128 chars — max
      [tail128 + "x", "string.max"], // 129 chars — max + 1
      ["abcd@1234", "string.pattern.base"], // no upper-case
      ["ABCD@1234", "string.pattern.base"], // no lower-case
      ["Abcd@efgh", "string.pattern.base"], // no digit
      ["Abcd12345", "string.pattern.base"], // no special
      ["Abcd#1234", "string.pattern.base"] // '#' is not an allowed special
    ];
    for (const [password, reason] of cases) {
      const res = await api.post(COMPLETE, {
        data: completeBody(email, FAKE_SESSION, {
          password,
          confirmPassword: password
        })
      });
      const err = await errorOf(res);
      if (reason === null) {
        // Valid password → validation passes, the fake session is what fails.
        expect(err.code, `"${password}" should be accepted`).toBe(
          "SIGNUP_SESSION_INVALID"
        );
      } else {
        expect(err.code, `"${password}"`).toBe("VALIDATION_ERROR");
        expect(err.errors).toContainEqual(
          expect.objectContaining({ field: "password", reason })
        );
      }
    }
  }
);

test(
  "profile fields, password confirmation and terms acceptance are validated",
  { tag: ["@TC-AUTH-020"] },
  async () => {
    const email = throwawayEmail("auth-su-fields");
    const ymd = (d: Date) => d.toISOString().slice(0, 10);
    const yearsAgo = (years: number, plusDays = 0) => {
      const d = new Date();
      d.setUTCFullYear(d.getUTCFullYear() - years);
      d.setUTCDate(d.getUTCDate() + plusDays);
      return ymd(d);
    };

    const invalid: [Record<string, unknown>, string, string][] = [
      [{ fullName: "A" }, "fullName", "string.min"],
      [{ fullName: "John3" }, "fullName", "string.pattern.base"],
      [{ gender: "unknown" }, "gender", "any.only"],
      [{ dateOfBirth: yearsAgo(13, 2) }, "dateOfBirth", "date.max"], // 12 y
      [{ dateOfBirth: yearsAgo(121) }, "dateOfBirth", "date.min"],
      [{ confirmPassword: "Signup@124" }, "confirmPassword", "any.only"],
      [{ acceptTerms: false }, "acceptTerms", "any.only"],
      [{ acceptTerms: "true" }, "acceptTerms", "boolean.base"],
      [{ acceptTerms: undefined }, "acceptTerms", "any.required"],
      [{ sessionToken: "abc" }, "sessionToken", "string.length"]
    ];
    for (const [override, field, reason] of invalid) {
      const res = await api.post(COMPLETE, {
        data: completeBody(email, FAKE_SESSION, override)
      });
      expect(res.status(), JSON.stringify(override)).toBe(400);
      const err = await errorOf(res);
      expect(err.code).toBe("VALIDATION_ERROR");
      expect(err.errors, JSON.stringify(override)).toContainEqual(
        expect.objectContaining({ field, reason })
      );
    }

    // Boundaries on the valid side: 2-char name, 14 years old.
    const ok = await api.post(COMPLETE, {
      data: completeBody(email, FAKE_SESSION, {
        fullName: "Al",
        dateOfBirth: yearsAgo(14)
      })
    });
    expect((await errorOf(ok)).code).toBe("SIGNUP_SESSION_INVALID");
  }
);
