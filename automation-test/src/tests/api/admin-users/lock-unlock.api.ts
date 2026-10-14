import { test, expect } from "@/fixtures";
import type { APIRequestContext } from "@playwright/test";
import { createApiClient } from "@/api";
import type { AdminUsersPage } from "@/api/admin-users.client";
import { apiAs } from "@/api/session";
import { dataOf, errorOf, sessionOf } from "@/api/response";
import { serverMessage } from "@/data/copy";
import { MALFORMED_USER_ID, UNKNOWN_USER_ID } from "@/data/test-data";
import { createAccount } from "@/utils/accounts";
import { adminUserId, ownUserId, promoteToAdmin } from "@/utils/admin-users";
import { passwordLogin } from "@/utils/login-history";

// PATCH /admin/users/:id/{lock,unlock} — decision table (target role ×
// target state × self), the guards (malformed id, unknown id, self), the
// full active → locked → active cycle as seen by the account itself, and the
// soft lock (a live access token outlives the lock, its refresh does not).
// Every target is a throwaway account; the self cases are refused or only
// unlock. Test cases: test-cases/admin-users.md.

const adminUsersOf = (ctx: APIRequestContext) =>
  createApiClient(ctx).adminUsers;

test.describe(
  "Lock outcome by target role and actor role",
  { tag: ["@TC-ADMINUSERS-036", "@smoke"] },
  () => {
    test("an admin can lock and unlock another admin while a second admin stays active", async ({
      adminApi
    }) => {
      const other = await createAccount({ tag: "adm-other-admin" });
      await promoteToAdmin(other.email);
      const id = await adminUserId(adminApi, other.email);
      const admin = adminUsersOf(adminApi);

      const lock = await admin.lock(id);
      expect(lock.status()).toBe(200);
      expect(await dataOf(lock)).toEqual({ _id: id, isActive: false });
      const unlock = await admin.unlock(id);
      expect(unlock.status()).toBe(200);
      expect((await dataOf<{ isActive: boolean }>(unlock)).isActive).toBe(true);
    });

    test("a non-admin actor is refused before the target is looked at", async ({
      adminApi
    }) => {
      const actor = await createAccount({ tag: "adm-plain-actor" });
      const target = await createAccount({ tag: "adm-plain-target" });
      const targetId = await adminUserId(adminApi, target.email);
      const actorApi = await apiAs(actor.email, actor.password);
      try {
        const res = await adminUsersOf(actorApi).lock(targetId);
        expect(res.status()).toBe(403);
        expect((await errorOf(res)).code).toBe("AUTH_ADMIN_ONLY");
      } finally {
        await actorApi.dispose();
      }
      // The target was not touched.
      const after = await adminUsersOf(adminApi).list({
        search: target.email
      });
      expect((await dataOf<AdminUsersPage>(after)).items[0].isActive).toBe(
        true
      );
    });

    test("locking a valid, non-self user succeeds — 200", async ({
      adminApi
    }) => {
      const target = await createAccount({ tag: "adm-lock-valid" });
      const id = await adminUserId(adminApi, target.email);
      const res = await adminUsersOf(adminApi).lock(id);
      expect(res.status()).toBe(200);
      expect(await dataOf(res)).toEqual({ _id: id, isActive: false });
    });
  }
);

test(
  "A locked account cannot sign in until unlocked",
  { tag: ["@TC-ADMINUSERS-032", "@smoke"] },
  async ({ adminApi, guestApi: anon }) => {
    const victim = await createAccount({ tag: "adm-lock-cycle" });
    const id = await adminUserId(adminApi, victim.email);
    const admin = adminUsersOf(adminApi);
    expect(
      (await passwordLogin(anon, victim.email, victim.password)).ok()
    ).toBe(true);

    expect((await admin.lock(id)).ok()).toBe(true);
    const denied = await passwordLogin(anon, victim.email, victim.password);
    expect(denied.status()).toBeGreaterThanOrEqual(400);
    expect((await errorOf(denied)).code).toBe("LOGIN_ACCOUNT_INACTIVE");

    expect((await admin.unlock(id)).ok()).toBe(true);
    const allowed = await passwordLogin(anon, victim.email, victim.password);
    expect(allowed.ok()).toBe(true);
  }
);

// Soft lock (docs/specs/admin-lock-unlock-user/design.md §1–2): the lock stops
// new sign-ins and every refresh, but the access token the account already
// holds keeps working until it expires — authGuard does not re-read isActive.
test(
  "A locked account keeps its current access token but cannot refresh",
  { tag: "@TC-ADMINUSERS-061" },
  async ({ adminApi, newApi }) => {
    const victim = await createAccount({ tag: "adm-soft-lock" });
    const id = await adminUserId(adminApi, victim.email);
    const api = await newApi();
    const session = await sessionOf(
      await api.auth.login(victim.email, victim.password)
    );

    expect((await adminUsersOf(adminApi).lock(id)).ok()).toBe(true);

    const me = await api.as(session).call("get", "/users/me");
    expect(me.status()).toBe(200);

    // The context's cookie jar replays the refreshToken cookie of the login.
    const refreshed = await api.auth.refreshToken();
    expect(refreshed.status()).toBe(403);
    const err = await errorOf(refreshed);
    expect(err.code).toBe("REFRESH_TOKEN_INVALID");
    expect(err.message).toBe(serverMessage.login.errors.invalidRefreshToken);
  }
);

// ---------------------------------------------------------------------------
// Validation / error guessing — admin API, precedence
// format (400) > existence (404) > self (403)
// ---------------------------------------------------------------------------
test.describe(
  "Malformed and unknown ids are refused",
  { tag: "@TC-ADMINUSERS-033" },
  () => {
    for (const active of [false, true]) {
      const verb = active ? "unlock" : "lock";
      test(`[EG] ${verb}: malformed id (not 24-hex) → 400`, async ({
        adminApi
      }) => {
        const res = await adminUsersOf(adminApi).setActive(
          MALFORMED_USER_ID,
          active
        );
        expect(res.status()).toBe(400);
        expect((await errorOf(res)).code).toBe("VALIDATION_ERROR");
      });

      test(`[EG] ${verb}: 24-hex but unknown id → 404 USER_NOT_FOUND`, async ({
        adminApi
      }) => {
        const res = await adminUsersOf(adminApi).setActive(
          UNKNOWN_USER_ID,
          active
        );
        expect(res.status()).toBe(404);
        expect((await errorOf(res)).code).toBe("USER_NOT_FOUND");
      });
    }
  }
);

test(
  "An admin cannot lock themself",
  { tag: "@TC-ADMINUSERS-034" },
  async ({ adminApi }) => {
    const res = await adminUsersOf(adminApi).lock(await ownUserId(adminApi));
    expect(res.status()).toBe(403);
    expect((await errorOf(res)).code).toBe("ADMIN_CANNOT_LOCK_SELF");
  }
);

test(
  "Unlocking yourself is allowed",
  { tag: "@TC-ADMINUSERS-035" },
  async ({ adminApi }) => {
    const res = await adminUsersOf(adminApi).unlock(await ownUserId(adminApi));
    expect(res.ok()).toBe(true);
    expect((await dataOf<{ isActive: boolean }>(res)).isActive).toBe(true);
  }
);
