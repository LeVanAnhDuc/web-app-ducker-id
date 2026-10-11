import { test, expect } from "@fixtures";
import type { APIRequestContext } from "@playwright/test";
import { createAccount, KNOWN_OTP, throwawayEmail } from "@helpers/accounts";
import { clearEmailState, hasCode, plantCode } from "@helpers/redis";
import {
  KNOWN_MAGIC_TOKEN,
  loginOverApi,
  refreshStatus,
  userIdOf
} from "@helpers/password";

// Forgot-password contract — POST /api/v1/auth/forgot-password/*.
// Test cases: test-cases/password.md (TC-PWD-070 … TC-PWD-081).
// Runs as `guest` (the flow is public). Every account is a throwaway from
// createAccount(); OTPs and magic-link tokens are planted after the real
// send call (helpers/redis.ts), never read from an inbox.

test.use({ role: "guest" });

const FP = "/api/v1/auth/forgot-password";
const NEW_PASSWORD = "Recovered@123";

interface ErrorBody {
  code?: string;
  message?: string;
}

async function sendOtp(api: APIRequestContext, email: string) {
  const res = await api.post(`${FP}/otp/send`, { data: { email } });
  expect(res.status(), `otp/send ${email}`).toBe(200);
  return res;
}

async function verifyOtp(api: APIRequestContext, email: string, otp: string) {
  return api.post(`${FP}/otp/verify`, { data: { email, otp } });
}

/** send → plant → verify; returns the reset token. */
async function resetTokenByOtp(api: APIRequestContext, email: string) {
  await sendOtp(api, email);
  await plantCode("forgotPasswordOtp", email, KNOWN_OTP);
  const res = await verifyOtp(api, email, KNOWN_OTP);
  expect(res.status()).toBe(200);
  const body = (await res.json()) as {
    data: { success: boolean; resetToken: string };
  };
  return body.data.resetToken;
}

test.describe("Forgot password API — send OTP", () => {
  test(
    "known and unknown emails get the same 200 answer (no account enumeration)",
    { tag: ["@TC-PWD-070"] },
    async ({ guestApi }) => {
      const account = await createAccount({ tag: "fp-enum" });
      const unknown = throwawayEmail("fp-nobody");

      const known = await sendOtp(guestApi, account.email);
      const missing = await sendOtp(guestApi, unknown);

      const knownBody = (await known.json()) as { data: unknown };
      const missingBody = (await missing.json()) as { data: unknown };
      expect(knownBody.data).toEqual({
        success: true,
        expiresIn: 300,
        cooldown: 60
      });
      expect(missingBody.data).toEqual(knownBody.data);
      // Only the real account actually got a code.
      expect(await hasCode("forgotPasswordOtp", account.email)).toBe(true);
      expect(await hasCode("forgotPasswordOtp", unknown)).toBe(false);
    }
  );

  test(
    "a second send inside the 60 s cooldown is refused",
    { tag: ["@TC-PWD-071"] },
    async ({ guestApi }) => {
      const account = await createAccount({ tag: "fp-cooldown" });
      await sendOtp(guestApi, account.email);
      const again = await guestApi.post(`${FP}/otp/send`, {
        data: { email: account.email }
      });
      expect(again.status()).toBe(400);
      expect(((await again.json()) as ErrorBody).code).toBe(
        "FORGOT_PASSWORD_OTP_COOLDOWN"
      );
    }
  );

  test(
    "a locked (inactive) account gets the generic answer but no code",
    { tag: ["@TC-PWD-079"] },
    async ({ guestApi, adminApi }) => {
      const account = await createAccount({ tag: "fp-locked" });
      const id = await userIdOf(account.email);
      const lock = await adminApi.patch(`/api/v1/admin/users/${id}/lock`);
      expect(lock.status()).toBe(200);

      const res = await sendOtp(guestApi, account.email);
      expect(((await res.json()) as { data: unknown }).data).toEqual({
        success: true,
        expiresIn: 300,
        cooldown: 60
      });
      expect(await hasCode("forgotPasswordOtp", account.email)).toBe(false);
    }
  );
});

test.describe("Forgot password API — input validation", () => {
  const badEmails = [
    { label: "missing", data: {} },
    { label: "empty", data: { email: "" } },
    { label: "malformed", data: { email: "not-an-email" } }
  ];
  for (const { label, data } of badEmails) {
    test(
      `otp/send rejects a ${label} email (400 VALIDATION_ERROR)`,
      { tag: ["@TC-PWD-072"] },
      async ({ guestApi }) => {
        const res = await guestApi.post(`${FP}/otp/send`, { data });
        expect(res.status()).toBe(400);
        expect(((await res.json()) as ErrorBody).code).toBe("VALIDATION_ERROR");
      }
    );
  }

  // BVA on the 6-digit OTP: 5 and 7 digits fail the schema, 6 letters fail
  // the digits-only pattern. None of them reaches the attempt counter.
  const badOtps = ["12345", "1234567", "abcdef"];
  for (const otp of badOtps) {
    test(
      `otp/verify rejects otp "${otp}" before counting an attempt`,
      { tag: ["@TC-PWD-072"] },
      async ({ guestApi }) => {
        const email = throwawayEmail("fp-otpshape");
        const res = await verifyOtp(guestApi, email, otp);
        expect(res.status()).toBe(400);
        expect(((await res.json()) as ErrorBody).code).toBe("VALIDATION_ERROR");
      }
    );
  }

  const badResets = [
    {
      label: "a weak new password",
      body: (email: string) => ({
        email,
        resetToken: "a".repeat(128),
        newPassword: "weakpass"
      })
    },
    {
      label: "a reset token of 127 chars",
      body: (email: string) => ({
        email,
        resetToken: "a".repeat(127),
        newPassword: NEW_PASSWORD
      })
    },
    {
      label: "a non-hex reset token",
      body: (email: string) => ({
        email,
        resetToken: "z".repeat(128),
        newPassword: NEW_PASSWORD
      })
    }
  ];
  for (const { label, body } of badResets) {
    test(
      `reset rejects ${label} (400 VALIDATION_ERROR)`,
      { tag: ["@TC-PWD-076"] },
      async ({ guestApi }) => {
        const res = await guestApi.post(`${FP}/reset`, {
          data: body(throwawayEmail("fp-resetshape"))
        });
        expect(res.status()).toBe(400);
        expect(((await res.json()) as ErrorBody).code).toBe("VALIDATION_ERROR");
      }
    );
  }
});

test.describe("Forgot password API — OTP verification", () => {
  test(
    "wrong codes count down, the 5th locks, and a correct code is then refused",
    { tag: ["@TC-PWD-073"] },
    async ({ guestApi }) => {
      const account = await createAccount({ tag: "fp-lockout" });
      await clearEmailState(account.email);
      await sendOtp(guestApi, account.email);
      await plantCode("forgotPasswordOtp", account.email, KNOWN_OTP);

      // Attempts 1..4 → 401 with the remaining count (4, 3, 2, 1).
      for (let attempt = 1; attempt <= 4; attempt++) {
        const res = await verifyOtp(guestApi, account.email, "000000");
        expect(res.status(), `attempt ${attempt}`).toBe(401);
        const body = (await res.json()) as ErrorBody;
        expect(body.code).toBe("FORGOT_PASSWORD_OTP_INVALID");
        expect(body.message).toContain(String(5 - attempt));
      }
      // Attempt 5 → locked (boundary).
      const fifth = await verifyOtp(guestApi, account.email, "000000");
      expect(fifth.status()).toBe(400);
      expect(((await fifth.json()) as ErrorBody).code).toBe(
        "FORGOT_PASSWORD_OTP_LOCKED"
      );
      // Locked → even the right code is refused.
      const right = await verifyOtp(guestApi, account.email, KNOWN_OTP);
      expect(right.status()).toBe(400);
      expect(((await right.json()) as ErrorBody).code).toBe(
        "FORGOT_PASSWORD_OTP_LOCKED"
      );
      await clearEmailState(account.email);
    }
  );

  test(
    "a verified code cannot be used a second time",
    { tag: ["@TC-PWD-075"] },
    async ({ guestApi }) => {
      const account = await createAccount({ tag: "fp-otpreuse" });
      await resetTokenByOtp(guestApi, account.email);
      const again = await verifyOtp(guestApi, account.email, KNOWN_OTP);
      expect(again.status()).toBe(401);
      expect(((await again.json()) as ErrorBody).code).toBe(
        "FORGOT_PASSWORD_OTP_INVALID"
      );
    }
  );

  test(
    "verify for an email that has no account is unauthorized",
    { tag: ["@TC-PWD-072"] },
    async ({ guestApi }) => {
      const res = await verifyOtp(
        guestApi,
        throwawayEmail("fp-ghost"),
        KNOWN_OTP
      );
      expect(res.status()).toBe(401);
      expect(((await res.json()) as ErrorBody).code).toBe(
        "FORGOT_PASSWORD_AUTH_NOT_FOUND"
      );
    }
  );
});

test.describe("Forgot password API — reset", () => {
  test(
    "OTP → reset token → new password: old password stops working, new one works",
    { tag: ["@TC-PWD-074", "@smoke"] },
    async ({ guestApi }) => {
      const account = await createAccount({ tag: "fp-reset" });
      const resetToken = await resetTokenByOtp(guestApi, account.email);
      expect(resetToken).toMatch(/^[a-f0-9]{128}$/);

      const reset = await guestApi.post(`${FP}/reset`, {
        data: { email: account.email, resetToken, newPassword: NEW_PASSWORD }
      });
      expect(reset.status()).toBe(200);
      expect(((await reset.json()) as { data: unknown }).data).toEqual({
        success: true
      });

      expect((await loginOverApi(account.email, account.password)).status).toBe(
        401
      );
      expect((await loginOverApi(account.email, NEW_PASSWORD)).status).toBe(
        200
      );
    }
  );

  test(
    "a consumed reset token cannot reset the password again (invalid transition)",
    { tag: ["@TC-PWD-077"] },
    async ({ guestApi }) => {
      const account = await createAccount({ tag: "fp-tokenreuse" });
      const resetToken = await resetTokenByOtp(guestApi, account.email);
      const first = await guestApi.post(`${FP}/reset`, {
        data: { email: account.email, resetToken, newPassword: NEW_PASSWORD }
      });
      expect(first.status()).toBe(200);

      const second = await guestApi.post(`${FP}/reset`, {
        data: {
          email: account.email,
          resetToken,
          newPassword: "Another@1234"
        }
      });
      expect(second.status()).toBe(401);
      expect(((await second.json()) as ErrorBody).code).toBe(
        "FORGOT_PASSWORD_INVALID_RESET_TOKEN"
      );
      // The first reset stands.
      expect((await loginOverApi(account.email, NEW_PASSWORD)).status).toBe(
        200
      );
    }
  );

  test(
    "a reset token issued for one email does not reset another account",
    { tag: ["@TC-PWD-076"] },
    async ({ guestApi }) => {
      const owner = await createAccount({ tag: "fp-owner" });
      const victim = await createAccount({ tag: "fp-victim" });
      const resetToken = await resetTokenByOtp(guestApi, owner.email);

      const res = await guestApi.post(`${FP}/reset`, {
        data: { email: victim.email, resetToken, newPassword: NEW_PASSWORD }
      });
      expect(res.status()).toBe(401);
      expect((await loginOverApi(victim.email, victim.password)).status).toBe(
        200
      );
    }
  );

  test(
    "a reset signs out the account's other sessions",
    { tag: ["@TC-PWD-078"] },
    async ({ guestApi }) => {
      const account = await createAccount({ tag: "fp-sessions" });
      const before = await loginOverApi(account.email, account.password);
      expect(before.refreshToken).toBeTruthy();
      expect(await refreshStatus(before.refreshToken!)).toBe(200);

      const resetToken = await resetTokenByOtp(guestApi, account.email);
      const reset = await guestApi.post(`${FP}/reset`, {
        data: { email: account.email, resetToken, newPassword: NEW_PASSWORD }
      });
      expect(reset.status()).toBe(200);

      expect(await refreshStatus(before.refreshToken!)).toBe(403);
    }
  );
});

test.describe("Forgot password API — magic link", () => {
  test(
    "send → planted link token → reset token; the link works only once",
    { tag: ["@TC-PWD-080"] },
    async ({ guestApi }) => {
      const account = await createAccount({ tag: "fp-magic" });
      const send = await guestApi.post(`${FP}/magic-link/send`, {
        data: { email: account.email }
      });
      expect(send.status()).toBe(200);
      expect(((await send.json()) as { data: unknown }).data).toEqual({
        success: true,
        expiresIn: 900,
        cooldown: 60
      });
      await plantCode(
        "forgotPasswordMagicLink",
        account.email,
        KNOWN_MAGIC_TOKEN
      );

      const verify = await guestApi.post(`${FP}/magic-link/verify`, {
        data: { email: account.email, token: KNOWN_MAGIC_TOKEN }
      });
      expect(verify.status()).toBe(200);
      const { data } = (await verify.json()) as {
        data: { resetToken: string };
      };
      expect(data.resetToken).toMatch(/^[a-f0-9]{128}$/);

      const reuse = await guestApi.post(`${FP}/magic-link/verify`, {
        data: { email: account.email, token: KNOWN_MAGIC_TOKEN }
      });
      expect(reuse.status()).toBe(401);
      expect(((await reuse.json()) as ErrorBody).code).toBe(
        "FORGOT_PASSWORD_MAGIC_LINK_INVALID"
      );

      const reset = await guestApi.post(`${FP}/reset`, {
        data: {
          email: account.email,
          resetToken: data.resetToken,
          newPassword: NEW_PASSWORD
        }
      });
      expect(reset.status()).toBe(200);
      expect((await loginOverApi(account.email, NEW_PASSWORD)).status).toBe(
        200
      );
    }
  );

  test(
    "a wrong or malformed link token is refused",
    { tag: ["@TC-PWD-081"] },
    async ({ guestApi }) => {
      const account = await createAccount({ tag: "fp-magicbad" });
      await guestApi.post(`${FP}/magic-link/send`, {
        data: { email: account.email }
      });
      const wrong = await guestApi.post(`${FP}/magic-link/verify`, {
        data: { email: account.email, token: "cd".repeat(64) }
      });
      expect(wrong.status()).toBe(401);
      expect(((await wrong.json()) as ErrorBody).code).toBe(
        "FORGOT_PASSWORD_MAGIC_LINK_INVALID"
      );

      const shortToken = await guestApi.post(`${FP}/magic-link/verify`, {
        data: { email: account.email, token: "cd".repeat(63) }
      });
      expect(shortToken.status()).toBe(400);

      const cooldown = await guestApi.post(`${FP}/magic-link/send`, {
        data: { email: account.email }
      });
      expect(cooldown.status()).toBe(400);
      expect(((await cooldown.json()) as ErrorBody).code).toBe(
        "FORGOT_PASSWORD_MAGIC_LINK_COOLDOWN"
      );
    }
  );
});
