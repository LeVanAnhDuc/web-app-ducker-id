import { test, expect } from "@/fixtures";
import type { ApiClient } from "@/api";
import { dataOf, errorOf, sessionOf } from "@/api/response";
import { loginOverApi, refreshStatus } from "@/api/session";
import { ADMIN } from "@/config/accounts";
import { serverMessage } from "@/data/copy";
import { KNOWN_MAGIC_TOKEN, KNOWN_OTP } from "@/data/test-data";
import { createAccount, throwawayEmail, userIdOf } from "@/utils/accounts";
import { skipRecoveryCooldown } from "@/utils/password";
import {
  clearEmailState,
  clearRateLimits,
  hasCode,
  plantCode
} from "@/utils/redis";

// Forgot-password contract — POST /auth/forgot-password/*
// (server/src/modules/forgot-password). Test cases: test-cases/password.md
// (TC-PASSWORD-070 … TC-PASSWORD-086). Runs as `guest` (the flow is public).
// Every account is a throwaway from createAccount(); OTPs and magic-link
// tokens are planted after the real send call (utils/redis.ts), never read
// from an inbox.

test.use({ role: "guest" });

const NEW_PASSWORD = "Recovered@123";
const GENERIC_OTP_ANSWER = { success: true, expiresIn: 300, cooldown: 60 };
const GENERIC_LINK_ANSWER = { success: true, expiresIn: 900, cooldown: 60 };

/** send → plant → verify; returns the reset token. */
async function resetTokenByOtp(api: ApiClient, email: string) {
  expect((await api.forgotPassword.sendOtp(email)).status()).toBe(200);
  await plantCode("forgotPasswordOtp", email, KNOWN_OTP);
  const res = await api.forgotPassword.verifyOtp(email, KNOWN_OTP);
  expect(res.status()).toBe(200);
  return (await dataOf<{ success: boolean; resetToken: string }>(res))
    .resetToken;
}

/** Deactivates an account the way an admin does (PATCH /admin/users/:id/lock). */
async function adminLock(newApi: () => Promise<ApiClient>, email: string) {
  const admin = await newApi();
  const session = await sessionOf(
    await admin.auth.login(ADMIN.email, ADMIN.password)
  );
  const lock = await admin.as(session).adminUsers.lock(await userIdOf(email));
  expect(lock.status()).toBe(200);
}

// ── Sending ────────────────────────────────────────────────────────────────

test(
  "Sending a code does not reveal whether the account exists",
  { tag: ["@TC-PASSWORD-070", "@smoke"] },
  async ({ newApi }) => {
    const api = await newApi();
    const account = await createAccount({ tag: "fp-enum" });
    const unknown = throwawayEmail("fp-nobody");

    const known = await api.forgotPassword.sendOtp(account.email);
    const missing = await api.forgotPassword.sendOtp(unknown);
    expect(known.status()).toBe(200);
    expect(missing.status()).toBe(200);

    const knownData = await dataOf(known);
    expect(knownData).toEqual(GENERIC_OTP_ANSWER);
    expect(await dataOf(missing)).toEqual(knownData);
    // Only the real account actually got a code.
    expect(await hasCode("forgotPasswordOtp", account.email)).toBe(true);
    expect(await hasCode("forgotPasswordOtp", unknown)).toBe(false);
  }
);

test(
  "A second send inside the cooldown is refused",
  { tag: ["@TC-PASSWORD-071"] },
  async ({ newApi }) => {
    const api = await newApi();
    const account = await createAccount({ tag: "fp-cooldown" });
    expect((await api.forgotPassword.sendOtp(account.email)).status()).toBe(
      200
    );
    const again = await api.forgotPassword.sendOtp(account.email);
    expect(again.status()).toBe(400);
    expect((await errorOf(again)).code).toBe("FORGOT_PASSWORD_OTP_COOLDOWN");
  }
);

test(
  "A locked account gets the generic answer and no code",
  { tag: ["@TC-PASSWORD-079"] },
  async ({ newApi }) => {
    const api = await newApi();
    const account = await createAccount({ tag: "fp-locked" });
    await adminLock(newApi, account.email);

    const res = await api.forgotPassword.sendOtp(account.email);
    expect(res.status()).toBe(200);
    expect(await dataOf(res)).toEqual(GENERIC_OTP_ANSWER);
    expect(await hasCode("forgotPasswordOtp", account.email)).toBe(false);
  }
);

test(
  "Sending a magic link does not reveal whether the account exists",
  { tag: ["@TC-PASSWORD-082", "@smoke"] },
  async ({ newApi }) => {
    const api = await newApi();
    const account = await createAccount({ tag: "fp-ml-enum" });
    const locked = await createAccount({ tag: "fp-ml-locked" });
    await adminLock(newApi, locked.email);
    const unknown = throwawayEmail("fp-ml-nobody");

    const answers = [];
    for (const email of [account.email, unknown, locked.email]) {
      const res = await api.forgotPassword.sendMagicLink(email);
      expect(res.status(), email).toBe(200);
      answers.push(await dataOf(res));
    }
    expect(answers[0]).toEqual(GENERIC_LINK_ANSWER);
    expect(answers[1]).toEqual(answers[0]);
    expect(answers[2]).toEqual(answers[0]);
    // Only the active account was issued a link.
    expect(await hasCode("forgotPasswordMagicLink", account.email)).toBe(true);
    expect(await hasCode("forgotPasswordMagicLink", unknown)).toBe(false);
    expect(await hasCode("forgotPasswordMagicLink", locked.email)).toBe(false);
  }
);

test.describe("A recovery code or link can be sent at most three times per window", () => {
  test(
    "the 4th code send is refused even after the cooldown",
    { tag: ["@TC-PASSWORD-083"] },
    async ({ newApi }) => {
      const api = await newApi();
      const account = await createAccount({ tag: "fp-resend" });
      for (let send = 1; send <= 3; send++) {
        expect(
          (await api.forgotPassword.sendOtp(account.email)).status(),
          `send ${send}`
        ).toBe(200);
        await skipRecoveryCooldown("otp", account.email, send);
      }
      const fourth = await api.forgotPassword.sendOtp(account.email);
      expect(fourth.status()).toBe(400);
      const error = await errorOf(fourth);
      expect(error.code).toBe("FORGOT_PASSWORD_OTP_RESEND_LIMIT");
      expect(error.message).toBe(
        serverMessage.forgotPassword.errors.otpResendLimitExceeded
      );
      await clearEmailState(account.email);
    }
  );

  test(
    "the 4th link send is refused even after the cooldown",
    { tag: ["@TC-PASSWORD-083"] },
    async ({ newApi }) => {
      const api = await newApi();
      const account = await createAccount({ tag: "fp-ml-resend" });
      for (let send = 1; send <= 3; send++) {
        expect(
          (await api.forgotPassword.sendMagicLink(account.email)).status(),
          `send ${send}`
        ).toBe(200);
        await skipRecoveryCooldown("magicLink", account.email, send);
      }
      const fourth = await api.forgotPassword.sendMagicLink(account.email);
      expect(fourth.status()).toBe(400);
      const error = await errorOf(fourth);
      expect(error.code).toBe("FORGOT_PASSWORD_MAGIC_LINK_RESEND_LIMIT");
      expect(error.message).toBe(
        serverMessage.forgotPassword.errors.magicLinkResendLimitExceeded
      );
      await clearEmailState(account.email);
    }
  );
});

test.describe("rate limit", () => {
  // Counters must survive from one request to the next inside this test.
  test.use({ keepRateLimits: true });

  test(
    "Recovery code sends are limited to 5 per address in 15 minutes",
    { tag: ["@TC-PASSWORD-084"] },
    async ({ newApi }) => {
      await clearRateLimits();
      const api = await newApi();
      const account = await createAccount({ tag: "fp-ratelimit" });
      try {
        expect((await api.forgotPassword.sendOtp(account.email)).status()).toBe(
          200
        );
        // 2–5: inside the 60 s cooldown, but still counted by the limiter.
        for (let i = 2; i <= 5; i++) {
          expect(
            (await api.forgotPassword.sendOtp(account.email)).status(),
            `request ${i}`
          ).toBe(400);
        }
        const sixth = await api.forgotPassword.sendOtp(account.email);
        expect(sixth.status()).toBe(429);
        const error = await errorOf(sixth);
        expect(error.code).toBe("TOO_MANY_REQUESTS");
        expect(error.message).toBe(
          serverMessage.forgotPassword.errors.rateLimitExceeded
        );
        // Another address has its own bucket.
        expect(
          (
            await api.forgotPassword.sendOtp(throwawayEmail("fp-other"))
          ).status()
        ).toBe(200);
      } finally {
        await clearRateLimits();
        await clearEmailState(account.email);
      }
    }
  );
});

// ── Input validation ───────────────────────────────────────────────────────

test.describe("Malformed email and code are rejected", () => {
  const badEmails: ReadonlyArray<{ label: string; email?: string }> = [
    { label: "missing", email: undefined },
    { label: "empty", email: "" },
    { label: "malformed", email: "not-an-email" }
  ];
  for (const { label, email } of badEmails) {
    test(
      `otp/send rejects a ${label} email (400 VALIDATION_ERROR)`,
      { tag: ["@TC-PASSWORD-072"] },
      async ({ newApi }) => {
        const res = await (await newApi()).forgotPassword.sendOtp(email);
        expect(res.status()).toBe(400);
        expect((await errorOf(res)).code).toBe("VALIDATION_ERROR");
      }
    );
  }

  // BVA on the 6-digit OTP: 5 and 7 digits fail the schema, 6 letters fail
  // the digits-only pattern. None of them reaches the attempt counter.
  for (const otp of ["12345", "1234567", "abcdef"]) {
    test(
      `otp/verify rejects otp "${otp}" before counting an attempt`,
      { tag: ["@TC-PASSWORD-072"] },
      async ({ newApi }) => {
        const res = await (
          await newApi()
        ).forgotPassword.verifyOtp(throwawayEmail("fp-otpshape"), otp);
        expect(res.status()).toBe(400);
        expect((await errorOf(res)).code).toBe("VALIDATION_ERROR");
      }
    );
  }

  test(
    "verify for an email that has no account is unauthorized",
    { tag: ["@TC-PASSWORD-072"] },
    async ({ newApi }) => {
      const res = await (
        await newApi()
      ).forgotPassword.verifyOtp(throwawayEmail("fp-ghost"), KNOWN_OTP);
      expect(res.status()).toBe(401);
      expect((await errorOf(res)).code).toBe("FORGOT_PASSWORD_AUTH_NOT_FOUND");
    }
  );
});

test(
  "The recovery email is trimmed and case-insensitive",
  { tag: ["@TC-PASSWORD-086"] },
  async ({ newApi }) => {
    const api = await newApi();
    const account = await createAccount({ tag: "fp-case" });
    const shouted = account.email.toUpperCase();

    expect((await api.forgotPassword.sendOtp(`  ${shouted}  `)).status()).toBe(
      200
    );
    // The code was issued to the account itself, not to a new spelling.
    expect(await hasCode("forgotPasswordOtp", account.email)).toBe(true);
    await plantCode("forgotPasswordOtp", account.email, KNOWN_OTP);

    const verify = await api.forgotPassword.verifyOtp(shouted, KNOWN_OTP);
    expect(verify.status()).toBe(200);
    const { resetToken } = await dataOf<{ resetToken: string }>(verify);

    const reset = await api.forgotPassword.reset(
      ` ${shouted}`,
      resetToken,
      NEW_PASSWORD
    );
    expect(reset.status()).toBe(200);
    expect((await loginOverApi(account.email, NEW_PASSWORD)).status).toBe(200);
  }
);

// ── Verifying a code ───────────────────────────────────────────────────────

test(
  "Wrong codes count down and the fifth locks verification",
  { tag: ["@TC-PASSWORD-073", "@smoke"] },
  async ({ newApi }) => {
    const api = await newApi();
    const account = await createAccount({ tag: "fp-lockout" });
    await clearEmailState(account.email);
    expect((await api.forgotPassword.sendOtp(account.email)).status()).toBe(
      200
    );
    await plantCode("forgotPasswordOtp", account.email, KNOWN_OTP);

    // Attempts 1..4 → 401 with the remaining count (4, 3, 2, 1).
    for (let attempt = 1; attempt <= 4; attempt++) {
      const res = await api.forgotPassword.verifyOtp(account.email, "000000");
      expect(res.status(), `attempt ${attempt}`).toBe(401);
      const body = await errorOf(res);
      expect(body.code).toBe("FORGOT_PASSWORD_OTP_INVALID");
      expect(body.message).toContain(String(5 - attempt));
    }
    // Attempt 5 → locked (boundary).
    const fifth = await api.forgotPassword.verifyOtp(account.email, "000000");
    expect(fifth.status()).toBe(400);
    expect((await errorOf(fifth)).code).toBe("FORGOT_PASSWORD_OTP_LOCKED");
    // Locked → even the right code is refused.
    const right = await api.forgotPassword.verifyOtp(account.email, KNOWN_OTP);
    expect(right.status()).toBe(400);
    expect((await errorOf(right)).code).toBe("FORGOT_PASSWORD_OTP_LOCKED");
    await clearEmailState(account.email);
  }
);

test(
  "A verified code cannot be reused",
  { tag: ["@TC-PASSWORD-075"] },
  async ({ newApi }) => {
    const api = await newApi();
    const account = await createAccount({ tag: "fp-otpreuse" });
    await resetTokenByOtp(api, account.email);
    const again = await api.forgotPassword.verifyOtp(account.email, KNOWN_OTP);
    expect(again.status()).toBe(401);
    expect((await errorOf(again)).code).toBe("FORGOT_PASSWORD_OTP_INVALID");
  }
);

// ── Resetting ──────────────────────────────────────────────────────────────

test(
  "Code → reset token → new password",
  { tag: ["@TC-PASSWORD-074", "@smoke"] },
  async ({ newApi }) => {
    const api = await newApi();
    const account = await createAccount({ tag: "fp-reset" });
    const resetToken = await resetTokenByOtp(api, account.email);
    expect(resetToken).toMatch(/^[a-f0-9]{128}$/);

    const reset = await api.forgotPassword.reset(
      account.email,
      resetToken,
      NEW_PASSWORD
    );
    expect(reset.status()).toBe(200);
    expect(await dataOf(reset)).toEqual({ success: true });

    expect((await loginOverApi(account.email, account.password)).status).toBe(
      401
    );
    expect((await loginOverApi(account.email, NEW_PASSWORD)).status).toBe(200);
  }
);

test(
  "A consumed reset token cannot reset again",
  { tag: ["@TC-PASSWORD-077", "@smoke"] },
  async ({ newApi }) => {
    const api = await newApi();
    const account = await createAccount({ tag: "fp-tokenreuse" });
    const resetToken = await resetTokenByOtp(api, account.email);
    const first = await api.forgotPassword.reset(
      account.email,
      resetToken,
      NEW_PASSWORD
    );
    expect(first.status()).toBe(200);

    const second = await api.forgotPassword.reset(
      account.email,
      resetToken,
      "Another@1234"
    );
    expect(second.status()).toBe(401);
    expect((await errorOf(second)).code).toBe(
      "FORGOT_PASSWORD_INVALID_RESET_TOKEN"
    );
    // The first reset stands.
    expect((await loginOverApi(account.email, NEW_PASSWORD)).status).toBe(200);
  }
);

test.describe("Reset rejects malformed input and a token of another account", () => {
  const badResets: ReadonlyArray<{
    label: string;
    resetToken: string;
    newPassword: string;
  }> = [
    {
      label: "a weak new password",
      resetToken: "a".repeat(128),
      newPassword: "weakpass"
    },
    {
      label: "a reset token of 127 chars",
      resetToken: "a".repeat(127),
      newPassword: NEW_PASSWORD
    },
    {
      label: "a non-hex reset token",
      resetToken: "z".repeat(128),
      newPassword: NEW_PASSWORD
    }
  ];
  for (const { label, resetToken, newPassword } of badResets) {
    test(
      `reset rejects ${label} (400 VALIDATION_ERROR)`,
      { tag: ["@TC-PASSWORD-076"] },
      async ({ newApi }) => {
        const res = await (
          await newApi()
        ).forgotPassword.reset(
          throwawayEmail("fp-resetshape"),
          resetToken,
          newPassword
        );
        expect(res.status()).toBe(400);
        expect((await errorOf(res)).code).toBe("VALIDATION_ERROR");
      }
    );
  }

  test(
    "a reset token issued for one email does not reset another account",
    { tag: ["@TC-PASSWORD-076"] },
    async ({ newApi }) => {
      const api = await newApi();
      const owner = await createAccount({ tag: "fp-owner" });
      const victim = await createAccount({ tag: "fp-victim" });
      const resetToken = await resetTokenByOtp(api, owner.email);

      const res = await api.forgotPassword.reset(
        victim.email,
        resetToken,
        NEW_PASSWORD
      );
      expect(res.status()).toBe(401);
      expect((await loginOverApi(victim.email, victim.password)).status).toBe(
        200
      );
    }
  );
});

test.describe("Reset new-password length boundaries on the server", () => {
  // [BVA] 7 / 8 / 128 / 129 with a real reset token each.
  const lengths: ReadonlyArray<{ len: number; ok: boolean }> = [
    { len: 7, ok: false },
    { len: 8, ok: true },
    { len: 128, ok: true },
    { len: 129, ok: false }
  ];
  for (const { len, ok } of lengths) {
    test(
      `a new password of ${len} characters is ${ok ? "accepted" : "rejected"}`,
      { tag: ["@TC-PASSWORD-085"] },
      async ({ newApi }) => {
        const api = await newApi();
        const account = await createAccount({ tag: `fp-len${len}` });
        const candidate = "Ab@3" + "x".repeat(len - 4);
        expect(candidate).toHaveLength(len);
        const resetToken = await resetTokenByOtp(api, account.email);

        const res = await api.forgotPassword.reset(
          account.email,
          resetToken,
          candidate
        );
        if (ok) {
          expect(res.status()).toBe(200);
          expect((await loginOverApi(account.email, candidate)).status).toBe(
            200
          );
        } else {
          expect(res.status()).toBe(400);
          expect((await errorOf(res)).code).toBe("VALIDATION_ERROR");
          expect(
            (await loginOverApi(account.email, account.password)).status
          ).toBe(200);
        }
      }
    );
  }
});

test(
  "A reset signs out the account's other sessions",
  { tag: ["@TC-PASSWORD-078", "@smoke"] },
  async ({ newApi }) => {
    const api = await newApi();
    const account = await createAccount({ tag: "fp-sessions" });
    const before = await loginOverApi(account.email, account.password);
    expect(before.refreshToken).toBeTruthy();
    expect(await refreshStatus(before.refreshToken!)).toBe(200);

    const resetToken = await resetTokenByOtp(api, account.email);
    const reset = await api.forgotPassword.reset(
      account.email,
      resetToken,
      NEW_PASSWORD
    );
    expect(reset.status()).toBe(200);

    expect(await refreshStatus(before.refreshToken!)).toBe(403);
  }
);

// ── Magic link ─────────────────────────────────────────────────────────────

test(
  "Magic link → reset token → new password; the link works once",
  { tag: ["@TC-PASSWORD-080", "@smoke"] },
  async ({ newApi }) => {
    const api = await newApi();
    const account = await createAccount({ tag: "fp-magic" });
    const send = await api.forgotPassword.sendMagicLink(account.email);
    expect(send.status()).toBe(200);
    expect(await dataOf(send)).toEqual(GENERIC_LINK_ANSWER);
    await plantCode(
      "forgotPasswordMagicLink",
      account.email,
      KNOWN_MAGIC_TOKEN
    );

    const verify = await api.forgotPassword.verifyMagicLink(
      account.email,
      KNOWN_MAGIC_TOKEN
    );
    expect(verify.status()).toBe(200);
    const { resetToken } = await dataOf<{ resetToken: string }>(verify);
    expect(resetToken).toMatch(/^[a-f0-9]{128}$/);

    const reuse = await api.forgotPassword.verifyMagicLink(
      account.email,
      KNOWN_MAGIC_TOKEN
    );
    expect(reuse.status()).toBe(401);
    expect((await errorOf(reuse)).code).toBe(
      "FORGOT_PASSWORD_MAGIC_LINK_INVALID"
    );

    const reset = await api.forgotPassword.reset(
      account.email,
      resetToken,
      NEW_PASSWORD
    );
    expect(reset.status()).toBe(200);
    expect((await loginOverApi(account.email, NEW_PASSWORD)).status).toBe(200);
  }
);

test(
  "Wrong or malformed link tokens and the link cooldown",
  { tag: ["@TC-PASSWORD-081"] },
  async ({ newApi }) => {
    const api = await newApi();
    const account = await createAccount({ tag: "fp-magicbad" });
    await api.forgotPassword.sendMagicLink(account.email);
    const wrong = await api.forgotPassword.verifyMagicLink(
      account.email,
      "cd".repeat(64)
    );
    expect(wrong.status()).toBe(401);
    expect((await errorOf(wrong)).code).toBe(
      "FORGOT_PASSWORD_MAGIC_LINK_INVALID"
    );

    const shortToken = await api.forgotPassword.verifyMagicLink(
      account.email,
      "cd".repeat(63)
    );
    expect(shortToken.status()).toBe(400);

    const cooldown = await api.forgotPassword.sendMagicLink(account.email);
    expect(cooldown.status()).toBe(400);
    expect((await errorOf(cooldown)).code).toBe(
      "FORGOT_PASSWORD_MAGIC_LINK_COOLDOWN"
    );
  }
);
