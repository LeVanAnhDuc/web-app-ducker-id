import { test, expect } from "@/fixtures";
import type { ApiClient } from "@/api";
import { errorOf } from "@/api/response";
import { USER_EMAIL } from "@/config/accounts";
import { fill, serverMessage } from "@/data/copy";
import {
  KNOWN_OTP,
  signupCompleteBody as completeBody
} from "@/data/test-data";
import { findUserByEmail, throwawayEmail } from "@/utils/accounts";
import {
  clearEmailState,
  deleteKeys,
  findKeys,
  hasCode,
  clearRateLimits,
  plantCode
} from "@/utils/redis";

// /auth/signup/* — server/src/modules/signup.
//   OTP: 6 digits, 5 min, 60 s resend cooldown, 5 wrong tries → locked,
//   max 5 resends / hour (constants/index.ts). Verify issues a 64-hex
//   session token that complete-signup consumes.
//   Schema: validators/schemas/signup.ts + base.ts.

test.use({ role: "guest" });

let api: ApiClient;
test.beforeEach(async ({ newApi }) => {
  api = await newApi();
});

const signupErrors = serverMessage.signup.errors;
/** Right length, never issued by the server. */
const FAKE_SESSION = "0".repeat(64);

/**
 * Runs sign-up up to (and including) the verified OTP and returns the
 * session token the info step needs.
 */
async function verifiedSignupSession(
  client: ApiClient,
  email: string
): Promise<string> {
  const send = await client.auth.sendSignupOtp(email);
  expect(send.status(), "signup send-otp").toBe(200);
  await plantCode("signup", email, KNOWN_OTP);
  const verify = await client.auth.verifySignupOtp(email, KNOWN_OTP);
  expect(verify.status(), "signup verify-otp").toBe(200);
  const { data } = (await verify.json()) as { data: { sessionToken: string } };
  return data.sessionToken;
}

async function freshEmail(tag: string): Promise<string> {
  const email = throwawayEmail(tag);
  await clearEmailState(email);
  return email;
}

test(
  "check-email tells a registered address from a free one",
  { tag: ["@TC-AUTH-007"] },
  async () => {
    const taken = await api.auth.checkEmail(USER_EMAIL);
    expect(taken.status()).toBe(200);
    expect((await taken.json()).data).toEqual({ available: false });

    const free = await api.auth.checkEmail(throwawayEmail("auth-free"));
    expect((await free.json()).data).toEqual({ available: true });

    const bad = await api.auth.checkEmail("not-an-email");
    expect(bad.status()).toBe(400);
    expect((await errorOf(bad)).code).toBe("VALIDATION_ERROR");
  }
);

test(
  "send-otp issues a code and verify-otp exchanges it for a session token",
  { tag: ["@TC-AUTH-011", "@smoke"] },
  async () => {
    const email = await freshEmail("auth-su-ok");

    const send = await api.auth.sendSignupOtp(email);
    expect(send.status()).toBe(200);
    expect((await send.json()).data).toEqual({
      success: true,
      expiresIn: 300,
      cooldownSeconds: 60
    });
    expect(await hasCode("signup", email)).toBe(true);

    await plantCode("signup", email, KNOWN_OTP);
    const verify = await api.auth.verifySignupOtp(email, KNOWN_OTP);
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
  "The sign-up code must be exactly 6 digits",
  { tag: ["@TC-AUTH-012"] },
  async () => {
    const email = await freshEmail("auth-su-bva");
    expect((await api.auth.sendSignupOtp(email)).status()).toBe(200);

    const cases: [string, string][] = [
      ["12345", "string.length"], // 5 — min − 1
      ["1234567", "string.length"], // 7 — max + 1
      ["12a456", "string.pattern.base"], // 6, not all digits
      ["", "string.empty"]
    ];
    for (const [otp, reason] of cases) {
      const res = await api.auth.verifySignupOtp(email, otp);
      expect(res.status(), `otp "${otp}"`).toBe(400);
      const err = await errorOf(res);
      expect(err.code).toBe("VALIDATION_ERROR");
      expect(err.errors).toContainEqual(
        expect.objectContaining({ field: "otp", reason })
      );
    }

    // A 6-digit code passes validation; a wrong one is a business error.
    const sixDigits = await api.auth.verifySignupOtp(email, "000000");
    expect(sixDigits.status()).toBe(400);
    expect((await errorOf(sixDigits)).code).toBe("SIGNUP_OTP_INVALID");
  }
);

test(
  "A registered email cannot start sign-up",
  { tag: ["@TC-AUTH-013"] },
  async () => {
    const res = await api.auth.sendSignupOtp(USER_EMAIL);
    expect(res.status()).toBe(409);
    const err = await errorOf(res);
    expect(err.code).toBe("SIGNUP_EMAIL_EXISTS");
    expect(err.message).toBe(signupErrors.emailAlreadyExists);
  }
);

test(
  "Resend is refused during the cooldown and counted once it has passed",
  { tag: ["@TC-AUTH-014"] },
  async () => {
    const email = await freshEmail("auth-su-cd");
    expect((await api.auth.sendSignupOtp(email)).status()).toBe(200);

    for (const [url, send] of [
      ["/auth/signup/send-otp", api.auth.sendSignupOtp],
      ["/auth/signup/resend-otp", api.auth.resendSignupOtp]
    ] as const) {
      const early = await send(email);
      expect(early.status(), url).toBe(400);
      expect((await errorOf(early)).code).toBe("SIGNUP_OTP_COOLDOWN");
    }

    // Cooldown over (the 60 s key expires) → resend works and is counted.
    // The two refused attempts above still spent the per-email budget
    // (signupOtpByEmail: 3 sends per 15 min), so the 4th request would be a
    // 429 that has nothing to do with the cooldown under test — reset it.
    await deleteKeys(`otp-signup-cooldown:${email}`);
    await clearRateLimits();
    const resend = await api.auth.resendSignupOtp(email);
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
    const verify = await api.auth.verifySignupOtp(email, KNOWN_OTP);
    expect(verify.status()).toBe(200);
  }
);

test(
  "Five wrong codes lock sign-up verification, even for the right code",
  { tag: ["@TC-AUTH-015"] },
  async () => {
    const email = await freshEmail("auth-su-lock");
    expect((await api.auth.sendSignupOtp(email)).status()).toBe(200);
    await plantCode("signup", email, KNOWN_OTP);

    for (let attempt = 1; attempt <= 4; attempt += 1) {
      const res = await api.auth.verifySignupOtp(email, "111111");
      expect(res.status()).toBe(400);
      const err = await errorOf(res);
      expect(err.code).toBe("SIGNUP_OTP_INVALID");
      expect(err.message).toBe(
        fill(signupErrors.invalidOtpWithRemaining, { remaining: 5 - attempt })
      );
    }
    const fifth = await api.auth.verifySignupOtp(email, "111111");
    expect(fifth.status()).toBe(400);
    expect((await errorOf(fifth)).code).toBe("SIGNUP_OTP_LOCKED");

    const right = await api.auth.verifySignupOtp(email, KNOWN_OTP);
    expect(right.status()).toBe(400);
    const err = await errorOf(right);
    expect(err.code).toBe("SIGNUP_OTP_LOCKED");
    expect(err.message).toBe(signupErrors.otpAttemptsExceeded);
  }
);

test(
  "A sign-up code that was already used cannot verify again",
  { tag: ["@TC-AUTH-016"] },
  async () => {
    const email = await freshEmail("auth-su-reuse");
    await verifiedSignupSession(api, email);

    const again = await api.auth.verifySignupOtp(email, KNOWN_OTP);
    expect(again.status()).toBe(400);
    expect((await errorOf(again)).code).toBe("SIGNUP_OTP_INVALID");
  }
);

test(
  "Sign-up cannot be completed without a verified code",
  { tag: ["@TC-AUTH-017", "@smoke"] },
  async () => {
    // State: code sent but never verified.
    const email = await freshEmail("auth-su-skip");
    expect((await api.auth.sendSignupOtp(email)).status()).toBe(200);

    const res = await api.auth.completeSignup(
      completeBody(email, FAKE_SESSION)
    );
    expect(res.status()).toBe(400);
    const err = await errorOf(res);
    expect(err.code).toBe("SIGNUP_SESSION_INVALID");
    expect(err.message).toBe(signupErrors.invalidSession);
    expect(await findUserByEmail(email)).toBeNull();

    // Another address's session token does not carry over.
    const other = await freshEmail("auth-su-other");
    const otherToken = await verifiedSignupSession(api, other);
    const crossed = await api.auth.completeSignup(
      completeBody(email, otherToken)
    );
    expect((await errorOf(crossed)).code).toBe("SIGNUP_SESSION_INVALID");
    expect(await findUserByEmail(email)).toBeNull();
  }
);

test(
  "The sign-up session token works once",
  { tag: ["@TC-AUTH-018"] },
  async () => {
    const email = await freshEmail("auth-su-once");
    const sessionToken = await verifiedSignupSession(api, email);

    const first = await api.auth.completeSignup(
      completeBody(email, sessionToken)
    );
    expect(first.status()).toBe(201);
    const { data } = await first.json();
    expect(data.user).toMatchObject({ email, fullName: "Auth Tester" });
    expect(data.tokens.accessToken).toBeTruthy();
    expect(await findUserByEmail(email)).not.toBeNull();

    const replay = await api.auth.completeSignup(
      completeBody(email, sessionToken)
    );
    expect(replay.status()).toBe(400);
    expect((await errorOf(replay)).code).toBe("SIGNUP_SESSION_INVALID");

    // The new account can sign in with the password it chose.
    const login = await api.auth.login(email, "Signup@123");
    expect(login.status()).toBe(200);
  }
);

test(
  "Password strength policy at sign-up",
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
      const res = await api.auth.completeSignup(
        completeBody(email, FAKE_SESSION, {
          password,
          confirmPassword: password
        })
      );
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
  "Profile fields, confirmation and terms acceptance are validated",
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
      const res = await api.auth.completeSignup(
        completeBody(email, FAKE_SESSION, override)
      );
      expect(res.status(), JSON.stringify(override)).toBe(400);
      const err = await errorOf(res);
      expect(err.code).toBe("VALIDATION_ERROR");
      expect(err.errors, JSON.stringify(override)).toContainEqual(
        expect.objectContaining({ field, reason })
      );
    }

    // Boundaries on the valid side: 2-char name, 14 years old.
    const ok = await api.auth.completeSignup(
      completeBody(email, FAKE_SESSION, {
        fullName: "Al",
        dateOfBirth: yearsAgo(14)
      })
    );
    expect((await errorOf(ok)).code).toBe("SIGNUP_SESSION_INVALID");
  }
);

test(
  "Sign-up resends are capped at five",
  { tag: ["@TC-AUTH-068"] },
  async () => {
    // Many sequential sends, each several round trips to the cloud Redis.
    test.slow();
    const email = await freshEmail("auth-su-cap");
    expect((await api.auth.sendSignupOtp(email)).status()).toBe(200);

    // Each resend stands in for the 60 s wait (cooldown key dropped) and
    // resets the request budgets (3 per email, 5 per IP / 15 min), so the
    // only limit left in play is the resend cap under test. The counters are
    // dropped by exact key: a full `rate-limit:*` scan of the shared Redis
    // per resend outlasts the test timeout.
    const budgets = [
      `rate-limit:signup:email:${email}`,
      ...(await findKeys("rate-limit:signup:ip:*"))
    ];
    const resendAfterCooldown = async () => {
      await Promise.all(
        [`otp-signup-cooldown:${email}`, ...budgets].map((key) =>
          deleteKeys(key)
        )
      );
      return api.auth.resendSignupOtp(email);
    };
    for (let n = 1; n <= 5; n += 1) {
      const res = await resendAfterCooldown();
      expect(res.status(), `resend #${n}`).toBe(200);
      if (n === 5) {
        expect((await res.json()).data).toMatchObject({
          resendCount: 5,
          maxResends: 5,
          remainingResends: 0
        });
      }
    }

    const sixth = await resendAfterCooldown();
    expect(sixth.status()).toBe(400);
    const err = await errorOf(sixth);
    expect(err.code).toBe("SIGNUP_RESEND_LIMIT");
    expect(err.message).toBe(signupErrors.resendLimitExceeded);
  }
);

test(
  "A registered address in another case cannot start sign-up",
  { tag: ["@TC-AUTH-069"] },
  async () => {
    const upper = USER_EMAIL.toUpperCase();

    const check = await api.auth.checkEmail(upper);
    expect(check.status()).toBe(200);
    expect((await check.json()).data).toEqual({ available: false });

    const send = await api.auth.sendSignupOtp(`  ${upper}  `);
    expect(send.status()).toBe(409);
    expect((await errorOf(send)).code).toBe("SIGNUP_EMAIL_EXISTS");
  }
);
