import { test, expect } from "@/fixtures";
import type { APIRequestContext } from "@playwright/test";
import { createApiClient } from "@/api";
import type { NotificationPage } from "@/api/notifications.client";
import { dataOf } from "@/api/response";
import { apiAs } from "@/api/session";
import { createAccount, type Account } from "@/utils/accounts";
import {
  clearOverrides,
  getAccess,
  getAdminApps,
  getUserIdByEmail,
  setAccess
} from "@/utils/entitlements";

// Entitlement notifications for apps that are not active
// (REQ-ADMINENTITLEMENTS-08): a flip of effective access writes
// ENTITLEMENT_GRANTED / _REVOKED through the notification queue, but only
// for an active app — the launcher would not show an inactive one.
// Test case: TC-ADMINENTITLEMENTS-048. The active-app cases are
// TC-ADMINENTITLEMENTS-040 / 041 in tests/e2e/apps/launcher-access.e2e.ts.
//
// Writes go to a throwaway account, whose inbox is read with its own session.

const INACTIVE_APP = "Team Calendar";
const ACTIVE_APP = "Notes";

let account: Account;
let userId: string;
let inbox: APIRequestContext;

test.beforeAll(async () => {
  account = await createAccount({ tag: "ent-notify" });
  userId = await getUserIdByEmail(account.email);
  inbox = await apiAs(account.email, account.password);
});

test.afterEach(async () => {
  await clearOverrides(userId);
});

test.afterAll(async () => {
  await inbox?.dispose();
});

/** ENTITLEMENT_* rows of the account about `appName`, as "TYPE" strings. */
const entitlementTypes = async (appName: string): Promise<string[]> => {
  const res = await createApiClient(inbox).notifications.list();
  expect(res.ok(), `GET notifications → ${res.status()}`).toBeTruthy();
  const { items } = await dataOf<NotificationPage>(res);
  return items
    .filter(
      (row) =>
        row.type.startsWith("ENTITLEMENT_") && row.params.appName === appName
    )
    .map((row) => row.type);
};

test(
  "Changing access to an inactive app sends no notification",
  { tag: "@TC-ADMINENTITLEMENTS-048" },
  async () => {
    const catalog = await getAdminApps();
    const inactive = catalog.find((app) => app.displayName === INACTIVE_APP);
    const active = catalog.find((app) => app.displayName === ACTIVE_APP);
    expect(inactive?.status, `${INACTIVE_APP} is seeded inactive`).toBe(
      "inactive"
    );
    expect(active?.status, `${ACTIVE_APP} is seeded active`).toBe("active");

    // One save, both apps: the active app's row is the signal that the
    // queue has delivered this save's notifications.
    await setAccess([
      { userId, appId: inactive!._id, granted: false },
      { userId, appId: active!._id, granted: false }
    ]);
    await expect
      .poll(() => entitlementTypes(ACTIVE_APP))
      .toEqual(["ENTITLEMENT_REVOKED"]);

    // The inactive app's access did flip — it is stored as an exception …
    expect((await getAccess(userId)).overriddenAppIds).toContain(inactive!._id);
    // … but the user was not told about it.
    expect(await entitlementTypes(INACTIVE_APP)).toEqual([]);
  }
);
