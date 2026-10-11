import { test, expect } from "@fixtures";
import { createAccount } from "@helpers/accounts";
import {
  adminUserId,
  decodeJwt,
  ownUserId,
  passwordLogin,
  readTempPassword,
  resetPassword
} from "@helpers/adminUsers";

// POST /api/v1/admin/users/:id/reset-password — the full round trip on a
// throwaway account: the old password stops working, the emailed temporary
// password signs in, and that session is flagged to change it. The forced
// change itself belongs to the password module.
// Test cases: test-cases/admin-users.md.

test(
  "reset replaces the password with an emailed temporary one that must be changed",
  { tag: ["@TC-ADMUSERS-053", "@smoke"] },
  async ({ adminApi, guestApi }) => {
    const victim = await createAccount({ tag: "adm-reset-cycle" });
    const id = await adminUserId(adminApi, victim.email);
    const before = await passwordLogin(guestApi, victim.email, victim.password);
    expect(before.ok()).toBe(true);
    const beforeClaims = decodeJwt(
      ((await before.json()) as { data: { idToken: string } }).data.idToken
    );
    expect(beforeClaims.mustChangePassword).toBe(false);

    const since = Date.now() - 1000;
    const res = await resetPassword(adminApi, id);
    expect(res.status()).toBe(200);
    expect(((await res.json()) as { data: unknown }).data).toEqual({
      _id: id,
      email: victim.email
    });

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
    const claims = decodeJwt(
      ((await login.json()) as { data: { idToken: string } }).data.idToken
    );
    expect(claims.mustChangePassword).toBe(true);
    expect(claims.email).toBe(victim.email);
  }
);

test(
  "a second reset invalidates the first temporary password",
  { tag: "@TC-ADMUSERS-053" },
  async ({ adminApi, guestApi }) => {
    const victim = await createAccount({ tag: "adm-reset-twice" });
    const id = await adminUserId(adminApi, victim.email);

    const t1 = Date.now() - 1000;
    expect((await resetPassword(adminApi, id)).ok()).toBe(true);
    const first = await readTempPassword(victim.email, t1);

    await new Promise((resolve) => setTimeout(resolve, 20));
    const t2 = Date.now();
    expect((await resetPassword(adminApi, id)).ok()).toBe(true);
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
  }
);

// ---------------------------------------------------------------------------
// 4. Validation / error guessing — admin API contract, precedence
//    format (400) > existence (404) > self (403) > success (200).
// ---------------------------------------------------------------------------
test.describe("reset guards (format, existence, self)", () => {
  test(
    "[EG] malformed id (not 24-hex) → 400",
    { tag: "@TC-ADMUSERS-052" },
    async ({ adminApi }) => {
      const res = await resetPassword(adminApi, "not-an-object-id");
      expect(res.status()).toBe(400);
      expect(((await res.json()) as { code: string }).code).toBe(
        "VALIDATION_ERROR"
      );
    }
  );

  test(
    "[EG] 24-hex but unknown id → 404 USER_NOT_FOUND",
    { tag: "@TC-ADMUSERS-052" },
    async ({ adminApi }) => {
      const res = await resetPassword(adminApi, "aaaaaaaaaaaaaaaaaaaaaaaa");
      expect(res.status()).toBe(404);
      expect(((await res.json()) as { code: string }).code).toBe(
        "USER_NOT_FOUND"
      );
    }
  );

  test(
    "[EG] admin resetting own id → 403 ADMIN_CANNOT_RESET_SELF",
    { tag: "@TC-ADMUSERS-052" },
    async ({ adminApi }) => {
      const res = await resetPassword(adminApi, await ownUserId(adminApi));
      expect(res.status()).toBe(403);
      expect(((await res.json()) as { code: string }).code).toBe(
        "ADMIN_CANNOT_RESET_SELF"
      );
    }
  );

  test(
    "resetting a valid, non-self user succeeds — 200 { _id, email }",
    { tag: "@TC-ADMUSERS-052" },
    async ({ adminApi }) => {
      const target = await createAccount({ tag: "adm-reset-valid" });
      const targetId = await adminUserId(adminApi, target.email);
      const res = await resetPassword(adminApi, targetId);
      expect(res.status()).toBe(200);
      expect(((await res.json()) as { data: unknown }).data).toEqual({
        _id: targetId,
        email: target.email
      });
    }
  );
});
