import { test, expect } from "@/fixtures";
import { dataOf } from "@/api/response";
import { loginOverApi, refreshStatus } from "@/api/session";
import { createAccount } from "@/utils/accounts";
import { jwtPayload } from "@/utils/jwt";
import { adminResetAndReadTempPassword } from "@/utils/password";

// Admin reset → forced change, at the HTTP layer. Test cases:
// test-cases/password.md (TC-PASSWORD-043 … TC-PASSWORD-045). Declares `admin`
// for the reset call; the target is always a throwaway account. The temp
// password is read from the queued ADMIN_RESET_PASSWORD email
// (utils/password.ts → utils/email.ts), the same text the user receives.

test.use({ role: "admin" });

const NEW_PASSWORD = "AfterReset@123";

const mustChange = (idToken: string) =>
  jwtPayload<{ mustChangePassword: boolean }>(idToken).mustChangePassword;

test(
  "An admin reset signs out the user's existing sessions",
  { tag: ["@TC-PASSWORD-043", "@smoke"] },
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
  "Temp-password sessions carry mustChangePassword until changed",
  { tag: ["@TC-PASSWORD-044"] },
  async ({ adminApi, newApi }) => {
    const account = await createAccount({ tag: "ar-flag" });
    const temp = await adminResetAndReadTempPassword(adminApi, account.email);

    const tempLogin = await loginOverApi(account.email, temp);
    expect(tempLogin.status).toBe(200);
    expect(mustChange(tempLogin.idToken!)).toBe(true);

    const api = await newApi();
    const change = await api
      .as({ accessToken: tempLogin.accessToken! })
      .changePassword.submit({
        currentPassword: temp,
        newPassword: NEW_PASSWORD,
        confirmPassword: NEW_PASSWORD
      });
    expect(change.status()).toBe(200);
    expect(
      mustChange((await dataOf<{ idToken: string }>(change)).idToken)
    ).toBe(false);

    // The flag is cleared in the account, not only in that one response.
    const after = await loginOverApi(account.email, NEW_PASSWORD);
    expect(after.status).toBe(200);
    expect(mustChange(after.idToken!)).toBe(false);
    expect((await loginOverApi(account.email, temp)).status).toBe(401);
  }
);

test(
  "The API refuses a must-change session outside the change endpoint",
  { tag: ["@TC-PASSWORD-045"] },
  async ({ adminApi, newApi }) => {
    // mustChangePassword is enforced only by the client gate
    // (MustChangePasswordGate); the API serves a temp-password session
    // normally, so the forced change can be skipped by calling it directly.
    // BUG: defects/password.md#bug-password-01
    test.fail();
    const account = await createAccount({ tag: "ar-bypass" });
    const temp = await adminResetAndReadTempPassword(adminApi, account.email);
    const tempLogin = await loginOverApi(account.email, temp);
    const res = await (await newApi())
      .as({ accessToken: tempLogin.accessToken! })
      .call("get", "/users/me/favorites");
    expect(res.status()).toBe(403);
  }
);
