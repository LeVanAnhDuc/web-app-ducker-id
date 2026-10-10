import { test, expect } from "@fixtures";
import { createAccount } from "@helpers/accounts";
import { adminUserId, setActive } from "@helpers/adminUsers";

// GET /api/v1/admin/users — contract, query validation, filters and access
// control. Test cases: test-cases/admin-users.md. Read-only except for the
// one throwaway account the status-filter cases lock.

const LIST = "/api/v1/admin/users";

interface Item {
  _id: string;
  fullName: string;
  email: string;
  avatar: string | null;
  role: string;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}
interface Page {
  items: Item[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

const list = async (
  api: import("@playwright/test").APIRequestContext,
  params: Record<string, string | number> = {}
) => {
  const res = await api.get(LIST, { params });
  return {
    res,
    body: res.ok() ? ((await res.json()) as { data: Page }) : null
  };
};

test.describe("GET /admin/users — contract", () => {
  test(
    "returns the response envelope with paginated user items",
    { tag: ["@TC-ADMUSERS-022", "@smoke"] },
    async ({ adminApi }) => {
      const res = await adminApi.get(LIST);
      expect(res.status()).toBe(200);
      const body = (await res.json()) as {
        timestamp: string;
        path: string;
        message: string;
        data: Page;
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
      expect(seeded.body!.data.items.map((u) => u.email)).toEqual(
        expect.arrayContaining(["admin@test.com", "user@test.com"])
      );
    }
  );
});

test.describe("GET /admin/users — query validation", () => {
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
    test(
      `${JSON.stringify(params)} → ${ok ? "200" : "400"}`,
      { tag: "@TC-ADMUSERS-023" },
      async ({ adminApi }) => {
        const res = await adminApi.get(LIST, { params });
        expect(res.status()).toBe(ok ? 200 : 400);
        if (!ok) {
          const body = (await res.json()) as { code: string };
          expect(body.code).toBe("VALIDATION_ERROR");
        } else if ("limit" in params) {
          const body = (await res.json()) as { data: Page };
          expect(body.data.meta.limit).toBe(params.limit);
          expect(body.data.items.length).toBeLessThanOrEqual(params.limit);
        }
      }
    );
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
    test(
      `enum ${JSON.stringify(params)} → ${ok ? "200" : "400"}`,
      { tag: "@TC-ADMUSERS-023" },
      async ({ adminApi }) => {
        const res = await adminApi.get(LIST, { params });
        expect(res.status()).toBe(ok ? 200 : 400);
      }
    );
  }

  // [BVA] search length 200 / 201.
  test(
    "search of 200 characters is accepted, 201 is rejected",
    { tag: "@TC-ADMUSERS-023" },
    async ({ adminApi }) => {
      expect(
        (
          await adminApi.get(LIST, { params: { search: "a".repeat(200) } })
        ).status()
      ).toBe(200);
      expect(
        (
          await adminApi.get(LIST, { params: { search: "a".repeat(201) } })
        ).status()
      ).toBe(400);
    }
  );
});

test.describe("GET /admin/users — search and filters", () => {
  // [EP] search: email match · name match · case-insensitive · no match ·
  // regex metacharacters treated literally.
  test(
    "search matches email or name, case-insensitively, and treats regex characters literally",
    { tag: "@TC-ADMUSERS-024" },
    async ({ adminApi }) => {
      const byEmail = await list(adminApi, { search: "user@test.com" });
      expect(byEmail.body!.data.items.map((u) => u.email)).toContain(
        "user@test.com"
      );
      expect(byEmail.body!.data.items.map((u) => u.email)).not.toContain(
        "admin@test.com"
      );

      const upper = await list(adminApi, { search: "ADMIN@TEST.COM" });
      expect(upper.body!.data.items.map((u) => u.email)).toContain(
        "admin@test.com"
      );

      const admin = byEmail.body!.data.items.find(
        (u) => u.email === "user@test.com"
      )!;
      const byName = await list(adminApi, {
        search: admin.fullName,
        limit: 100
      });
      expect(byName.body!.data.items.map((u) => u.email)).toContain(
        "user@test.com"
      );

      const none = await list(adminApi, { search: "zzz-no-such-user-999" });
      expect(none.body!.data.items).toEqual([]);
      expect(none.body!.data.meta).toMatchObject({ total: 0, totalPages: 0 });

      const regex = await list(adminApi, { search: ".*" });
      expect(regex.res.status()).toBe(200);
      expect(regex.body!.data.items).toEqual([]);
    }
  );

  // [DT] role × status, each combination returns only matching rows.
  test(
    "role and status filters combine with AND",
    { tag: "@TC-ADMUSERS-025" },
    async ({ adminApi }) => {
      const locked = await createAccount({ tag: "adm-filter-locked" });
      const id = await adminUserId(adminApi, locked.email);
      expect((await setActive(adminApi, id, false)).ok()).toBe(true);

      const cases: [Record<string, string>, (u: Item) => boolean][] = [
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
        expect(body!.data.items.length, JSON.stringify(params)).toBeGreaterThan(
          0
        );
        expect(
          body!.data.items.every(predicate),
          `every row matches ${JSON.stringify(params)}`
        ).toBe(true);
      }
      const lockedUsers = await list(adminApi, {
        role: "user",
        status: "locked",
        limit: 100
      });
      expect(lockedUsers.body!.data.items.map((u) => u.email)).toContain(
        locked.email
      );
      const adminLocked = await list(adminApi, {
        role: "admin",
        status: "locked",
        search: locked.email
      });
      expect(adminLocked.body!.data.items).toEqual([]);
    }
  );

  // [BVA] page past the last one is an empty page, not an error.
  test(
    "a page past the last one returns no items with the real total",
    { tag: "@TC-ADMUSERS-027" },
    async ({ adminApi }) => {
      const first = await list(adminApi, { limit: 1 });
      const { total, totalPages } = first.body!.data.meta;
      expect(totalPages).toBe(total);
      const last = await list(adminApi, { limit: 1, page: totalPages });
      expect(last.body!.data.items).toHaveLength(1);
      const past = await list(adminApi, { limit: 1, page: totalPages + 1 });
      expect(past.body!.data.items).toEqual([]);
      expect(past.body!.data.meta).toMatchObject({
        page: totalPages + 1,
        total
      });
    }
  );
});

test.describe("/admin/users — access control", () => {
  // [DT] caller role × endpoint. A placeholder id keeps the user-role
  // calls from ever reaching a real account: the guard answers first.
  const PLACEHOLDER = "aaaaaaaaaaaaaaaaaaaaaaaa";
  const endpoints: [string, string][] = [
    ["GET", LIST],
    ["PATCH", `${LIST}/${PLACEHOLDER}/lock`],
    ["PATCH", `${LIST}/${PLACEHOLDER}/unlock`],
    ["POST", `${LIST}/${PLACEHOLDER}/reset-password`]
  ];

  for (const [method, url] of endpoints) {
    test(
      `${method} ${url.replace(PLACEHOLDER, ":id")}: guest 401, user 403`,
      { tag: ["@TC-ADMUSERS-026", ...(method === "GET" ? ["@smoke"] : [])] },
      async ({ guestApi, userApi }) => {
        const guest = await guestApi.fetch(url, { method });
        expect(guest.status()).toBe(401);
        expect(((await guest.json()) as { code: string }).code).toBe(
          "AUTH_MISSING_TOKEN"
        );
        const user = await userApi.fetch(url, { method });
        expect(user.status()).toBe(403);
        expect(((await user.json()) as { code: string }).code).toBe(
          "AUTH_ADMIN_ONLY"
        );
      }
    );
  }
});
