import type { APIResponse } from "@playwright/test";
import type { BaseClient } from "./base.client";

// /auth/forgot-password/* — server/src/modules/forgot-password. Anonymous
// endpoints. Every argument is optional so a test can leave a field out
// (JSON drops `undefined`) and prove the Joi schema
// (server/src/validators/schemas/forgot-password.ts).
export function createForgotPasswordClient(base: BaseClient) {
  return {
    // ── one-time code ─────────────────────────────────────────────────────
    sendOtp(email?: string): Promise<APIResponse> {
      return base.call("post", "/auth/forgot-password/otp/send", {
        data: { email }
      });
    },
    verifyOtp(email?: string, otp?: string): Promise<APIResponse> {
      return base.call("post", "/auth/forgot-password/otp/verify", {
        data: { email, otp }
      });
    },

    // ── magic link ────────────────────────────────────────────────────────
    sendMagicLink(email?: string): Promise<APIResponse> {
      return base.call("post", "/auth/forgot-password/magic-link/send", {
        data: { email }
      });
    },
    verifyMagicLink(email?: string, token?: string): Promise<APIResponse> {
      return base.call("post", "/auth/forgot-password/magic-link/verify", {
        data: { email, token }
      });
    },

    // ── new password ──────────────────────────────────────────────────────
    /** POST /auth/forgot-password/reset with the token a verify returned. */
    reset(
      email?: string,
      resetToken?: string,
      newPassword?: string
    ): Promise<APIResponse> {
      return base.call("post", "/auth/forgot-password/reset", {
        data: { email, resetToken, newPassword }
      });
    }
  };
}

export type ForgotPasswordClient = ReturnType<
  typeof createForgotPasswordClient
>;
