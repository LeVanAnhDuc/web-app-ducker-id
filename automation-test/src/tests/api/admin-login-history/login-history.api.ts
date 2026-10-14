import { test, expect } from "@/fixtures";
import type { APIRequestContext } from "@playwright/test";
import { createApiClient } from "@/api";
import type {
  AdminLoginHistoryItem,
  AdminLoginHistoryPage,
  AdminLoginHistoryQuery
} from "@/api/admin-login-history.client";
import { dataOf, errorOf } from "@/api/response";
import { serverMessage } from "@/data/copy";
import { createAccount } from "@/utils/accounts";
import {
  authIdOf,
  passwordLogin,
  waitForAttempts
} from "@/utils/login-history";

// GET /admin/login-history and /:id — contract, filters, sorting, validation,
// pagination and access control. The filter cases sign a throwaway account
// in (one success, one wrong password) so the expected rows are known.
//
// Note: `userId` on a login-history row (and the `userId` filter) is the
// account's AUTH id (`auths._id`, the model ref), not the `users._id` that
// GET /admin/users returns — `authIdOf()` resolves it.
// Test cases: test-cases/admin-login-history.md.

const EN = { "Accept-Language": "en" };
const UNKNOWN_ID = "000000000000000000000000";
const WRONG = "Wrong@Password1";

const historyOf = (ctx: APIRequestContext) =>
  createApiClient(ctx).adminLoginHistory;

const list = async (
  api: APIRequestContext,
  params: AdminLoginHistoryQuery = {}
): Promise<AdminLoginHistoryPage> => {
  const res = await historyOf(api).list(params);
  expect(res.status(), `list ${JSON.stringify(params)}`).toBe(200);
  return dataOf<AdminLoginHistoryPage>(res);
};

/**
 * A throwaway account with one successful and one failed password sign-in,
 * both recorded. Returns its email and auth id.
 */
const accountWithTwoAttempts = async (
  adminApi: APIRequestContext,
  guestApi: APIRequestContext,
  tag: string
) => {
  const acc = await createAccount({ tag });
  expect((await passwordLogin(guestApi, acc.email, acc.password)).ok()).toBe(
    true
  );
  expect((await passwordLogin(guestApi, acc.email, WRONG)).ok()).toBe(false);
  const userId = await authIdOf(acc.email);
  await waitForAttempts(adminApi, userId, 2);
  return { email: acc.email, userId };
};

test(
  "List API contract",
  { tag: ["@TC-ADMINLOGINHISTORY-030", "@smoke"] },
  async ({ adminApi }) => {
    const res = await historyOf(adminApi).list({ limit: 100 });
    expect(res.status()).toBe(200);
    const body = (await res.json()) as {
      timestamp: string;
      path: string;
      data: AdminLoginHistoryPage;
    };
    expect(body.timestamp).toBeTruthy();
    expect(body.path).toContain("/admin/login-history");
    const { items, meta } = body.data;
    expect(meta).toMatchObject({ page: 1, limit: 100 });
    expect(meta.totalPages).toBe(Math.ceil(meta.total / meta.limit));
    expect(items.length).toBeGreaterThan(0);
    for (const it of items) {
      expect(it._id).toMatch(/^[a-f0-9]{24}$/);
      expect(["success", "failed"]).toContain(it.status);
      expect(["idp", "oauth"]).toContain(it.source);
      expect(typeof it.interactive).toBe("boolean");
      expect(it).toHaveProperty("usernameAttempted");
      expect(it).toHaveProperty("app");
    }
    // Newest first by default.
    const times = items.map((i) => Date.parse(i.createdAt));
    expect([...times].sort((a, b) => b - a)).toEqual(times);
    expect(new Set(items.map((i) => i.usernameAttempted)).size).toBeGreaterThan(
      1
    );
  }
);

test.describe("filters", () => {
  // [DT] userId × status / method / source / ip / date for one known account.
  test.describe(
    "Filters return exactly the matching attempts",
    { tag: "@TC-ADMINLOGINHISTORY-031" },
    () => {
      test("userId, status, method and ip filters return exactly the matching rows", async ({
        adminApi,
        guestApi
      }) => {
        const { email, userId } = await accountWithTwoAttempts(
          adminApi,
          guestApi,
          "adm-loghist"
        );
        const mine = await list(adminApi, { userId });
        const ofMine = mine.items.filter((i) => i.usernameAttempted === email);
        expect(ofMine.length).toBe(mine.items.length);
        expect(mine.items.map((i) => i.status).sort()).toEqual([
          "failed",
          "success"
        ]);

        const cases: [Record<string, string>, number][] = [
          [{ userId, status: "success" }, 1],
          [{ userId, status: "failed" }, 1],
          [{ userId, method: "password" }, 2],
          [{ userId, method: "otp" }, 0],
          [{ userId, source: "idp" }, 2],
          [{ userId, source: "oauth" }, 0]
        ];
        for (const [params, n] of cases) {
          const page = await list(adminApi, params);
          expect(page.items.length, JSON.stringify(params)).toBe(n);
          expect(page.meta.total).toBe(n);
        }

        const failed = (await list(adminApi, { userId, status: "failed" }))
          .items[0];
        expect(failed.failReason).toBeTruthy();
        const byIp = await list(adminApi, { userId, ip: failed.ip });
        expect(byIp.items.length).toBe(2);
      });

      test("a date window in the past returns nothing for a new account", async ({
        adminApi,
        guestApi
      }) => {
        const acc = await createAccount({ tag: "adm-loghist-date" });
        await passwordLogin(guestApi, acc.email, acc.password);
        const userId = await authIdOf(acc.email);
        const day = (offset: number) =>
          new Date(Date.now() + offset * 86_400_000).toISOString().slice(0, 10);
        await expect
          .poll(async () => (await list(adminApi, { userId })).meta.total, {
            timeout: 10_000
          })
          .toBeGreaterThan(0);
        const past = await list(adminApi, {
          userId,
          fromDate: "2020-01-01",
          toDate: "2020-12-31"
        });
        expect(past.items).toEqual([]);
        const now = await list(adminApi, {
          userId,
          fromDate: day(-1),
          toDate: day(1)
        });
        expect(now.items.length).toBeGreaterThan(0);
      });
    }
  );

  // [EP] text filters: partial, any case, padded with spaces, and literal —
  // a regex metacharacter is matched as itself, never as a pattern.
  test(
    "Text filters match partially, in any case and literally",
    { tag: "@TC-ADMINLOGINHISTORY-039" },
    async ({ adminApi, guestApi }) => {
      const { userId } = await accountWithTwoAttempts(
        adminApi,
        guestApi,
        "adm-loghist-text"
      );
      const [row] = (await list(adminApi, { userId })).items;
      for (const field of ["country", "city", "os", "browser", "ip"] as const) {
        const value = row[field];
        const part = value.slice(0, Math.max(1, Math.ceil(value.length / 2)));
        for (const probe of [
          value,
          part.toLowerCase(),
          part.toUpperCase(),
          `  ${value}  `
        ]) {
          const page = await list(adminApi, { userId, [field]: probe });
          expect(page.meta.total, `${field}=${JSON.stringify(probe)}`).toBe(2);
        }
        const literal = await list(adminApi, { userId, [field]: ".*" });
        expect(literal.meta.total, `${field}=".*"`).toBe(0);
      }
    }
  );

  // [EP] enum, boolean and id filters: the account's own value vs another one.
  test(
    "Device, client, interactive and app filters narrow to the matching attempts",
    { tag: "@TC-ADMINLOGINHISTORY-048" },
    async ({ adminApi, guestApi }) => {
      const { userId } = await accountWithTwoAttempts(
        adminApi,
        guestApi,
        "adm-loghist-enum"
      );
      const [row] = (await list(adminApi, { userId })).items;
      const otherDevice = row.deviceType === "TABLET" ? "MOBILE" : "TABLET";
      const otherClient =
        row.clientType === "MOBILE_IOS" ? "MOBILE_ANDROID" : "MOBILE_IOS";
      const cases: [AdminLoginHistoryQuery, number][] = [
        [{ userId, deviceType: row.deviceType }, 2],
        [{ userId, deviceType: otherDevice }, 0],
        [{ userId, clientType: row.clientType }, 2],
        [{ userId, clientType: otherClient }, 0],
        [{ userId, interactive: true }, 2],
        [{ userId, interactive: false }, 0],
        [{ userId, webAppId: "0123456789abcdef0123abcd" }, 0]
      ];
      for (const [params, n] of cases) {
        const page = await list(adminApi, params);
        expect(page.meta.total, JSON.stringify(params)).toBe(n);
      }
    }
  );

  // [BVA] a date with no time is the whole day: from = to = the day of the
  // attempts includes them; the day before / after excludes them.
  test(
    "A date-only window covers the whole day",
    { tag: "@TC-ADMINLOGINHISTORY-040" },
    async ({ adminApi, guestApi }) => {
      const { userId } = await accountWithTwoAttempts(
        adminApi,
        guestApi,
        "adm-loghist-day"
      );
      const [row] = (await list(adminApi, { userId })).items;
      const created = new Date(row.createdAt);
      const iso = (d: Date) => d.toISOString().slice(0, 10);
      const day = iso(created);
      const shift = (n: number) =>
        iso(new Date(Date.parse(`${day}T12:00:00.000Z`) + n * 86_400_000));

      const same = await list(adminApi, { userId, fromDate: day, toDate: day });
      expect(same.meta.total).toBe(2);
      const before = await list(adminApi, {
        userId,
        fromDate: shift(-1),
        toDate: shift(-1)
      });
      expect(before.meta.total).toBe(0);
      const after = await list(adminApi, { userId, fromDate: shift(1) });
      expect(after.meta.total).toBe(0);
    }
  );
});

// [EP] sortBy × sortOrder — the admin API sorts on its own fields.
test.describe(
  "The list sorts by the requested field and order",
  { tag: "@TC-ADMINLOGINHISTORY-038" },
  () => {
    test("sortBy=usernameAttempted&sortOrder=asc orders usernames A→Z", async ({
      adminApi
    }) => {
      const { items } = await list(adminApi, {
        sortBy: "usernameAttempted",
        sortOrder: "asc",
        limit: 100
      });
      const names = items.map((i) => i.usernameAttempted);
      expect(names.length).toBeGreaterThan(1);
      expect([...names].sort()).toEqual(names);
    });

    test("sortBy=createdAt&sortOrder=asc puts the oldest first", async ({
      adminApi
    }) => {
      const { items } = await list(adminApi, {
        sortBy: "createdAt",
        sortOrder: "asc",
        limit: 100
      });
      const times = items.map((i) => Date.parse(i.createdAt));
      expect([...times].sort((a, b) => a - b)).toEqual(times);
    });

    test("sortBy=ip&sortOrder=desc orders addresses Z→A", async ({
      adminApi
    }) => {
      const { items } = await list(adminApi, {
        sortBy: "ip",
        sortOrder: "desc",
        limit: 100
      });
      const ips = items.map((i) => i.ip);
      expect([...ips].sort().reverse()).toEqual(ips);
    });
  }
);

test.describe("query validation", () => {
  // [EP]/[BVA] one row per class.
  const cases: [Record<string, string | number>, number][] = [
    [{ page: 0 }, 400],
    [{ page: 1 }, 200],
    [{ limit: 0 }, 400],
    [{ limit: 1 }, 200],
    [{ limit: 100 }, 200],
    [{ limit: 101 }, 400],
    [{ status: "pending" }, 400],
    [{ method: "telepathy" }, 400],
    [{ deviceType: "TOASTER" }, 400],
    [{ deviceType: "MOBILE" }, 200],
    [{ source: "sideways" }, 400],
    [{ userId: "not-an-id" }, 400],
    [{ webAppId: "123" }, 400],
    [{ interactive: "maybe" }, 400],
    [{ fromDate: "yesterday" }, 400],
    [{ fromDate: "2026-02-01", toDate: "2026-01-01" }, 400],
    [{ fromDate: "2026-01-01", toDate: "2026-01-01" }, 200],
    [{ sortBy: "password" }, 400],
    [{ ip: "x".repeat(201) }, 400]
  ];
  test.describe(
    "List query validation",
    { tag: "@TC-ADMINLOGINHISTORY-032" },
    () => {
      for (const [params, status] of cases) {
        test(`${JSON.stringify(params).slice(0, 60)} → ${status}`, async ({
          adminApi
        }) => {
          const res = await historyOf(adminApi).list(params);
          expect(res.status()).toBe(status);
          if (status === 400)
            expect((await errorOf(res)).code).toBe("VALIDATION_ERROR");
        });
      }
    }
  );

  // [BVA] text filters: 200 characters pass, 201 fail (ip 201 is in -032).
  test(
    "Text filters accept 200 characters and refuse 201",
    { tag: "@TC-ADMINLOGINHISTORY-041" },
    async ({ adminApi }) => {
      for (const field of ["ip", "country", "city", "os", "browser"]) {
        const ok = await historyOf(adminApi).list({ [field]: "x".repeat(200) });
        expect(ok.status(), `${field} × 200`).toBe(200);
        if (field === "ip") continue;
        const tooLong = await historyOf(adminApi).list({
          [field]: "x".repeat(201)
        });
        expect(tooLong.status(), `${field} × 201`).toBe(400);
        expect((await errorOf(tooLong)).code).toBe("VALIDATION_ERROR");
      }
    }
  );

  // [Security] Express parses `a[$ne]=x` into an object; every filter must
  // refuse it rather than hand an operator to MongoDB.
  test(
    "A query operator in a filter is refused",
    { tag: "@TC-ADMINLOGINHISTORY-042" },
    async ({ adminApi }) => {
      for (const raw of [
        "status[$ne]=success",
        "userId[$gt]=",
        "ip[$regex]=.*",
        "usernameAttempted[$exists]=true&country[$ne]=x"
      ]) {
        const res = await historyOf(adminApi).listRaw(raw);
        expect(res.status(), raw).toBe(400);
        expect((await errorOf(res)).code, raw).toBe("VALIDATION_ERROR");
      }
    }
  );

  // [EG] each invalid filter is named in `errors` with a readable message in
  // the caller's language — never the raw i18n key.
  const fieldErrors: {
    params: Record<string, string>;
    field: string;
    message?: string;
    bug?: true;
  }[] = [
    {
      params: { page: "0" },
      field: "page",
      message: serverMessage.validation.page.invalid
    },
    {
      params: { limit: "101" },
      field: "limit",
      message: serverMessage.validation.limit.invalid
    },
    {
      params: { status: "pending" },
      field: "status",
      message: serverMessage.validation.status.invalid
    },
    { params: { method: "telepathy" }, field: "method", bug: true },
    { params: { deviceType: "TOASTER" }, field: "deviceType", bug: true },
    { params: { clientType: "FRIDGE" }, field: "clientType", bug: true },
    {
      params: { source: "sideways" },
      field: "source",
      message: serverMessage.validation.source.invalid
    },
    { params: { userId: "not-an-id" }, field: "userId", bug: true },
    {
      params: { webAppId: "123" },
      field: "webAppId",
      message: serverMessage.validation.webAppId.invalid
    },
    {
      params: { interactive: "maybe" },
      field: "interactive",
      message: serverMessage.validation.interactive.invalid
    },
    { params: { fromDate: "yesterday" }, field: "fromDate", bug: true },
    { params: { toDate: "yesterday" }, field: "toDate", bug: true },
    {
      params: { fromDate: "2026-02-01", toDate: "2026-01-01" },
      field: "",
      bug: true
    },
    {
      params: { sortBy: "password" },
      field: "sortBy",
      message: serverMessage.validation.sortBy.invalid
    },
    {
      params: { sortOrder: "sideways" },
      field: "sortOrder",
      message: serverMessage.validation.sortOrder.invalid
    },
    {
      params: { country: "x".repeat(201) },
      field: "country",
      message: serverMessage.validation.search.invalid
    }
  ];
  test.describe(
    "Each invalid filter is named with a readable message",
    { tag: "@TC-ADMINLOGINHISTORY-043" },
    () => {
      for (const { params, field, message, bug } of fieldErrors) {
        test(`${JSON.stringify(params)} → errors[${field || "(query)"}]`, async ({
          adminApi
        }) => {
          if (bug) {
            // BUG: defects/admin-login-history.md#bug-adminloginhistory-02
            test.fail();
          }
          const res = await historyOf(adminApi).list(params, EN);
          expect(res.status()).toBe(400);
          const { code, errors } = await errorOf(res);
          expect(code).toBe("VALIDATION_ERROR");
          const entry = errors?.find((e) => e.field === field);
          expect(entry, `errors entry for "${field}"`).toBeTruthy();
          // A missing catalogue entry comes back as its key ("method.invalid").
          expect(entry!.message).not.toMatch(/^[\w:.]+\.invalid$/);
          if (message) expect(entry!.message).toBe(message);
        });
      }
    }
  );

  test(
    "Pagination boundaries",
    { tag: "@TC-ADMINLOGINHISTORY-035" },
    async ({ adminApi }) => {
      const first = await list(adminApi, { limit: 1 });
      expect(first.items).toHaveLength(1);
      expect(first.meta.totalPages).toBe(first.meta.total);
      const second = await list(adminApi, { limit: 1, page: 2 });
      expect(second.items).toHaveLength(1);
      expect(second.items[0]._id).not.toBe(first.items[0]._id);
      const past = await list(adminApi, {
        limit: 100,
        page: Math.ceil(first.meta.total / 100) + 1
      });
      expect(past.items).toEqual([]);
    }
  );
});

test.describe("detail", () => {
  test.describe(
    "Detail API contract and id errors",
    { tag: "@TC-ADMINLOGINHISTORY-033" },
    () => {
      test("GET /:id returns the record with its app source", async ({
        adminApi
      }) => {
        const [first] = (await list(adminApi, { limit: 1 })).items;
        const res = await historyOf(adminApi).detail(first._id);
        expect(res.status()).toBe(200);
        const detail = await dataOf<AdminLoginHistoryItem>(res);
        expect(detail._id).toBe(first._id);
        expect(detail.usernameAttempted).toBe(first.usernameAttempted);
        expect(detail).toHaveProperty("userAgent");
        expect(detail).toHaveProperty("source");
        expect(detail).toHaveProperty("app");
        expect(detail).toHaveProperty("interactive");
      });

      test("[EG] malformed id → 400, unknown id → 404", async ({
        adminApi
      }) => {
        const bad = await historyOf(adminApi).detail("not-an-id");
        expect(bad.status()).toBe(400);
        expect((await errorOf(bad)).code).toBe("VALIDATION_ERROR");
        const missing = await historyOf(adminApi).detail(UNKNOWN_ID);
        expect(missing.status()).toBe(404);
      });
    }
  );

  // [EG] the two id errors carry their own code and message.
  test(
    "Detail id errors carry their code and message",
    { tag: "@TC-ADMINLOGINHISTORY-037" },
    async ({ adminApi }) => {
      // BUG: defects/admin-login-history.md#bug-adminloginhistory-03
      test.fail();
      const bad = await historyOf(adminApi).detail("not-an-id", EN);
      expect(bad.status()).toBe(400);
      const badBody = await errorOf(bad);
      expect(badBody.code).toBe("VALIDATION_ERROR");
      expect(badBody.message).toBe(
        serverMessage.common.errors.validationFailed
      );
      expect(badBody.errors).toContainEqual(
        expect.objectContaining({
          field: "id",
          message: serverMessage.loginHistory.errors.invalidId
        })
      );

      const missing = await historyOf(adminApi).detail(UNKNOWN_ID, EN);
      expect(missing.status()).toBe(404);
      expect(await errorOf(missing)).toMatchObject({
        code: "LOGIN_HISTORY_NOT_FOUND",
        message: serverMessage.loginHistory.errors.notFound
      });
    }
  );
});

test(
  "List and detail answer with their success message",
  { tag: "@TC-ADMINLOGINHISTORY-036" },
  async ({ adminApi }) => {
    // BUG: defects/admin-users.md#bug-adminusers-04
    test.fail();
    const history = historyOf(adminApi);
    const listRes = await history.list({ limit: 1 }, EN);
    expect(listRes.status()).toBe(200);
    const listBody = (await listRes.json()) as {
      message: string;
      data: AdminLoginHistoryPage;
    };
    expect(listBody.message).toBe(
      serverMessage.loginHistory.success.getAllHistory
    );
    const detailRes = await history.detail(listBody.data.items[0]._id, EN);
    expect(detailRes.status()).toBe(200);
    expect(((await detailRes.json()) as { message: string }).message).toBe(
      serverMessage.loginHistory.success.getHistoryDetail
    );
  }
);

test(
  "Only admins reach the endpoints",
  { tag: ["@TC-ADMINLOGINHISTORY-034", "@smoke"] },
  async ({ guestApi, userApi }) => {
    for (const [name, call] of [
      ["list", (ctx: APIRequestContext) => historyOf(ctx).list()],
      ["detail", (ctx: APIRequestContext) => historyOf(ctx).detail(UNKNOWN_ID)]
    ] as const) {
      const guest = await call(guestApi);
      expect(guest.status(), name).toBe(401);
      expect((await errorOf(guest)).code).toBe("AUTH_MISSING_TOKEN");
      const user = await call(userApi);
      expect(user.status(), name).toBe(403);
      expect((await errorOf(user)).code).toBe("AUTH_ADMIN_ONLY");
    }
  }
);
