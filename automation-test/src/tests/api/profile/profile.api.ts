import { test, expect } from "@/fixtures";
import { createApiClient, type ApiClient } from "@/api";
import { dataOf, errorOf, sessionOf } from "@/api/response";
import type { MyProfile, PublicProfile } from "@/api/user.client";
import { loginOverApi } from "@/api/session";
import { USER } from "@/config/accounts";
import { serverMessage } from "@/data/copy";
import { MALFORMED_USER_ID, UNKNOWN_USER_ID } from "@/data/test-data";
import { createAccount, type Account } from "@/utils/accounts";
import { isoDateFromToday } from "@/utils/dates";
import { clearRateLimits } from "@/utils/redis";

// /users/me (GET / PATCH) and /users/:id — contract, authorisation, the Joi
// rules in server/src/validators/schemas/user.ts and the update limiter.
// Test cases: test-cases/profile.md (TC-PROFILE-030 … TC-PROFILE-046).
// Reads use the seeded user (read-only); every PATCH goes to a throwaway
// account.
//
// PATCH is rate-limited per IP (10 / 15 min, counted before the guard).
// Counters are cleared before each test, and no test here except the
// rate-limit one sends more than eight PATCHes.

test.use({ role: "guest" });

/** Signs the account in on a fresh context and returns its Bearer `users` client. */
async function usersOf(newApi: () => Promise<ApiClient>, account: Account) {
  const api = await newApi();
  const session = await sessionOf(
    await api.auth.login(account.email, account.password)
  );
  return api.as(session).users;
}

type Users = Awaited<ReturnType<typeof usersOf>>;

/** Sends each body, asserting 200 / 400 (+ failing field) per row. */
async function expectRows(
  users: Users,
  rows: ReadonlyArray<{
    label: string;
    body: unknown;
    ok: boolean;
    field?: string;
  }>
) {
  for (const row of rows) {
    const res = await users.updateMe(row.body);
    expect(res.status(), row.label).toBe(row.ok ? 200 : 400);
    if (!row.ok) {
      const body = await errorOf(res);
      expect(body.code, row.label).toBe("VALIDATION_ERROR");
      if (row.field)
        expect(
          body.errors?.map((e) => e.field),
          row.label
        ).toContain(row.field);
    }
  }
}

test.describe("read", () => {
  test(
    "GET /users/me returns the profile and nothing sensitive",
    { tag: ["@TC-PROFILE-030", "@smoke"] },
    async ({ userApi }) => {
      const res = await createApiClient(userApi).users.me();
      expect(res.status()).toBe(200);
      const data = await dataOf<Record<string, unknown>>(res);
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
      expect(data.email).toBe(USER.email);
      expect(JSON.stringify(data)).not.toMatch(/password|authId|tokenVersion/i);
    }
  );

  test(
    "The profile endpoints need a session",
    { tag: ["@TC-PROFILE-031", "@smoke"] },
    async ({ newApi }) => {
      const users = (await newApi()).users;
      const get = await users.me();
      expect(get.status()).toBe(401);
      expect((await errorOf(get)).code).toBe("AUTH_MISSING_TOKEN");
      const patch = await users.updateMe({ fullName: "Nobody" });
      expect(patch.status()).toBe(401);
    }
  );

  test(
    "GET /users/:id returns only the public profile",
    { tag: ["@TC-PROFILE-041", "@smoke"] },
    async ({ userApi, newApi }) => {
      const me = await dataOf<MyProfile>(
        await createApiClient(userApi).users.me()
      );
      const res = await (await newApi()).users.publicProfile(me._id);
      expect(res.status()).toBe(200);
      const data = await dataOf<PublicProfile>(res);
      expect(Object.keys(data).sort()).toEqual(
        ["_id", "avatar", "fullName", "gender"].sort()
      );
      expect(data).toMatchObject({
        _id: me._id,
        fullName: me.fullName,
        gender: me.gender
      });
      expect(JSON.stringify(data)).not.toMatch(
        /email|phone|address|dateOfBirth|password|authId|roles/i
      );
    }
  );

  test(
    "GET /users/:id refuses a malformed id and answers 404 for an unknown one",
    { tag: ["@TC-PROFILE-042"] },
    async ({ newApi }) => {
      const users = (await newApi()).users;

      const malformed = await users.publicProfile(MALFORMED_USER_ID);
      expect(malformed.status()).toBe(400);
      const bad = await errorOf(malformed);
      expect(bad.code).toBe("VALIDATION_ERROR");
      expect(bad.errors?.find((e) => e.field === "id")?.message).toBe(
        serverMessage.user.errors.invalidId
      );

      const unknown = await users.publicProfile(UNKNOWN_USER_ID);
      expect(unknown.status()).toBe(404);
      const missing = await errorOf(unknown);
      expect(missing.code).toBe("USER_NOT_FOUND");
      expect(missing.message).toBe(serverMessage.user.errors.notFound);
    }
  );
});

test.describe("update", () => {
  test(
    "PATCH saves every editable field",
    { tag: ["@TC-PROFILE-032", "@smoke"] },
    async ({ newApi }) => {
      const account = await createAccount({ tag: "pfa-happy" });
      const users = await usersOf(newApi, account);
      const body = {
        fullName: "Tran Thi Mai",
        phone: "+84 90 123 4567",
        address: "12 Ly Thai To, Hoan Kiem",
        dateOfBirth: "1990-03-15",
        gender: "female"
      };
      const res = await users.updateMe(body);
      expect(res.status()).toBe(200);
      const data = await dataOf<MyProfile>(res);
      expect(data).toMatchObject({
        fullName: body.fullName,
        phone: body.phone,
        address: body.address,
        gender: body.gender,
        email: account.email
      });
      expect(String(data.dateOfBirth)).toMatch(/^1990-03-15/);

      const again = await dataOf<MyProfile>(await users.me());
      expect(again).toMatchObject({
        fullName: body.fullName,
        phone: body.phone
      });
    }
  );

  test(
    "Non-profile fields in the body are ignored",
    { tag: ["@TC-PROFILE-038", "@smoke"] },
    async ({ newApi }) => {
      const account = await createAccount({ tag: "pfa-mass" });
      const users = await usersOf(newApi, account);
      const res = await users.updateMe({
        fullName: "Still Me",
        email: "hijack@e2e.example.com",
        roles: "admin",
        password: "Hijacked@123"
      });
      expect(res.status()).toBe(200);
      const data = await dataOf<MyProfile>(res);
      expect(data.email).toBe(account.email);
      expect(data.fullName).toBe("Still Me");

      expect((await loginOverApi(account.email, account.password)).status).toBe(
        200
      );
      expect((await loginOverApi(account.email, "Hijacked@123")).status).toBe(
        401
      );
    }
  );

  test(
    "An empty update changes nothing",
    { tag: ["@TC-PROFILE-046"] },
    async ({ newApi }) => {
      const account = await createAccount({ tag: "pfa-empty" });
      const users = await usersOf(newApi, account);
      const before = await dataOf<MyProfile>(await users.me());
      const res = await users.updateMe({});
      expect(res.status()).toBe(200);
      expect(await dataOf<MyProfile>(res)).toEqual(before);
    }
  );
});

test.describe("validation", () => {
  test("fullName rules", { tag: ["@TC-PROFILE-033"] }, async ({ newApi }) => {
    const users = await usersOf(
      newApi,
      await createAccount({ tag: "pfa-name" })
    );
    await expectRows(users, [
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
  });

  test("phone rules", { tag: ["@TC-PROFILE-034"] }, async ({ newApi }) => {
    const users = await usersOf(
      newApi,
      await createAccount({ tag: "pfa-phone" })
    );
    await expectRows(users, [
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
  });

  test("address rules", { tag: ["@TC-PROFILE-035"] }, async ({ newApi }) => {
    const users = await usersOf(
      newApi,
      await createAccount({ tag: "pfa-addr" })
    );
    await expectRows(users, [
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
  });

  test(
    "dateOfBirth rules",
    { tag: ["@TC-PROFILE-036"] },
    async ({ newApi }) => {
      const users = await usersOf(
        newApi,
        await createAccount({ tag: "pfa-dob" })
      );
      await expectRows(users, [
        {
          label: "tomorrow",
          body: { dateOfBirth: isoDateFromToday(0, 1) },
          ok: false,
          field: "dateOfBirth"
        },
        {
          label: "12 years ago",
          body: { dateOfBirth: isoDateFromToday(-12) },
          ok: false,
          field: "dateOfBirth"
        },
        {
          label: "119 years ago",
          body: { dateOfBirth: isoDateFromToday(-119) },
          ok: true
        },
        {
          label: "121 years ago",
          body: { dateOfBirth: isoDateFromToday(-121) },
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
    }
  );

  test("gender rules", { tag: ["@TC-PROFILE-037"] }, async ({ newApi }) => {
    const users = await usersOf(
      newApi,
      await createAccount({ tag: "pfa-gender" })
    );
    await expectRows(users, [
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
  });

  test(
    "Wrong types and injection shapes are refused without a server error",
    { tag: ["@TC-PROFILE-044"] },
    async ({ newApi }) => {
      const users = await usersOf(
        newApi,
        await createAccount({ tag: "pfa-types" })
      );
      await expectRows(users, [
        {
          label: "operator object as fullName",
          body: { fullName: { $ne: "" } },
          ok: false,
          field: "fullName"
        },
        {
          label: "markup in fullName",
          body: { fullName: "<b>Linh</b>" },
          ok: false,
          field: "fullName"
        },
        {
          label: "number as phone",
          body: { phone: 912345678 },
          ok: false,
          field: "phone"
        },
        {
          label: "array as gender",
          body: { gender: ["male"] },
          ok: false,
          field: "gender"
        }
      ]);
    }
  );

  test(
    "A whitespace-only full name is refused",
    { tag: ["@TC-PROFILE-045"] },
    async ({ newApi }) => {
      // updateProfileSchema trims before it checks, so "   " is an empty
      // name (fixed BUG-PROFILE-05).
      const users = await usersOf(
        newApi,
        await createAccount({ tag: "pfa-blank" })
      );
      await expectRows(users, [
        {
          label: "spaces only",
          body: { fullName: "   " },
          ok: false,
          field: "fullName"
        }
      ]);
    }
  );

  test(
    "Validation messages follow Accept-Language",
    { tag: ["@TC-PROFILE-039"] },
    async ({ newApi }) => {
      const account = await createAccount({ tag: "pfa-i18n" });
      const users = await usersOf(newApi, account);
      const enBody = await errorOf(
        await users.updateMe({ phone: "abc" }, { "Accept-Language": "en" })
      );
      const viBody = await errorOf(
        await users.updateMe({ phone: "abc" }, { "Accept-Language": "vi" })
      );
      expect(enBody.code).toBe("VALIDATION_ERROR");
      expect(viBody.code).toBe("VALIDATION_ERROR");
      expect(viBody.message).not.toBe(enBody.message);
      for (const body of [enBody, viBody]) {
        expect(body.errors?.[0]?.message).not.toMatch(/^validation[:.]/);
      }
    }
  );

  test(
    "A date of birth accepted at sign-up is accepted again",
    { tag: ["@TC-PROFILE-040"] },
    async ({ newApi }) => {
      // sign-up and updateProfileSchema share the 13–120 range, so resending
      // the stored value — what the profile form does on every save — is
      // accepted (fixed BUG-PROFILE-01).
      const account = await createAccount({
        tag: "pfa-elder",
        fullName: "Elder Tester",
        dateOfBirth: isoDateFromToday(-110)
      });
      const users = await usersOf(newApi, account);
      const nameOnly = await users.updateMe({ fullName: "Elder Renamed" });
      expect(nameOnly.status()).toBe(200);
      const data = await dataOf<{ dateOfBirth: string }>(nameOnly);
      const resend = await users.updateMe({
        fullName: "Elder Renamed",
        dateOfBirth: data.dateOfBirth.slice(0, 10)
      });
      expect(resend.status()).toBe(200);
    }
  );
});

test.describe("rate limit", () => {
  // Counters must survive from one request to the next inside this test.
  test.use({ keepRateLimits: true });

  test(
    "Profile updates are throttled after ten requests",
    { tag: ["@TC-PROFILE-043"] },
    async ({ newApi }) => {
      // keepRateLimits skips the per-test reset: clear once before signing
      // up, so neither sign-up nor this bucket (keyed by IP alone) starts full.
      await clearRateLimits();
      const account = await createAccount({ tag: "pfa-ratelimit" });
      const users = await usersOf(newApi, account);
      try {
        for (let i = 1; i <= 10; i++) {
          const res = await users.updateMe({
            fullName: `Rate Limit ${"x".repeat(i)}`
          });
          expect(res.status(), `update ${i}`).toBe(200);
        }
        const over = await users.updateMe({ fullName: "One Too Many" });
        expect(over.status()).toBe(429);
        const body = await errorOf(over);
        expect(body.code).toBe("TOO_MANY_REQUESTS");
        expect(body.message).toBe(serverMessage.user.errors.rateLimitExceeded);
      } finally {
        await clearRateLimits();
      }
    }
  );
});
