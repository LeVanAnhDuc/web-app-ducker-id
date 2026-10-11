import { test, expect, apiAs } from "@fixtures";
import { createAccount } from "@helpers/accounts";
import {
  adminUserId,
  ownUserId,
  passwordLogin,
  promoteToAdmin,
  setActive
} from "@helpers/adminUsers";

// PATCH /api/v1/admin/users/:id/{lock,unlock} — decision table (target role ×
// target state × self), the guards (malformed id, unknown id, self) and the
// full active → locked → active cycle as seen by the account itself. Every
// target is a throwaway account; the self cases are refused or only unlock.
// Test cases: test-cases/admin-users.md.

test.describe("lock × target role (decision table)", () => {
  test(
    "an admin can lock and unlock another admin while a second admin stays active",
    { tag: "@TC-ADMUSERS-036" },
    async ({ adminApi }) => {
      const other = await createAccount({ tag: "adm-other-admin" });
      await promoteToAdmin(other.email);
      const id = await adminUserId(adminApi, other.email);

      const lock = await setActive(adminApi, id, false);
      expect(lock.status()).toBe(200);
      expect(
        ((await lock.json()) as { data: { isActive: boolean } }).data
      ).toEqual({ _id: id, isActive: false });
      const unlock = await setActive(adminApi, id, true);
      expect(unlock.status()).toBe(200);
      expect(
        ((await unlock.json()) as { data: { isActive: boolean } }).data.isActive
      ).toBe(true);
    }
  );

  test(
    "a non-admin actor is refused before the target is looked at",
    { tag: "@TC-ADMUSERS-036" },
    async ({ adminApi }) => {
      const actor = await createAccount({ tag: "adm-plain-actor" });
      const target = await createAccount({ tag: "adm-plain-target" });
      const targetId = await adminUserId(adminApi, target.email);
      const actorApi = await apiAs(actor.email, actor.password);
      try {
        const res = await setActive(actorApi, targetId, false);
        expect(res.status()).toBe(403);
        expect(((await res.json()) as { code: string }).code).toBe(
          "AUTH_ADMIN_ONLY"
        );
      } finally {
        await actorApi.dispose();
      }
      // The target was not touched.
      const after = await adminApi.get("/api/v1/admin/users", {
        params: { search: target.email }
      });
      const body = (await after.json()) as {
        data: { items: { isActive: boolean }[] };
      };
      expect(body.data.items[0].isActive).toBe(true);
    }
  );
});

test.describe("active → locked → active, seen by the account", () => {
  test(
    "a locked account cannot sign in, keeps its password, and signs in again once unlocked",
    { tag: ["@TC-ADMUSERS-032", "@smoke"] },
    async ({ adminApi, guestApi: anon }) => {
      const victim = await createAccount({ tag: "adm-lock-cycle" });
      const id = await adminUserId(adminApi, victim.email);
      expect(
        (await passwordLogin(anon, victim.email, victim.password)).ok()
      ).toBe(true);

      expect((await setActive(adminApi, id, false)).ok()).toBe(true);
      const denied = await passwordLogin(anon, victim.email, victim.password);
      expect(denied.status()).toBeGreaterThanOrEqual(400);
      expect(((await denied.json()) as { code: string }).code).toBe(
        "LOGIN_ACCOUNT_INACTIVE"
      );

      expect((await setActive(adminApi, id, true)).ok()).toBe(true);
      const allowed = await passwordLogin(anon, victim.email, victim.password);
      expect(allowed.ok()).toBe(true);
    }
  );
});

// ---------------------------------------------------------------------------
// Validation / error guessing — admin API, precedence
// format (400) > existence (404) > self (403)
// ---------------------------------------------------------------------------
test.describe("lock / unlock guards (format, existence, self)", () => {
  for (const active of [false, true]) {
    const verb = active ? "unlock" : "lock";
    test(
      `[EG] ${verb}: malformed id (not 24-hex) → 400`,
      { tag: "@TC-ADMUSERS-033" },
      async ({ adminApi }) => {
        const res = await setActive(adminApi, "not-an-object-id", active);
        expect(res.status()).toBe(400);
        expect(((await res.json()) as { code: string }).code).toBe(
          "VALIDATION_ERROR"
        );
      }
    );

    test(
      `[EG] ${verb}: 24-hex but unknown id → 404 USER_NOT_FOUND`,
      { tag: "@TC-ADMUSERS-033" },
      async ({ adminApi }) => {
        const res = await setActive(
          adminApi,
          "aaaaaaaaaaaaaaaaaaaaaaaa",
          active
        );
        expect(res.status()).toBe(404);
        expect(((await res.json()) as { code: string }).code).toBe(
          "USER_NOT_FOUND"
        );
      }
    );
  }

  test(
    "[EG] admin locking own id → 403 ADMIN_CANNOT_LOCK_SELF",
    { tag: "@TC-ADMUSERS-034" },
    async ({ adminApi }) => {
      const res = await setActive(adminApi, await ownUserId(adminApi), false);
      expect(res.status()).toBe(403);
      expect(((await res.json()) as { code: string }).code).toBe(
        "ADMIN_CANNOT_LOCK_SELF"
      );
    }
  );

  test(
    "admin unlocking own id is allowed (unlock has no self-guard)",
    { tag: "@TC-ADMUSERS-035" },
    async ({ adminApi }) => {
      const res = await setActive(adminApi, await ownUserId(adminApi), true);
      expect(res.ok()).toBe(true);
      expect(
        ((await res.json()) as { data: { isActive: boolean } }).data.isActive
      ).toBe(true);
    }
  );

  test(
    "locking a valid, non-self user succeeds — 200",
    { tag: "@TC-ADMUSERS-036" },
    async ({ adminApi }) => {
      const target = await createAccount({ tag: "adm-lock-valid" });
      const id = await adminUserId(adminApi, target.email);
      const res = await setActive(adminApi, id, false);
      expect(res.status()).toBe(200);
      expect(((await res.json()) as { data: unknown }).data).toEqual({
        _id: id,
        isActive: false
      });
    }
  );
});
