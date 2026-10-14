import { test, expect } from "@/fixtures";
import type { AdminUsersPage } from "@/api/admin-users.client";
import { dataOf } from "@/api/response";
import { ADMIN } from "@/config/accounts";
import { createAccount } from "@/utils/accounts";
import { lockAccount } from "@/utils/auth";
import { notificationsOf } from "@/utils/notifications";
import { signedIn } from "./helpers";

// Real producers: the events that write a notification, each on a throwaway
// account so no seeded inbox changes. Rows are written by the notification
// queue a moment after the event, and an event such as a reset ends the
// session that could read the list, so the stored rows are polled in Mongo.
// Test cases: test-cases/notifications.md (TC-NOTIFICATIONS-053 … 055). The
// LOGIN_ANOMALY event is proven end to end in
// tests/e2e/notifications/sign-in-alert.e2e.ts (TC-NOTIFICATIONS-048), the
// ENTITLEMENT_* ones in tests/e2e/apps/launcher-access.e2e.ts.

test.use({ role: "guest" });

const NEW_PASSWORD = "Changed@123";

const ofType = async (email: string, type: string) =>
  (await notificationsOf(email)).filter((n) => n.type === type);

test(
  "Changing your own password notifies you",
  { tag: "@TC-NOTIFICATIONS-053" },
  async ({ newApi }) => {
    const account = await createAccount({ tag: "notif-pwd-self" });
    const user = await signedIn(newApi, account.email, account.password);
    const res = await user.changePassword.submit({
      currentPassword: account.password,
      newPassword: NEW_PASSWORD,
      confirmPassword: NEW_PASSWORD
    });
    expect(res.status(), await res.text()).toBe(200);

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
  "An admin password reset notifies the user",
  { tag: "@TC-NOTIFICATIONS-054" },
  async ({ newApi }) => {
    const account = await createAccount({ tag: "notif-pwd-admin" });
    const admin = await signedIn(newApi, ADMIN.email, ADMIN.password);
    const found = await admin.adminUsers.list({ search: account.email });
    expect(found.ok(), `admin users list → ${found.status()}`).toBe(true);
    const target = (await dataOf<AdminUsersPage>(found)).items.find(
      (u) => u.email === account.email.toLowerCase()
    );
    expect(target, `no admin-list row for ${account.email}`).toBeTruthy();
    const res = await admin.adminUsers.resetPassword(target!._id);
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
  "A password lockout notifies the account",
  { tag: "@TC-NOTIFICATIONS-055" },
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
