import { test, expect } from "@fixtures";
import { getAppIdsByName, getUserIdByEmail } from "@helpers/entitlements";

// /api/v1/admin/entitlements — authorisation of the matrix API.
// Test cases: test-cases/admin-entitlements.md (TC-ADMENT-038, TC-ADMENT-039).
// Behaviour (overrides, role defaults, notifications) is proven through the
// UI in tests/e2e/admin-entitlements/matrix.e2e.ts and
// tests/e2e/apps/launcher-access.e2e.ts; schema validation is a server unit
// test (validators/schemas/entitlement.spec.ts). Nothing here writes.

const PATH = "/api/v1/admin/entitlements";

test(
  "a regular user gets 403 from the admin entitlement API",
  { tag: ["@TC-ADMENT-038", "@smoke"] },
  async ({ userApi }) => {
    const userId = await getUserIdByEmail("user2@test.com");
    const appIds = await getAppIdsByName();

    const read = await userApi.get(PATH, { params: { userIds: userId } });
    expect(read.status()).toBe(403);

    const write = await userApi.patch(PATH, {
      data: {
        changes: [
          { userId, appId: appIds["Operations Console"], granted: true }
        ]
      }
    });
    expect(write.status()).toBe(403);
  }
);

test("no token gets 401", { tag: "@TC-ADMENT-039" }, async ({ guestApi }) => {
  const userId = await getUserIdByEmail("user2@test.com");
  expect(
    (await guestApi.get(PATH, { params: { userIds: userId } })).status()
  ).toBe(401);
  expect((await guestApi.patch(PATH, { data: { changes: [] } })).status()).toBe(
    401
  );
});
