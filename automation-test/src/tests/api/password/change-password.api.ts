import { test, expect } from "@/fixtures";
import type { ApiClient } from "@/api";
import { dataOf, errorOf, sessionOf, setCookies } from "@/api/response";
import { loginOverApi, refreshStatus } from "@/api/session";
import { serverMessage } from "@/data/copy";
import { createAccount } from "@/utils/accounts";
import { jwtPayload } from "@/utils/jwt";
import { clearRateLimits } from "@/utils/redis";

// PATCH /auth/change-password — contract, authorisation, session revocation
// and rate limiting (server/src/modules/change-password). Test cases:
// test-cases/password.md (TC-PASSWORD-019 … TC-PASSWORD-025, TC-PASSWORD-090).
// Every request runs as a throwaway account (createAccount), so the seeded
// user@test.com keeps its password.
//
// The limiter (5 / 15 min, keyed ip + authId) sits in front of validation
// and counts every attempt, so no test sends more than five PATCHes per
// account without clearing the counters.

test.use({ role: "guest" });

const NEW_PASSWORD = "Changed@123";

/** Signs the account in on `api` and returns its Bearer-carrying client. */
async function signedIn(api: ApiClient, email: string, password: string) {
  const session = await sessionOf(await api.auth.login(email, password));
  return api.as(session);
}

test(
  "A successful change returns a fresh session",
  { tag: ["@TC-PASSWORD-023", "@smoke"] },
  async ({ newApi }) => {
    const account = await createAccount({ tag: "cp-happy" });
    const api = await newApi();
    const me = await signedIn(api, account.email, account.password);
    const res = await me.changePassword.submit({
      currentPassword: account.password,
      newPassword: NEW_PASSWORD,
      confirmPassword: NEW_PASSWORD
    });
    expect(res.status()).toBe(200);
    const data = await dataOf<{
      accessToken: string;
      idToken: string;
      expiresIn: number;
    }>(res);
    expect(data.accessToken).toBeTruthy();
    expect(
      jwtPayload<{ mustChangePassword: boolean }>(data.idToken)
        .mustChangePassword
    ).toBe(false);
    expect(
      setCookies(res).join(" | "),
      "a rotated refresh cookie for this device"
    ).toContain("refreshToken=");

    // The returned access token is usable.
    const fresh = await api
      .as({ accessToken: data.accessToken })
      .call("get", "/users/me");
    expect(fresh.status()).toBe(200);

    expect((await loginOverApi(account.email, account.password)).status).toBe(
      401
    );
    expect((await loginOverApi(account.email, NEW_PASSWORD)).status).toBe(200);
  }
);

test(
  "A password change signs out the other sessions",
  { tag: ["@TC-PASSWORD-019", "@smoke"] },
  async ({ newApi }) => {
    const account = await createAccount({ tag: "cp-revoke" });
    // "Other device": logged in before the change.
    const other = await loginOverApi(account.email, account.password);
    expect(other.refreshToken).toBeTruthy();
    expect(await refreshStatus(other.refreshToken!)).toBe(200);

    const me = await signedIn(await newApi(), account.email, account.password);
    const res = await me.changePassword.submit({
      currentPassword: account.password,
      newPassword: NEW_PASSWORD,
      confirmPassword: NEW_PASSWORD
    });
    expect(res.status()).toBe(200);

    // tokenVersion was bumped → the other device's refresh is refused.
    expect(await refreshStatus(other.refreshToken!)).toBe(403);
  }
);

test(
  "Change password without a token is refused",
  { tag: ["@TC-PASSWORD-020", "@smoke"] },
  async ({ newApi }) => {
    const res = await (
      await newApi()
    ).changePassword.submit({
      currentPassword: "Whatever@123",
      newPassword: NEW_PASSWORD,
      confirmPassword: NEW_PASSWORD
    });
    expect(res.status()).toBe(401);
    expect((await errorOf(res)).code).toBe("AUTH_MISSING_TOKEN");
  }
);

// Decision table — current correct? × new valid? × confirm matches? × new ≠ current?
test(
  "Each failing rule has its own error and changes nothing",
  { tag: ["@TC-PASSWORD-021"] },
  async ({ newApi }) => {
    const rows: ReadonlyArray<{
      rule: string;
      body: (current: string) => Record<string, string>;
      status: number;
      code: string;
      field?: string;
    }> = [
      {
        rule: "R1 current missing",
        body: () => ({
          newPassword: NEW_PASSWORD,
          confirmPassword: NEW_PASSWORD
        }),
        status: 400,
        code: "VALIDATION_ERROR",
        field: "currentPassword"
      },
      {
        rule: "R2 new password fails policy (no special char)",
        body: (current) => ({
          currentPassword: current,
          newPassword: "NoSpecial123",
          confirmPassword: "NoSpecial123"
        }),
        status: 400,
        code: "VALIDATION_ERROR",
        field: "newPassword"
      },
      {
        rule: "R3 confirm does not match",
        body: (current) => ({
          currentPassword: current,
          newPassword: NEW_PASSWORD,
          confirmPassword: "Different@123"
        }),
        status: 400,
        code: "VALIDATION_ERROR",
        field: "confirmPassword"
      },
      {
        rule: "R4 current password wrong",
        body: () => ({
          currentPassword: "WrongPass@123",
          newPassword: NEW_PASSWORD,
          confirmPassword: NEW_PASSWORD
        }),
        status: 400,
        code: "CHANGE_PASSWORD_WRONG_CURRENT"
      },
      {
        rule: "R5 new equals current",
        body: (current) => ({
          currentPassword: current,
          newPassword: current,
          confirmPassword: current
        }),
        status: 400,
        code: "CHANGE_PASSWORD_SAME_AS_CURRENT"
      }
    ];
    const account = await createAccount({ tag: "cp-dt" });
    const me = await signedIn(await newApi(), account.email, account.password);
    for (const row of rows) {
      const res = await me.changePassword.submit(row.body(account.password));
      expect(res.status(), row.rule).toBe(row.status);
      const body = await errorOf(res);
      expect(body.code, row.rule).toBe(row.code);
      if (row.field) {
        expect(
          body.errors?.map((e) => e.field),
          row.rule
        ).toContain(row.field);
      }
    }
    expect((await loginOverApi(account.email, account.password)).status).toBe(
      200
    );
  }
);

test.describe("New-password length boundaries on the server", () => {
  // [BVA] 7 / 8 / 128 / 129.
  const lengths: ReadonlyArray<{ len: number; ok: boolean }> = [
    { len: 7, ok: false },
    { len: 8, ok: true },
    { len: 128, ok: true },
    { len: 129, ok: false }
  ];
  for (const { len, ok } of lengths) {
    test(
      `new password of ${len} characters is ${ok ? "accepted" : "rejected"}`,
      { tag: ["@TC-PASSWORD-022"] },
      async ({ newApi }) => {
        const account = await createAccount({ tag: `cp-len${len}` });
        const candidate = "Ab@3" + "x".repeat(len - 4);
        expect(candidate).toHaveLength(len);
        const me = await signedIn(
          await newApi(),
          account.email,
          account.password
        );
        const res = await me.changePassword.submit({
          currentPassword: account.password,
          newPassword: candidate,
          confirmPassword: candidate
        });
        expect(res.status()).toBe(ok ? 200 : 400);
      }
    );
  }
});

test(
  "Change-password errors are translated",
  { tag: ["@TC-PASSWORD-024"] },
  async ({ newApi }) => {
    const account = await createAccount({ tag: "cp-i18n" });
    const me = await signedIn(await newApi(), account.email, account.password);
    const res = await me.changePassword.submit({
      currentPassword: "WrongPass@123",
      newPassword: NEW_PASSWORD,
      confirmPassword: NEW_PASSWORD
    });
    expect(res.status()).toBe(400);
    expect((await errorOf(res)).message).toBe(
      serverMessage.changePassword.errors.wrongCurrentPassword
    );
  }
);

test(
  "Wrong-typed password fields are a validation error, never a 5xx",
  { tag: ["@TC-PASSWORD-090"] },
  async ({ newApi }) => {
    const account = await createAccount({ tag: "cp-types" });
    const me = await signedIn(await newApi(), account.email, account.password);
    // Three requests — under the limiter's five.
    const bodies: ReadonlyArray<{
      label: string;
      body: Record<string, unknown>;
    }> = [
      {
        label: "number as current password",
        body: {
          currentPassword: 12345678,
          newPassword: NEW_PASSWORD,
          confirmPassword: NEW_PASSWORD
        }
      },
      {
        label: "array as new password",
        body: {
          currentPassword: account.password,
          newPassword: [NEW_PASSWORD],
          confirmPassword: NEW_PASSWORD
        }
      },
      { label: "empty body", body: {} }
    ];
    for (const { label, body } of bodies) {
      const res = await me.changePassword.submit(body);
      expect(res.status(), label).toBe(400);
      expect((await errorOf(res)).code, label).toBe("VALIDATION_ERROR");
    }
    expect((await loginOverApi(account.email, account.password)).status).toBe(
      200
    );
  }
);

test.describe("rate limit", () => {
  // Counters must survive from one request to the next inside this test.
  test.use({ keepRateLimits: true });

  test(
    "Change password is throttled after five attempts",
    { tag: ["@TC-PASSWORD-025"] },
    async ({ newApi }) => {
      const account = await createAccount({ tag: "cp-ratelimit" });
      const me = await signedIn(
        await newApi(),
        account.email,
        account.password
      );
      try {
        const attempt = () =>
          me.changePassword.submit({
            currentPassword: "WrongPass@123",
            newPassword: NEW_PASSWORD,
            confirmPassword: NEW_PASSWORD
          });
        // The key is ip + this throwaway's authId, so nothing else shares it.
        for (let i = 1; i <= 5; i++) {
          expect((await attempt()).status(), `attempt ${i}`).toBe(400);
        }
        expect((await attempt()).status()).toBe(429);
      } finally {
        await clearRateLimits();
      }
    }
  );
});
