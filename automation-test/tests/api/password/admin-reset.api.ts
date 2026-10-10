import { test, expect } from "@fixtures";
import { createAccount } from "@helpers/accounts";
import {
  adminResetAndReadTempPassword,
  bearerContext,
  decodeJwt,
  loginOverApi,
  refreshStatus
} from "@helpers/password";

// Admin reset → forced change, at the HTTP layer. Test cases:
// test-cases/password.md (TC-PWD-043 … TC-PWD-045). Declares `admin` for
// the reset call; the target is always a throwaway account. The temp
// password is read from the queued ADMIN_RESET_PASSWORD email
// (helpers/password.ts → readQueuedEmail), the same text the user receives.

test.use({ role: "admin" });

const NEW_PASSWORD = "AfterReset@123";

test(
  "a refresh token issued before an admin reset is rejected afterwards",
  { tag: ["@TC-PWD-043", "@smoke"] },
  async ({ adminApi }) => {
    const account = await createAccount({ tag: "ar-revoke" });
    const before = await loginOverApi(account.email, account.password);
    expect(await refreshStatus(before.refreshToken!)).toBe(200);

    await adminResetAndReadTempPassword(adminApi, account.email);

    expect(await refreshStatus(before.refreshToken!)).toBe(403);
    expect((await loginOverApi(account.email, account.password)).status).toBe(
      401
    );
  }
);

test(
  "temp-password sessions carry mustChangePassword until the password is changed",
  { tag: ["@TC-PWD-044"] },
  async ({ adminApi }) => {
    const account = await createAccount({ tag: "ar-flag" });
    const temp = await adminResetAndReadTempPassword(adminApi, account.email);

    const tempLogin = await loginOverApi(account.email, temp);
    expect(tempLogin.status).toBe(200);
    expect(decodeJwt(tempLogin.idToken!).mustChangePassword).toBe(true);

    const api = await bearerContext(tempLogin.accessToken!);
    try {
      const change = await api.patch("/api/v1/auth/change-password", {
        data: {
          currentPassword: temp,
          newPassword: NEW_PASSWORD,
          confirmPassword: NEW_PASSWORD
        }
      });
      expect(change.status()).toBe(200);
      const { data } = (await change.json()) as { data: { idToken: string } };
      expect(decodeJwt(data.idToken).mustChangePassword).toBe(false);
    } finally {
      await api.dispose();
    }

    // The flag is cleared in the account, not only in that one response.
    const after = await loginOverApi(account.email, NEW_PASSWORD);
    expect(after.status).toBe(200);
    expect(decodeJwt(after.idToken!).mustChangePassword).toBe(false);
    expect((await loginOverApi(account.email, temp)).status).toBe(401);
  }
);

test(
  "a session that must change its password cannot use the rest of the API",
  { tag: ["@TC-PWD-045"] },
  async ({ adminApi }) => {
    // BUG: BUG-003 — mustChangePassword is enforced only by the client gate
    // (MustChangePasswordGate); the API serves a temp-password session
    // normally, so the forced change can be skipped by calling it directly.
    test.fail();
    const account = await createAccount({ tag: "ar-bypass" });
    const temp = await adminResetAndReadTempPassword(adminApi, account.email);
    const tempLogin = await loginOverApi(account.email, temp);
    const api = await bearerContext(tempLogin.accessToken!);
    try {
      const res = await api.get("/api/v1/users/me/favorites");
      expect(res.status()).toBe(403);
    } finally {
      await api.dispose();
    }
  }
);
