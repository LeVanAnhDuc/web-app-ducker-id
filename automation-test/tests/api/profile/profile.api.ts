import { test, expect } from "@fixtures";
import type { APIRequestContext } from "@playwright/test";
import { createAccount, type Account } from "@helpers/accounts";
import { bearerContext, loginOverApi } from "@helpers/password";
import { createAccountWithDob, isoDateFromToday } from "@helpers/profile";

// GET / PATCH /api/v1/users/me — contract, authorisation and the Joi rules in
// server/src/validators/schemas/user.ts. Test cases: test-cases/profile.md
// (TC-PROFILE-030 … TC-PROFILE-039). Reads use the seeded user (read-only);
// every PATCH goes to a throwaway account.
//
// PATCH is rate-limited per IP (10 / 15 min). Counters are cleared before
// each test, and no test here sends more than eight PATCHes.

const ME = "/api/v1/users/me";

interface ErrorBody {
  code?: string;
  message?: string;
  errors?: { field: string; reason: string; message: string }[];
}

async function meApi(account: Account): Promise<APIRequestContext> {
  const login = await loginOverApi(account.email, account.password);
  expect(login.status, `login ${account.email}`).toBe(200);
  return bearerContext(login.accessToken!);
}

/** Sends each body, asserting 200 / 400 (+ failing field) per row. */
async function expectRows(
  api: APIRequestContext,
  rows: ReadonlyArray<{
    label: string;
    body: object;
    ok: boolean;
    field?: string;
  }>
) {
  for (const row of rows) {
    const res = await api.patch(ME, { data: row.body });
    expect(res.status(), row.label).toBe(row.ok ? 200 : 400);
    if (!row.ok) {
      const body = (await res.json()) as ErrorBody;
      expect(body.code, row.label).toBe("VALIDATION_ERROR");
      if (row.field)
        expect(
          body.errors?.map((e) => e.field),
          row.label
        ).toContain(row.field);
    }
  }
}

test.describe("Profile API — read", () => {
  test(
    "GET /users/me returns the profile fields and nothing sensitive",
    { tag: ["@TC-PROFILE-030", "@smoke"] },
    async ({ userApi }) => {
      const res = await userApi.get(ME);
      expect(res.status()).toBe(200);
      const { data } = (await res.json()) as { data: Record<string, unknown> };
      expect(Object.keys(data).sort()).toEqual(
        [
          "_id",
          "address",
          "avatar",
          "createdAt",
          "dateOfBirth",
          "email",
          "fullName",
          "gender",
          "phone"
        ].sort()
      );
      expect(data.email).toBe("user@test.com");
      expect(JSON.stringify(data)).not.toMatch(/password|authId|tokenVersion/i);
    }
  );

  test(
    "GET and PATCH without a token are refused",
    { tag: ["@TC-PROFILE-031"] },
    async ({ guestApi }) => {
      const get = await guestApi.get(ME);
      expect(get.status()).toBe(401);
      expect(((await get.json()) as ErrorBody).code).toBe("AUTH_MISSING_TOKEN");
      const patch = await guestApi.patch(ME, { data: { fullName: "Nobody" } });
      expect(patch.status()).toBe(401);
    }
  );
});

test.describe("Profile API — update", () => {
  test(
    "PATCH saves every editable field and GET returns them",
    { tag: ["@TC-PROFILE-032"] },
    async () => {
      const account = await createAccount({ tag: "pfa-happy" });
      const api = await meApi(account);
      try {
        const body = {
          fullName: "Tran Thi Mai",
          phone: "+84 90 123 4567",
          address: "12 Ly Thai To, Hoan Kiem",
          dateOfBirth: "1990-03-15",
          gender: "female"
        };
        const res = await api.patch(ME, { data: body });
        expect(res.status()).toBe(200);
        const { data } = (await res.json()) as {
          data: Record<string, unknown>;
        };
        expect(data).toMatchObject({
          fullName: body.fullName,
          phone: body.phone,
          address: body.address,
          gender: body.gender,
          email: account.email
        });
        expect(String(data.dateOfBirth)).toMatch(/^1990-03-15/);

        const again = (await (await api.get(ME)).json()) as {
          data: Record<string, unknown>;
        };
        expect(again.data).toMatchObject({
          fullName: body.fullName,
          phone: body.phone
        });
      } finally {
        await api.dispose();
      }
    }
  );

  test(
    "fields outside the profile (email, role, password) are ignored",
    { tag: ["@TC-PROFILE-038"] },
    async () => {
      const account = await createAccount({ tag: "pfa-mass" });
      const api = await meApi(account);
      try {
        const res = await api.patch(ME, {
          data: {
            fullName: "Still Me",
            email: "hijack@e2e.example.com",
            roles: "admin",
            password: "Hijacked@123"
          }
        });
        expect(res.status()).toBe(200);
        const { data } = (await res.json()) as {
          data: Record<string, unknown>;
        };
        expect(data.email).toBe(account.email);
        expect(data.fullName).toBe("Still Me");
      } finally {
        await api.dispose();
      }
      expect((await loginOverApi(account.email, account.password)).status).toBe(
        200
      );
      expect((await loginOverApi(account.email, "Hijacked@123")).status).toBe(
        401
      );
    }
  );
});

test.describe("Profile API — validation", () => {
  test(
    "fullName: 2–100 letters, spaces, - ' . only",
    { tag: ["@TC-PROFILE-033"] },
    async () => {
      const api = await meApi(await createAccount({ tag: "pfa-name" }));
      try {
        await expectRows(api, [
          {
            label: "1 char",
            body: { fullName: "A" },
            ok: false,
            field: "fullName"
          },
          { label: "2 chars", body: { fullName: "An" }, ok: true },
          { label: "100 chars", body: { fullName: "a".repeat(100) }, ok: true },
          {
            label: "101 chars",
            body: { fullName: "a".repeat(101) },
            ok: false,
            field: "fullName"
          },
          {
            label: "digits",
            body: { fullName: "John 2" },
            ok: false,
            field: "fullName"
          },
          {
            label: "empty",
            body: { fullName: "" },
            ok: false,
            field: "fullName"
          },
          {
            label: "Vietnamese diacritics",
            body: { fullName: "Nguyễn Thị Ánh" },
            ok: true
          }
        ]);
      } finally {
        await api.dispose();
      }
    }
  );

  test(
    "phone: 1–20 of digits, spaces, ( ) + -",
    { tag: ["@TC-PROFILE-034"] },
    async () => {
      const api = await meApi(await createAccount({ tag: "pfa-phone" }));
      try {
        await expectRows(api, [
          { label: "empty", body: { phone: "" }, ok: false, field: "phone" },
          { label: "1 digit", body: { phone: "1" }, ok: true },
          { label: "20 chars", body: { phone: "1".repeat(20) }, ok: true },
          {
            label: "21 chars",
            body: { phone: "1".repeat(21) },
            ok: false,
            field: "phone"
          },
          {
            label: "letters",
            body: { phone: "090abc1234" },
            ok: false,
            field: "phone"
          },
          { label: "formatted", body: { phone: "+84 (90) 123-4567" }, ok: true }
        ]);
      } finally {
        await api.dispose();
      }
    }
  );

  test(
    "address: up to 500 chars, no markup characters",
    { tag: ["@TC-PROFILE-035"] },
    async () => {
      const api = await meApi(await createAccount({ tag: "pfa-addr" }));
      try {
        await expectRows(api, [
          { label: "500 chars", body: { address: "a".repeat(500) }, ok: true },
          {
            label: "501 chars",
            body: { address: "a".repeat(501) },
            ok: false,
            field: "address"
          },
          {
            label: "markup",
            body: { address: "<script>x</script>" },
            ok: false,
            field: "address"
          },
          {
            label: "street punctuation",
            body: { address: "12/3B, Le Loi St. #4" },
            ok: true
          }
        ]);
      } finally {
        await api.dispose();
      }
    }
  );

  test(
    "dateOfBirth: ISO date, not in the future, not more than 100 years ago",
    { tag: ["@TC-PROFILE-036"] },
    async () => {
      const api = await meApi(await createAccount({ tag: "pfa-dob" }));
      try {
        await expectRows(api, [
          {
            label: "tomorrow",
            body: { dateOfBirth: isoDateFromToday(0, 1) },
            ok: false,
            field: "dateOfBirth"
          },
          {
            label: "99 years ago",
            body: { dateOfBirth: isoDateFromToday(-99) },
            ok: true
          },
          {
            label: "101 years ago",
            body: { dateOfBirth: isoDateFromToday(-101) },
            ok: false,
            field: "dateOfBirth"
          },
          {
            label: "not a date",
            body: { dateOfBirth: "15/03/1990" },
            ok: false,
            field: "dateOfBirth"
          },
          {
            label: "30 years ago",
            body: { dateOfBirth: isoDateFromToday(-30) },
            ok: true
          }
        ]);
      } finally {
        await api.dispose();
      }
    }
  );

  test(
    "gender: one of male, female, other, prefer_not_to_say",
    { tag: ["@TC-PROFILE-037"] },
    async () => {
      const api = await meApi(await createAccount({ tag: "pfa-gender" }));
      try {
        await expectRows(api, [
          ...["male", "female", "other", "prefer_not_to_say"].map((g) => ({
            label: g,
            body: { gender: g },
            ok: true
          })),
          {
            label: "unknown",
            body: { gender: "unknown" },
            ok: false,
            field: "gender"
          }
        ]);
      } finally {
        await api.dispose();
      }
    }
  );

  test(
    "validation messages follow Accept-Language",
    { tag: ["@TC-PROFILE-039"] },
    async () => {
      const account = await createAccount({ tag: "pfa-i18n" });
      const login = await loginOverApi(account.email, account.password);
      const en = await bearerContext(login.accessToken!, {
        "Accept-Language": "en"
      });
      const vi = await bearerContext(login.accessToken!, {
        "Accept-Language": "vi"
      });
      try {
        const enBody = (await (
          await en.patch(ME, { data: { phone: "abc" } })
        ).json()) as ErrorBody;
        const viBody = (await (
          await vi.patch(ME, { data: { phone: "abc" } })
        ).json()) as ErrorBody;
        expect(enBody.code).toBe("VALIDATION_ERROR");
        expect(viBody.code).toBe("VALIDATION_ERROR");
        expect(viBody.message).not.toBe(enBody.message);
        for (const body of [enBody, viBody]) {
          expect(body.errors?.[0]?.message).not.toMatch(/^validation[:.]/);
        }
      } finally {
        await en.dispose();
        await vi.dispose();
      }
    }
  );

  test(
    "a date of birth accepted at sign-up (110 years ago) is accepted again by PATCH",
    { tag: ["@TC-PROFILE-040"] },
    async () => {
      // BUG: BUG-011 — sign-up allows ages 13–120 (validators/schemas/base.ts) but
      // updateProfileSchema caps dateOfBirth at 100 years, so resending the
      // stored value — what the profile form does on every save — is a 400.
      test.fail();
      const account = await createAccountWithDob(
        isoDateFromToday(-110),
        "pfa-elder"
      );
      const api = await meApi(account);
      try {
        const nameOnly = await api.patch(ME, {
          data: { fullName: "Elder Renamed" }
        });
        expect(nameOnly.status()).toBe(200);
        const { data } = (await nameOnly.json()) as {
          data: { dateOfBirth: string };
        };
        const resend = await api.patch(ME, {
          data: {
            fullName: "Elder Renamed",
            dateOfBirth: data.dateOfBirth.slice(0, 10)
          }
        });
        expect(resend.status()).toBe(200);
      } finally {
        await api.dispose();
      }
    }
  );
});
