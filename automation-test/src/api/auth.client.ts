import type { APIResponse } from "@playwright/test";
import type { BaseClient } from "./base.client";

// /auth/* — server/src/modules/{login,signup,logout,token,unlock-account}.
// Anonymous endpoints: no Bearer header; the request context's cookie jar
// carries refreshToken / sid where the server sets them. The one endpoint
// behind a Bearer token (logout) is reached as api.as(session).auth.logout();
// api.auth.logout() sends none, for the "not signed in" case.
export function createAuthClient(base: BaseClient) {
  return {
    // ── password ──────────────────────────────────────────────────────────
    /** POST /auth/login. Leave `password` out to send `{ email }` alone. */
    login(email: string, password?: string): Promise<APIResponse> {
      return base.call("post", "/auth/login", { data: { email, password } });
    },

    // ── one-time code ─────────────────────────────────────────────────────
    sendLoginOtp(email: string): Promise<APIResponse> {
      return base.call("post", "/auth/login/otp/send", { data: { email } });
    },
    verifyLoginOtp(email: string, otp: string): Promise<APIResponse> {
      return base.call("post", "/auth/login/otp/verify", {
        data: { email, otp }
      });
    },

    // ── magic link ────────────────────────────────────────────────────────
    sendMagicLink(email: string): Promise<APIResponse> {
      return base.call("post", "/auth/login/magic-link/send", {
        data: { email }
      });
    },
    verifyMagicLink(email: string, token: string): Promise<APIResponse> {
      return base.call("post", "/auth/login/magic-link/verify", {
        data: { email, token }
      });
    },

    // ── sign-up ───────────────────────────────────────────────────────────
    /** GET /auth/signup/check-email/:email — the address is URL-encoded here. */
    checkEmail(email: string): Promise<APIResponse> {
      return base.call(
        "get",
        `/auth/signup/check-email/${encodeURIComponent(email)}`
      );
    },
    sendSignupOtp(email: string): Promise<APIResponse> {
      return base.call("post", "/auth/signup/send-otp", { data: { email } });
    },
    resendSignupOtp(email: string): Promise<APIResponse> {
      return base.call("post", "/auth/signup/resend-otp", { data: { email } });
    },
    verifySignupOtp(email: string, otp: string): Promise<APIResponse> {
      return base.call("post", "/auth/signup/verify-otp", {
        data: { email, otp }
      });
    },
    completeSignup(body: Record<string, unknown>): Promise<APIResponse> {
      return base.call("post", "/auth/signup/complete", { data: body });
    },

    // ── session ───────────────────────────────────────────────────────────
    /**
     * POST /auth/token/refresh. With no argument the cookie jar supplies the
     * refreshToken cookie; pass a value to send that cookie explicitly.
     */
    refreshToken(refreshToken?: string): Promise<APIResponse> {
      return base.call("post", "/auth/token/refresh", {
        headers:
          refreshToken === undefined
            ? undefined
            : { Cookie: `refreshToken=${refreshToken}` }
      });
    },
    logout(): Promise<APIResponse> {
      return base.call("post", "/auth/logout");
    },

    // ── self-service unlock ───────────────────────────────────────────────
    requestUnlock(email: string): Promise<APIResponse> {
      return base.call("post", "/auth/unlock/request", { data: { email } });
    },
    verifyUnlock(email: string, tempPassword: string): Promise<APIResponse> {
      return base.call("post", "/auth/unlock/verify", {
        data: { email, tempPassword }
      });
    }
  };
}

export type AuthClient = ReturnType<typeof createAuthClient>;
