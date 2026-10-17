import { test, expect } from "@/fixtures";
import { dataOf, sessionOf } from "@/api/response";
import type { NotificationPage } from "@/api/notifications.client";
import { ANOMALY_USER_AGENTS } from "@/data/test-data";
import { LoginPage } from "@/pages/auth/login.page";
import { NotificationsPage } from "@/pages/dashboard/notifications.page";
import { createAccount } from "@/utils/accounts";

// The real LOGIN_ANOMALY producer end to end — server/src/modules/
// login-history (recordSuccessfulLogin → notifyByAuthId) to the rendered row.
// A throwaway account: its first sign-in has no history (never an anomaly),
// the second from another browser/OS is a new device. The seeded user gains
// no rows. Test case: test-cases/notifications.md (TC-NOTIFICATIONS-048).

test.use({ role: "guest" });

test(
  "A sign-in from an unseen device produces a real notification",
  { tag: ["@TC-NOTIFICATIONS-048", "@smoke"] },
  async ({ page, newApi }) => {
    const account = await createAccount({ tag: "notif-anomaly" });
    const [known, unseen] = ANOMALY_USER_AGENTS;

    const signIn = async (ua: string) => {
      const api = await newApi({ "User-Agent": ua });
      const res = await api.auth.login(account.email, account.password);
      expect(res.ok(), `login → ${res.status()}`).toBeTruthy();
      return api.as(await sessionOf(res));
    };
    const anomalies = async (authed: Awaited<ReturnType<typeof signIn>>) => {
      const res = await authed.notifications.list({
        category: "security",
        limit: 50
      });
      return (await dataOf<NotificationPage>(res)).items.filter(
        (n) => n.type === "LOGIN_ANOMALY"
      );
    };
    const historyTotal = async (authed: Awaited<ReturnType<typeof signIn>>) => {
      const res = await authed.call("get", "/login-history", {
        params: { limit: 1 }
      });
      return (await dataOf<{ meta: { total: number } }>(res)).meta.total;
    };

    const first = await signIn(known.ua);
    // Login history is written fire-and-forget; wait until the row has
    // landed before the second sign-in reads it.
    await expect
      .poll(() => historyTotal(first), { timeout: 15_000 })
      .toBeGreaterThan(0);
    expect(await anomalies(first)).toHaveLength(0);

    const second = await signIn(unseen.ua);
    await expect
      .poll(async () => (await anomalies(second)).length, { timeout: 15_000 })
      .toBe(1);
    const [newest] = await anomalies(second);
    expect(newest.params.browser).toBe(unseen.browser);

    await new LoginPage(page).signIn(account.email, account.password);
    const inbox = new NotificationsPage(page);
    await inbox.goto();
    await expect(
      inbox.text(new RegExp(`^${unseen.browser} on `)).first()
    ).toBeVisible();
  }
);
