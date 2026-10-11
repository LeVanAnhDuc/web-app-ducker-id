import { test, expect } from "@fixtures";
import { createAccount } from "@helpers/accounts";
import { adminUserId, resetPassword } from "@helpers/adminUsers";
import { lockAccount } from "@helpers/auth";
import { notificationsOf } from "@helpers/notifications";
import { bearerContext, loginOverApi } from "@helpers/password";

// Real producers: the events that write a notification, each on a throwaway
// account so no seeded inbox changes. Rows are written by the notification
// queue a moment after the event, and an event such as a reset ends the
// session that could read the list, so the stored rows are polled in Mongo.
// Test cases: test-cases/notifications.md (TC-NOTIF-053 … 055). The
// LOGIN_ANOMALY event is proven end to end in
// tests/e2e/notifications/notifications.e2e.ts (TC-NOTIF-048), the
// ENTITLEMENT_* ones in tests/e2e/apps/launcher-access.e2e.ts.

test.use({ role: "guest" });

const NEW_PASSWORD = "Changed@123";

const ofType = async (email: string, type: string) =>
  (await notificationsOf(email)).filter((n) => n.type === type);

test(
  "changing your own password notifies you (actor self) [ST]",
  { tag: "@TC-NOTIF-053" },
  async () => {
    const account = await createAccount({ tag: "notif-pwd-self" });
    const login = await loginOverApi(account.email, account.password);
    expect(login.status).toBe(200);
    const api = await bearerContext(login.accessToken!);
    try {
      const res = await api.patch("/api/v1/auth/change-password", {
        data: {
          currentPassword: account.password,
          newPassword: NEW_PASSWORD,
          confirmPassword: NEW_PASSWORD
        }
      });
      expect(res.status(), await res.text()).toBe(200);
    } finally {
      await api.dispose();
    }

    await expect
      .poll(
        async () => (await ofType(account.email, "PASSWORD_CHANGED")).length
      )
      .toBe(1);
    const [row] = await ofType(account.email, "PASSWORD_CHANGED");
    expect(row).toMatchObject({
      category: "security",
      params: { actor: "self" },
      link: "/profile",
      isRead: false
    });
  }
);

test(
  "an admin reset notifies the user (actor admin) [ST]",
  { tag: "@TC-NOTIF-054" },
  async ({ adminApi }) => {
    const account = await createAccount({ tag: "notif-pwd-admin" });
    const id = await adminUserId(adminApi, account.email);
    const res = await resetPassword(adminApi, id);
    expect(res.ok(), `reset → ${res.status()}`).toBeTruthy();

    await expect
      .poll(
        async () => (await ofType(account.email, "PASSWORD_CHANGED")).length
      )
      .toBe(1);
    const [row] = await ofType(account.email, "PASSWORD_CHANGED");
    expect(row).toMatchObject({
      category: "security",
      params: { actor: "admin" },
      link: "/profile"
    });
  }
);

test(
  "a password lockout notifies the account with its duration [ST]",
  { tag: "@TC-NOTIF-055" },
  async () => {
    const account = await createAccount({ tag: "notif-locked" });
    await lockAccount(account.email);

    await expect
      .poll(async () => (await ofType(account.email, "ACCOUNT_LOCKED")).length)
      .toBe(1);
    const [row] = await ofType(account.email, "ACCOUNT_LOCKED");
    expect(row.category).toBe("security");
    expect(row.link).toBe("/login-history");
    expect(row.params.minutes).toEqual(expect.any(Number));
    expect(row.params.minutes as number).toBeGreaterThan(0);
  }
);
