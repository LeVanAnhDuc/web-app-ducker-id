import { test, expect } from "@/fixtures";
import type { APIRequestContext } from "@playwright/test";
import { createApiClient } from "@/api";
import { dataOf, errorOf } from "@/api/response";
import { MALFORMED_USER_ID, UNKNOWN_USER_ID } from "@/data/test-data";
import { createAccount } from "@/utils/accounts";
import {
  adminUserId,
  ownUserId,
  promoteToAdmin,
  readTempPassword
} from "@/utils/admin-users";
import { jwtPayload } from "@/utils/jwt";
import { passwordLogin } from "@/utils/login-history";

// POST /admin/users/:id/reset-password — the full round trip on a throwaway
// account: the old password stops working, the emailed temporary password
// signs in, and that session is flagged to change it. The forced change
// itself belongs to the password module.
// Test cases: test-cases/admin-users.md.

const adminUsersOf = (ctx: APIRequestContext) =>
  createApiClient(ctx).adminUsers;

const idTokenClaims = async (res: Awaited<ReturnType<typeof passwordLogin>>) =>
  jwtPayload((await dataOf<{ idToken: string }>(res)).idToken);

test.describe(
  "Reset issues a temporary password that must be changed",
  { tag: ["@TC-ADMINUSERS-053", "@smoke"] },
  () => {
    test("reset replaces the password with an emailed temporary one that must be changed", async ({
      adminApi,
      guestApi
    }) => {
      const victim = await createAccount({ tag: "adm-reset-cycle" });
      const id = await adminUserId(adminApi, victim.email);
      const before = await passwordLogin(
        guestApi,
        victim.email,
        victim.password
      );
      expect(before.ok()).toBe(true);
      expect((await idTokenClaims(before)).mustChangePassword).toBe(false);

      const since = Date.now() - 1000;
      const res = await adminUsersOf(adminApi).resetPassword(id);
      expect(res.status()).toBe(200);
      expect(await dataOf(res)).toEqual({ _id: id, email: victim.email });

      // Old password is rejected.
      const old = await passwordLogin(guestApi, victim.email, victim.password);
      expect(old.ok()).toBe(false);
      expect(old.status()).toBe(401);

      // The temporary password signs in and the session must change it.
      const temp = await readTempPassword(victim.email, since);
      expect(temp).toHaveLength(16);
      expect(temp).not.toBe(victim.password);
      const login = await passwordLogin(guestApi, victim.email, temp);
      expect(login.ok(), `temp-password login → ${login.status()}`).toBe(true);
      const claims = await idTokenClaims(login);
      expect(claims.mustChangePassword).toBe(true);
      expect(claims.email).toBe(victim.email);
    });

    test("a second reset invalidates the first temporary password", async ({
      adminApi,
      guestApi
    }) => {
      const victim = await createAccount({ tag: "adm-reset-twice" });
      const id = await adminUserId(adminApi, victim.email);
      const admin = adminUsersOf(adminApi);

      const t1 = Date.now() - 1000;
      expect((await admin.resetPassword(id)).ok()).toBe(true);
      const first = await readTempPassword(victim.email, t1);

      // Job timestamps are in ms: start the second window strictly after the
      // first job so the first password can never be read back as the second.
      await new Promise((resolve) => setTimeout(resolve, 20));
      const t2 = Date.now();
      expect((await admin.resetPassword(id)).ok()).toBe(true);
      const second = await readTempPassword(victim.email, t2);
      expect(second).not.toBe(first);

      expect((await passwordLogin(guestApi, victim.email, first)).ok()).toBe(
        false
      );
      const ok = await passwordLogin(guestApi, victim.email, second);
      expect(
        ok.ok(),
        `${ok.status()} ${await ok.text()} first=${first} second=${second}`
      ).toBe(true);
    });
  }
);

// ---------------------------------------------------------------------------
// Validation / error guessing — admin API contract, precedence
// format (400) > existence (404) > self (403) > success (200).
// ---------------------------------------------------------------------------
test.describe(
  "Reset guards: format, existence, self",
  { tag: ["@TC-ADMINUSERS-052", "@smoke"] },
  () => {
    test("[EG] malformed id (not 24-hex) → 400", async ({ adminApi }) => {
      const res = await adminUsersOf(adminApi).resetPassword(MALFORMED_USER_ID);
      expect(res.status()).toBe(400);
      expect((await errorOf(res)).code).toBe("VALIDATION_ERROR");
    });

    test("[EG] 24-hex but unknown id → 404 USER_NOT_FOUND", async ({
      adminApi
    }) => {
      const res = await adminUsersOf(adminApi).resetPassword(UNKNOWN_USER_ID);
      expect(res.status()).toBe(404);
      expect((await errorOf(res)).code).toBe("USER_NOT_FOUND");
    });

    test("[EG] admin resetting own id → 403 ADMIN_CANNOT_RESET_SELF", async ({
      adminApi
    }) => {
      const res = await adminUsersOf(adminApi).resetPassword(
        await ownUserId(adminApi)
      );
      expect(res.status()).toBe(403);
      expect((await errorOf(res)).code).toBe("ADMIN_CANNOT_RESET_SELF");
    });

    test("resetting a valid, non-self user succeeds — 200 { _id, email }", async ({
      adminApi
    }) => {
      const target = await createAccount({ tag: "adm-reset-valid" });
      const targetId = await adminUserId(adminApi, target.email);
      const res = await adminUsersOf(adminApi).resetPassword(targetId);
      expect(res.status()).toBe(200);
      expect(await dataOf(res)).toEqual({
        _id: targetId,
        email: target.email
      });
    });
  }
);

// Design (admin-reset-password §2): reset another admin is allowed — only the
// self-reset is guarded, and there is no "last admin" rule for resets.
test(
  "An admin can reset another admin",
  { tag: "@TC-ADMINUSERS-067" },
  async ({ adminApi }) => {
    const other = await createAccount({ tag: "adm-reset-admin" });
    await promoteToAdmin(other.email);
    const id = await adminUserId(adminApi, other.email);
    const res = await adminUsersOf(adminApi).resetPassword(id);
    expect(res.status()).toBe(200);
    expect(await dataOf(res)).toEqual({ _id: id, email: other.email });
  }
);
