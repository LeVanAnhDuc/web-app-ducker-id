import { test, expect } from "@/fixtures";
import type { APIRequestContext, APIResponse } from "@playwright/test";
import { createApiClient } from "@/api";
import type {
  AdminUserItem,
  AdminUsersPage,
  AdminUsersQuery
} from "@/api/admin-users.client";
import { dataOf, errorOf } from "@/api/response";
import { ADMIN_EMAIL, USER_EMAIL } from "@/config/accounts";
import { serverMessage, serverMessageVi } from "@/data/copy";
import { UNKNOWN_USER_ID } from "@/data/test-data";
import { createAccount } from "@/utils/accounts";
import { adminUserId, ownUserId } from "@/utils/admin-users";

// GET /admin/users — contract, query validation, filters, sorting, messages
// and access control. Test cases: test-cases/admin-users.md. Read-only except
// for the throwaway accounts the status-filter and message cases lock.

const adminUsersOf = (ctx: APIRequestContext) =>
  createApiClient(ctx).adminUsers;

/** The list on an admin context; `body` is null unless 2xx. */
const list = async (ctx: APIRequestContext, params: AdminUsersQuery = {}) => {
  const res = await adminUsersOf(ctx).list(params);
  return {
    res,
    body: res.ok() ? await dataOf<AdminUsersPage>(res) : null
  };
};

test(
  "List API contract",
  { tag: ["@TC-ADMINUSERS-022", "@smoke"] },
  async ({ adminApi }) => {
    const res = await adminUsersOf(adminApi).list();
    expect(res.status()).toBe(200);
    const body = (await res.json()) as {
      timestamp: string;
      path: string;
      message: string;
      data: AdminUsersPage;
    };
    expect(body.timestamp).toBeTruthy();
    expect(body.path).toContain("/admin/users");
    expect(typeof body.message).toBe("string");
    const { items, meta } = body.data;
    expect(items.length).toBeGreaterThan(0);
    expect(meta).toMatchObject({ page: 1, limit: 20 });
    expect(meta.totalPages).toBe(Math.ceil(meta.total / meta.limit));
    for (const u of items) {
      expect(u._id).toMatch(/^[a-f0-9]{24}$/);
      expect(["user", "admin"]).toContain(u.role);
      expect(typeof u.isActive).toBe("boolean");
      expect(u).toHaveProperty("lastLoginAt");
      expect(new Date(u.createdAt).toString()).not.toBe("Invalid Date");
      // Never leaks credentials or auth internals.
      expect(u).not.toHaveProperty("password");
      expect(u).not.toHaveProperty("authId");
    }
    // Newest first, so seeded accounts may be past page 1; narrow to them.
    const seeded = await list(adminApi, { search: "@test.com", limit: 100 });
    expect(seeded.body!.items.map((u) => u.email)).toEqual(
      expect.arrayContaining([ADMIN_EMAIL, USER_EMAIL])
    );
  }
);

test.describe("List query validation", { tag: "@TC-ADMINUSERS-023" }, () => {
  // [BVA] limit 1..100, page ≥ 1.
  for (const [params, ok] of [
    [{ limit: 0 }, false],
    [{ limit: 1 }, true],
    [{ limit: 100 }, true],
    [{ limit: 101 }, false],
    [{ limit: -1 }, false],
    [{ page: 0 }, false],
    [{ page: 1 }, true],
    [{ page: "abc" }, false],
    [{ page: 1.5 }, false]
  ] as const) {
    test(`${JSON.stringify(params)} → ${ok ? "200" : "400"}`, async ({
      adminApi
    }) => {
      const res = await adminUsersOf(adminApi).list(params);
      expect(res.status()).toBe(ok ? 200 : 400);
      if (!ok) {
        expect((await errorOf(res)).code).toBe("VALIDATION_ERROR");
      } else if ("limit" in params) {
        const body = await dataOf<AdminUsersPage>(res);
        expect(body.meta.limit).toBe(params.limit);
        expect(body.items.length).toBeLessThanOrEqual(params.limit);
      }
    });
  }

  // [EP] enum params: one valid and one invalid class each.
  for (const [params, ok] of [
    [{ role: "admin" }, true],
    [{ role: "superuser" }, false],
    [{ status: "locked" }, true],
    [{ status: "deleted" }, false],
    [{ sortBy: "fullName", sortOrder: "asc" }, true],
    [{ sortBy: "password" }, false],
    [{ sortOrder: "sideways" }, false]
  ] as const) {
    test(`enum ${JSON.stringify(params)} → ${ok ? "200" : "400"}`, async ({
      adminApi
    }) => {
      const res = await adminUsersOf(adminApi).list(params);
      expect(res.status()).toBe(ok ? 200 : 400);
    });
  }

  // [BVA] search length 200 / 201.
  test("search of 200 characters is accepted, 201 is rejected", async ({
    adminApi
  }) => {
    const admin = adminUsersOf(adminApi);
    expect((await admin.list({ search: "a".repeat(200) })).status()).toBe(200);
    expect((await admin.list({ search: "a".repeat(201) })).status()).toBe(400);
  });
});

// [EP] search: email match · name match · case-insensitive · no match ·
// regex metacharacters treated literally.
test(
  "Search semantics",
  { tag: "@TC-ADMINUSERS-024" },
  async ({ adminApi }) => {
    const byEmail = await list(adminApi, { search: USER_EMAIL });
    expect(byEmail.body!.items.map((u) => u.email)).toContain(USER_EMAIL);
    expect(byEmail.body!.items.map((u) => u.email)).not.toContain(ADMIN_EMAIL);

    const upper = await list(adminApi, { search: ADMIN_EMAIL.toUpperCase() });
    expect(upper.body!.items.map((u) => u.email)).toContain(ADMIN_EMAIL);

    const seededUser = byEmail.body!.items.find((u) => u.email === USER_EMAIL)!;
    const byName = await list(adminApi, {
      search: seededUser.fullName,
      limit: 100
    });
    expect(byName.body!.items.map((u) => u.email)).toContain(USER_EMAIL);

    const none = await list(adminApi, { search: "zzz-no-such-user-999" });
    expect(none.body!.items).toEqual([]);
    expect(none.body!.meta).toMatchObject({ total: 0, totalPages: 0 });

    const regex = await list(adminApi, { search: ".*" });
    expect(regex.res.status()).toBe(200);
    expect(regex.body!.items).toEqual([]);
  }
);

// [EG] whitespace: the schema trims `search` before it is matched.
test(
  "Search ignores surrounding whitespace",
  { tag: "@TC-ADMINUSERS-028" },
  async ({ adminApi }) => {
    const padded = await list(adminApi, { search: `   ${USER_EMAIL}   ` });
    expect(padded.res.status()).toBe(200);
    expect(padded.body!.items.map((u) => u.email)).toContain(USER_EMAIL);
  }
);

// [DT] role × status, each combination returns only matching rows.
test(
  "Role and status filters combine",
  { tag: "@TC-ADMINUSERS-025" },
  async ({ adminApi }) => {
    const locked = await createAccount({ tag: "adm-filter-locked" });
    const id = await adminUserId(adminApi, locked.email);
    expect((await adminUsersOf(adminApi).lock(id)).ok()).toBe(true);

    const cases: [Record<string, string>, (u: AdminUserItem) => boolean][] = [
      [{ role: "admin" }, (u) => u.role === "admin"],
      [{ role: "user" }, (u) => u.role === "user"],
      [{ status: "active" }, (u) => u.isActive],
      [{ status: "locked" }, (u) => !u.isActive],
      [
        { role: "user", status: "locked" },
        (u) => u.role === "user" && !u.isActive
      ],
      [
        { role: "admin", status: "active" },
        (u) => u.role === "admin" && u.isActive
      ]
    ];
    for (const [params, predicate] of cases) {
      const { body } = await list(adminApi, { ...params, limit: 100 });
      expect(body!.items.length, JSON.stringify(params)).toBeGreaterThan(0);
      expect(
        body!.items.every(predicate),
        `every row matches ${JSON.stringify(params)}`
      ).toBe(true);
    }
    const lockedUsers = await list(adminApi, {
      role: "user",
      status: "locked",
      limit: 100
    });
    expect(lockedUsers.body!.items.map((u) => u.email)).toContain(locked.email);
    const adminLocked = await list(adminApi, {
      role: "admin",
      status: "locked",
      search: locked.email
    });
    expect(adminLocked.body!.items).toEqual([]);
  }
);

// [BVA] page past the last one is an empty page, not an error.
test(
  "A page past the last one is empty",
  { tag: "@TC-ADMINUSERS-027" },
  async ({ adminApi }) => {
    const first = await list(adminApi, { limit: 1 });
    const { total, totalPages } = first.body!.meta;
    expect(totalPages).toBe(total);
    const last = await list(adminApi, { limit: 1, page: totalPages });
    expect(last.body!.items).toHaveLength(1);
    const past = await list(adminApi, { limit: 1, page: totalPages + 1 });
    expect(past.body!.items).toEqual([]);
    expect(past.body!.meta).toMatchObject({ page: totalPages + 1, total });
  }
);

// [EP] sortBy × sortOrder. Default is createdAt, newest first. Names compare
// by code point, as MongoDB orders strings without a collation.
test(
  "Sort parameters order the list",
  { tag: "@TC-ADMINUSERS-029" },
  async ({ adminApi }) => {
    const ordered = <T>(values: T[], dir: "asc" | "desc") =>
      values.every((v, i) =>
        i === 0 ? true : dir === "asc" ? values[i - 1] <= v : values[i - 1] >= v
      );
    const time = (u: AdminUserItem) => new Date(u.createdAt).getTime();

    const byDefault = await list(adminApi, { limit: 100 });
    expect(ordered(byDefault.body!.items.map(time), "desc")).toBe(true);

    const oldest = await list(adminApi, {
      sortBy: "createdAt",
      sortOrder: "asc",
      limit: 100
    });
    expect(ordered(oldest.body!.items.map(time), "asc")).toBe(true);

    for (const dir of ["asc", "desc"] as const) {
      const byName = await list(adminApi, {
        sortBy: "fullName",
        sortOrder: dir,
        limit: 100
      });
      expect(
        ordered(
          byName.body!.items.map((u) => u.fullName),
          dir
        ),
        `fullName ${dir}`
      ).toBe(true);
    }
  }
);

// Messages are i18next keys translated per request (Accept-Language).
test.describe(
  "Admin user responses carry translated messages",
  { tag: "@TC-ADMINUSERS-063" },
  () => {
    const en = { "Accept-Language": "en" };
    const vi = { "Accept-Language": "vi" };
    const messageOf = async (res: Promise<APIResponse>) =>
      ((await (await res).json()) as { message: string }).message;

    test("success messages", async ({ adminApi }) => {
      const admin = adminUsersOf(adminApi);
      const target = await createAccount({ tag: "adm-messages" });
      const id = await adminUserId(adminApi, target.email);

      expect(await messageOf(admin.list({}, en))).toBe(
        serverMessage.user.success.getAdminUsers
      );
      expect(await messageOf(admin.lock(id, en))).toBe(
        serverMessage.user.success.lockUser
      );
      expect(await messageOf(admin.unlock(id, vi))).toBe(
        serverMessageVi.user.success.unlockUser
      );
      expect(await messageOf(admin.resetPassword(id, en))).toBe(
        serverMessage.user.success.resetPassword
      );
    });

    test("error messages", async ({ adminApi }) => {
      const admin = adminUsersOf(adminApi);
      const self = await ownUserId(adminApi);

      expect(await messageOf(admin.lock(UNKNOWN_USER_ID, en))).toBe(
        serverMessage.user.errors.notFound
      );
      expect(await messageOf(admin.lock(UNKNOWN_USER_ID, vi))).toBe(
        serverMessageVi.user.errors.notFound
      );
      expect(await messageOf(admin.lock(self, en))).toBe(
        serverMessage.user.errors.cannotLockSelf
      );
      expect(await messageOf(admin.resetPassword(self, vi))).toBe(
        serverMessageVi.user.errors.cannotResetSelf
      );
    });
  }
);

test.describe(
  "Only admins reach the admin user endpoints",
  { tag: "@TC-ADMINUSERS-026" },
  () => {
    // [DT] caller role × endpoint. A placeholder id keeps the user-role calls
    // from ever reaching a real account: the guard answers first.
    const endpoints = [
      [
        "GET /admin/users",
        (ctx: APIRequestContext) => adminUsersOf(ctx).list()
      ],
      [
        "PATCH /admin/users/:id/lock",
        (ctx: APIRequestContext) => adminUsersOf(ctx).lock(UNKNOWN_USER_ID)
      ],
      [
        "PATCH /admin/users/:id/unlock",
        (ctx: APIRequestContext) => adminUsersOf(ctx).unlock(UNKNOWN_USER_ID)
      ],
      [
        "POST /admin/users/:id/reset-password",
        (ctx: APIRequestContext) =>
          adminUsersOf(ctx).resetPassword(UNKNOWN_USER_ID)
      ]
    ] as const;

    for (const [name, call] of endpoints) {
      test(
        `${name}: guest 401, user 403`,
        { tag: name.startsWith("GET") ? ["@smoke"] : [] },
        async ({ guestApi, userApi }) => {
          const guest = await call(guestApi);
          expect(guest.status()).toBe(401);
          expect((await errorOf(guest)).code).toBe("AUTH_MISSING_TOKEN");
          const user = await call(userApi);
          expect(user.status()).toBe(403);
          expect((await errorOf(user)).code).toBe("AUTH_ADMIN_ONLY");
        }
      );
    }
  }
);
