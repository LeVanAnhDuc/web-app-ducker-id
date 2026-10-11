import { test, expect } from "@fixtures";
import { createAccount } from "@helpers/accounts";
import { clearRateLimits } from "@helpers/redis";
import {
  bearerContext,
  decodeJwt,
  loginOverApi,
  refreshStatus
} from "@helpers/password";

// PATCH /api/v1/auth/change-password — contract, authorisation, session
// revocation and rate limiting. Test cases: test-cases/password.md
// (TC-PWD-019 … TC-PWD-025). Every request runs as a throwaway account
// (createAccount), so the seeded user@test.com keeps its password.
//
// The limiter (5 / 15 min, keyed ip + authId) sits in front of validation
// and counts every attempt, so no test sends more than five PATCHes per
// account without clearing the counters.

test.use({ role: "guest" });

const PATH = "/api/v1/auth/change-password";
const NEW_PASSWORD = "Changed@123";

interface ErrorBody {
  code?: string;
  message?: string;
  errors?: { field: string; reason: string; message: string }[];
}

async function sessionFor(email: string, password: string) {
  const login = await loginOverApi(email, password);
  expect(login.status, `login ${email}`).toBe(200);
  return { login, api: await bearerContext(login.accessToken!) };
}

test(
  "changing the password returns a fresh session; old password stops working",
  { tag: ["@TC-PWD-023"] },
  async () => {
    const account = await createAccount({ tag: "cp-happy" });
    const { api } = await sessionFor(account.email, account.password);
    try {
      const res = await api.patch(PATH, {
        data: {
          currentPassword: account.password,
          newPassword: NEW_PASSWORD,
          confirmPassword: NEW_PASSWORD
        }
      });
      expect(res.status()).toBe(200);
      const body = (await res.json()) as {
        data: { accessToken: string; idToken: string; expiresIn: number };
      };
      expect(body.data.accessToken).toBeTruthy();
      expect(decodeJwt(body.data.idToken).mustChangePassword).toBe(false);
      expect(
        res.headers()["set-cookie"] ?? "",
        "a rotated refresh cookie for this device"
      ).toContain("refreshToken=");

      // The returned access token is usable.
      const fresh = await bearerContext(body.data.accessToken);
      expect((await fresh.get("/api/v1/users/me")).status()).toBe(200);
      await fresh.dispose();

      expect((await loginOverApi(account.email, account.password)).status).toBe(
        401
      );
      expect((await loginOverApi(account.email, NEW_PASSWORD)).status).toBe(
        200
      );
    } finally {
      await api.dispose();
    }
  }
);

test(
  "a refresh token issued before the change is rejected afterwards",
  { tag: ["@TC-PWD-019", "@smoke"] },
  async () => {
    const account = await createAccount({ tag: "cp-revoke" });
    // "Other device": logged in before the change.
    const other = await loginOverApi(account.email, account.password);
    expect(other.refreshToken).toBeTruthy();
    expect(await refreshStatus(other.refreshToken!)).toBe(200);

    const { api } = await sessionFor(account.email, account.password);
    try {
      const res = await api.patch(PATH, {
        data: {
          currentPassword: account.password,
          newPassword: NEW_PASSWORD,
          confirmPassword: NEW_PASSWORD
        }
      });
      expect(res.status()).toBe(200);
    } finally {
      await api.dispose();
    }

    // tokenVersion was bumped → the other device's refresh is refused.
    expect(await refreshStatus(other.refreshToken!)).toBe(403);
  }
);

test(
  "a request without a bearer token is refused before anything else",
  { tag: ["@TC-PWD-020"] },
  async ({ guestApi }) => {
    const res = await guestApi.patch(PATH, {
      data: {
        currentPassword: "Whatever@123",
        newPassword: NEW_PASSWORD,
        confirmPassword: NEW_PASSWORD
      }
    });
    expect(res.status()).toBe(401);
    expect(((await res.json()) as ErrorBody).code).toBe("AUTH_MISSING_TOKEN");
  }
);

// Decision table — current correct? × new valid? × confirm matches? × new ≠ current?
test.describe("Change password API — decision table", () => {
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

  test(
    "each failing rule is rejected with its own code and the password is unchanged",
    { tag: ["@TC-PWD-021"] },
    async () => {
      const account = await createAccount({ tag: "cp-dt" });
      const { api } = await sessionFor(account.email, account.password);
      try {
        for (const row of rows) {
          const res = await api.patch(PATH, {
            data: row.body(account.password)
          });
          expect(res.status(), row.rule).toBe(row.status);
          const body = (await res.json()) as ErrorBody;
          expect(body.code, row.rule).toBe(row.code);
          if (row.field) {
            expect(
              body.errors?.map((e) => e.field),
              row.rule
            ).toContain(row.field);
          }
        }
      } finally {
        await api.dispose();
      }
      expect((await loginOverApi(account.email, account.password)).status).toBe(
        200
      );
    }
  );

  // BVA on the new password length: 7 / 8 / 128 / 129.
  const lengths: ReadonlyArray<{ len: number; ok: boolean }> = [
    { len: 7, ok: false },
    { len: 8, ok: true },
    { len: 128, ok: true },
    { len: 129, ok: false }
  ];
  for (const { len, ok } of lengths) {
    test(
      `new password of ${len} characters is ${ok ? "accepted" : "rejected"}`,
      { tag: ["@TC-PWD-022"] },
      async () => {
        const account = await createAccount({ tag: `cp-len${len}` });
        const candidate = "Ab@3" + "x".repeat(len - 4);
        expect(candidate).toHaveLength(len);
        const { api } = await sessionFor(account.email, account.password);
        try {
          const res = await api.patch(PATH, {
            data: {
              currentPassword: account.password,
              newPassword: candidate,
              confirmPassword: candidate
            }
          });
          expect(res.status()).toBe(ok ? 200 : 400);
        } finally {
          await api.dispose();
        }
      }
    );
  }

  test(
    "the wrong-current error message is translated, not an i18n key",
    { tag: ["@TC-PWD-024"] },
    async () => {
      // BUG: BUG-018 — server i18n never loads the `changePassword` namespace
      // (server/src/i18n/config.ts `ns` list), so messages come back as
      // the raw key "errors.wrongCurrentPassword".
      test.fail();
      const account = await createAccount({ tag: "cp-i18n" });
      const { api } = await sessionFor(account.email, account.password);
      try {
        const res = await api.patch(PATH, {
          data: {
            currentPassword: "WrongPass@123",
            newPassword: NEW_PASSWORD,
            confirmPassword: NEW_PASSWORD
          }
        });
        expect(res.status()).toBe(400);
        expect(((await res.json()) as ErrorBody).message).toBe(
          "Current password is incorrect"
        );
      } finally {
        await api.dispose();
      }
    }
  );
});

test.describe("Change password API — rate limit", () => {
  // Counters must survive from one request to the next inside this test.
  test.use({ keepRateLimits: true });

  test(
    "the 6th attempt inside the window is throttled (429)",
    { tag: ["@TC-PWD-025"] },
    async () => {
      const account = await createAccount({ tag: "cp-ratelimit" });
      const { api } = await sessionFor(account.email, account.password);
      try {
        const attempt = () =>
          api.patch(PATH, {
            data: {
              currentPassword: "WrongPass@123",
              newPassword: NEW_PASSWORD,
              confirmPassword: NEW_PASSWORD
            }
          });
        // The key is ip + this throwaway's authId, so nothing else shares it.
        for (let i = 1; i <= 5; i++) {
          expect((await attempt()).status(), `attempt ${i}`).toBe(400);
        }
        expect((await attempt()).status()).toBe(429);
      } finally {
        await api.dispose();
        await clearRateLimits();
      }
    }
  );
});
