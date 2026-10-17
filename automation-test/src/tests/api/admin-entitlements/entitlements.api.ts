import { test, expect } from "@/fixtures";
import { createApiClient } from "@/api";
import type { EntitlementMatrix } from "@/api/admin-entitlements.client";
import { dataOf, errorOf } from "@/api/response";
import { ADMIN, USER } from "@/config/accounts";
import { serverMessage } from "@/data/copy";
import { createAccount } from "@/utils/accounts";
import {
  clearOverrides,
  getAccess,
  getAdminApps,
  getAppIdsByName,
  getUserIdByEmail
} from "@/utils/entitlements";

// /admin/entitlements — authorisation and contract of the matrix API
// (REQ-ADMINENTITLEMENTS-03, -05, -06). Test cases:
// test-cases/admin-entitlements.md (TC-ADMINENTITLEMENTS-038, 039, 044 … 046).
// The UI side is tests/e2e/admin-entitlements/; schema validation (sizes,
// duplicates, types) is a server unit test (Q3). Writes go to throwaway
// accounts only, and their overrides are removed after every test.

const EN = { "Accept-Language": "en" };
/** A well-formed ObjectId no document has. */
const UNKNOWN_ID = "ffffffffffffffffffffffff";
const USER2_EMAIL = "user2@test.com";

test(
  "A non-admin gets 403 from the entitlement API",
  { tag: ["@TC-ADMINENTITLEMENTS-038", "@smoke"] },
  async ({ userApi }) => {
    const userId = await getUserIdByEmail(USER2_EMAIL);
    const appIds = await getAppIdsByName();
    const api = createApiClient(userApi);

    expect((await api.adminEntitlements.matrix([userId])).status()).toBe(403);
    expect(
      (
        await api.adminEntitlements.update([
          { userId, appId: appIds["Operations Console"], granted: true }
        ])
      ).status()
    ).toBe(403);
  }
);

test(
  "The entitlement API requires a session",
  { tag: ["@TC-ADMINENTITLEMENTS-039", "@smoke"] },
  async ({ guestApi }) => {
    const userId = await getUserIdByEmail(USER2_EMAIL);
    const api = createApiClient(guestApi);

    expect((await api.adminEntitlements.matrix([userId])).status()).toBe(401);
    expect((await api.adminEntitlements.update([])).status()).toBe(401);
  }
);

test(
  "The matrix API returns each user's effective access in the requested order",
  { tag: "@TC-ADMINENTITLEMENTS-044" },
  async ({ adminApi }) => {
    const [user2Id, adminId, userId] = await Promise.all([
      getUserIdByEmail(USER2_EMAIL),
      getUserIdByEmail(ADMIN.email),
      getUserIdByEmail(USER.email)
    ]);
    const catalog = await getAdminApps();
    const id = (name: string) => {
      const app = catalog.find((item) => item.displayName === name);
      if (!app) throw new Error(`seeded app "${name}" is missing`);
      return app._id;
    };

    const res = await createApiClient(adminApi).adminEntitlements.matrix([
      user2Id,
      adminId,
      userId
    ]);
    expect(res.status()).toBe(200);
    const { users } = await dataOf<EntitlementMatrix>(res);
    expect(users.map((row) => row.userId)).toEqual([user2Id, adminId, userId]);
    const [user2, admin, user] = users;

    // John Doe: seeded `deny` Notes, `allow` Operations Console.
    expect(user2.grantedAppIds).toContain(id("Operations Console"));
    expect(user2.grantedAppIds).not.toContain(id("Notes"));
    expect([...user2.overriddenAppIds].sort()).toEqual(
      [id("Notes"), id("Operations Console")].sort()
    );

    // An admin qualifies for every app of the catalog, whatever its roles.
    expect([...admin.grantedAppIds].sort()).toEqual(
      catalog.map((app) => app._id).sort()
    );
    expect(admin.overriddenAppIds).toEqual([]);

    // The role default of a `user`; inactive Team Calendar still counts.
    for (const name of ["Blog", "IDMS Portal", "Team Calendar", "Notes"]) {
      expect(user.grantedAppIds, name).toContain(id(name));
    }
    for (const name of ["Analytics Dashboard", "Operations Console"]) {
      expect(user.grantedAppIds, name).not.toContain(id(name));
    }
    expect(user.overriddenAppIds).toEqual([]);
  }
);

test.describe("writes on a throwaway account", () => {
  test.describe.configure({ mode: "serial" });

  let ownId: string;
  let appIds: Record<string, string>;

  test.beforeAll(async () => {
    const own = await createAccount({ tag: "ent-api" });
    ownId = await getUserIdByEmail(own.email);
    appIds = await getAppIdsByName();
  });

  test.afterEach(async () => {
    await clearOverrides(ownId);
  });

  test(
    "Unknown user or app ids are refused with 404 and nothing is written",
    { tag: "@TC-ADMINENTITLEMENTS-045" },
    async ({ adminApi }) => {
      const api = createApiClient(adminApi).adminEntitlements;
      const { errors } = serverMessage.entitlement;

      const read = await api.matrix([UNKNOWN_ID], EN);
      expect(read.status()).toBe(404);
      expect(await errorOf(read)).toMatchObject({
        code: "ENTITLEMENT_USER_NOT_FOUND",
        message: errors.userNotFound
      });

      // A valid change first, the unknown app last: nothing may be applied.
      const badApp = await api.update(
        [
          { userId: ownId, appId: appIds["Blog"], granted: false },
          { userId: ownId, appId: UNKNOWN_ID, granted: true }
        ],
        EN
      );
      expect(badApp.status()).toBe(404);
      expect(await errorOf(badApp)).toMatchObject({
        code: "ENTITLEMENT_APP_NOT_FOUND",
        message: errors.appNotFound
      });

      const badUser = await api.update(
        [{ userId: UNKNOWN_ID, appId: appIds["Blog"], granted: false }],
        EN
      );
      expect(badUser.status()).toBe(404);
      expect(await errorOf(badUser)).toMatchObject({
        code: "ENTITLEMENT_USER_NOT_FOUND",
        message: errors.userNotFound
      });

      const after = await getAccess(ownId);
      expect(after.overriddenAppIds).toEqual([]);
      expect(after.grantedAppIds).toContain(appIds["Blog"]);
    }
  );

  test(
    "Saving the same change twice keeps one exception and answers the matrix shape",
    { tag: "@TC-ADMINENTITLEMENTS-046" },
    async ({ adminApi }) => {
      const api = createApiClient(adminApi).adminEntitlements;
      const change = { userId: ownId, appId: appIds["Notes"], granted: false };

      const first = await api.update([change]);
      expect(first.status()).toBe(200);
      const once = await dataOf<EntitlementMatrix>(first);
      expect(once.users).toHaveLength(1);
      expect(once.users[0].userId).toBe(ownId);
      expect(once.users[0].grantedAppIds).not.toContain(appIds["Notes"]);
      expect(once.users[0].overriddenAppIds).toEqual([appIds["Notes"]]);

      const second = await api.update([change]);
      expect(second.status()).toBe(200);
      expect(await dataOf<EntitlementMatrix>(second)).toEqual(once);

      expect(await getAccess(ownId)).toEqual(once.users[0]);
    }
  );
});
