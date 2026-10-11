import { test, expect } from "@fixtures";
import type { APIRequestContext } from "@playwright/test";
import { createAccount, findUserByEmail } from "@helpers/accounts";
import { passwordLogin } from "@helpers/adminUsers";

// GET /api/v1/admin/login-history and /:id — contract, filters, validation,
// pagination and access control. The filter cases sign a throwaway account
// in (one success, one wrong password) so the expected rows are known.
//
// Note: `userId` on a login-history row (and the `userId` filter) is the
// account's AUTH id (`auths._id`, the model ref), not the `users._id` that
// GET /admin/users returns — `authIdOf()` resolves it.

const authIdOf = async (email: string): Promise<string> => {
  const user = await findUserByEmail(email);
  expect(user, `users row for ${email}`).toBeTruthy();
  return String(user!.authId);
};
// Test cases: test-cases/admin-login-history.md.

const LIST = "/api/v1/admin/login-history";

interface Item {
  _id: string;
  method: string;
  status: "success" | "failed";
  failReason: string | null;
  ip: string;
  country: string;
  city: string;
  deviceType: string;
  os: string;
  browser: string;
  clientType: string;
  createdAt: string;
  userId: string | null;
  usernameAttempted: string;
  isAnomaly: boolean;
  anomalyReasons: string[];
  source: string;
  app: unknown;
  interactive: boolean;
}
interface Page {
  items: Item[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

const list = async (
  api: APIRequestContext,
  params: Record<string, string | number | boolean> = {}
): Promise<Page> => {
  const res = await api.get(LIST, { params });
  expect(res.status(), `${LIST} ${JSON.stringify(params)}`).toBe(200);
  return ((await res.json()) as { data: Page }).data;
};

test(
  "list returns the envelope with paginated attempts across accounts",
  { tag: ["@TC-ADMLOGHIST-030", "@smoke"] },
  async ({ adminApi }) => {
    const res = await adminApi.get(LIST, { params: { limit: 100 } });
    expect(res.status()).toBe(200);
    const body = (await res.json()) as {
      timestamp: string;
      path: string;
      data: Page;
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
  // [DT] userId × status for one known account: 1 success + 1 failure.
  test(
    "userId, status, method and ip filters return exactly the matching rows",
    { tag: "@TC-ADMLOGHIST-031" },
    async ({ adminApi, guestApi }) => {
      const acc = await createAccount({ tag: "adm-loghist" });
      expect(
        (await passwordLogin(guestApi, acc.email, acc.password)).ok()
      ).toBe(true);
      expect(
        (await passwordLogin(guestApi, acc.email, "Wrong@Password1")).ok()
      ).toBe(false);
      const userId = await authIdOf(acc.email);

      // Attempts are recorded asynchronously after the login answers.
      await expect
        .poll(async () => (await list(adminApi, { userId })).meta.total, {
          timeout: 10_000
        })
        .toBe(2);
      const mine = await list(adminApi, { userId });
      const ofMine = mine.items.filter(
        (i) => i.usernameAttempted === acc.email
      );
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
    }
  );

  test(
    "a date window in the past returns nothing for a new account",
    { tag: "@TC-ADMLOGHIST-031" },
    async ({ adminApi, guestApi }) => {
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
    }
  );
});

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
  for (const [params, status] of cases) {
    test(
      `${JSON.stringify(params).slice(0, 60)} → ${status}`,
      { tag: "@TC-ADMLOGHIST-032" },
      async ({ adminApi }) => {
        const res = await adminApi.get(LIST, { params });
        expect(res.status()).toBe(status);
        if (status === 400)
          expect(((await res.json()) as { code: string }).code).toBe(
            "VALIDATION_ERROR"
          );
      }
    );
  }

  test(
    "[BVA] limit=1 pages one row at a time and past-the-end is empty",
    { tag: "@TC-ADMLOGHIST-035" },
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
  test(
    "GET /:id returns the record with its app source",
    { tag: "@TC-ADMLOGHIST-033" },
    async ({ adminApi }) => {
      const [first] = (await list(adminApi, { limit: 1 })).items;
      const res = await adminApi.get(`${LIST}/${first._id}`);
      expect(res.status()).toBe(200);
      const detail = (
        (await res.json()) as { data: Item & { userAgent: string } }
      ).data;
      expect(detail._id).toBe(first._id);
      expect(detail.usernameAttempted).toBe(first.usernameAttempted);
      expect(detail).toHaveProperty("userAgent");
      expect(detail).toHaveProperty("source");
      expect(detail).toHaveProperty("app");
      expect(detail).toHaveProperty("interactive");
    }
  );

  test(
    "[EG] malformed id → 400, unknown id → 404",
    { tag: "@TC-ADMLOGHIST-033" },
    async ({ adminApi }) => {
      const bad = await adminApi.get(`${LIST}/not-an-id`);
      expect(bad.status()).toBe(400);
      expect(((await bad.json()) as { code: string }).code).toBe(
        "VALIDATION_ERROR"
      );
      const missing = await adminApi.get(`${LIST}/000000000000000000000000`);
      expect(missing.status()).toBe(404);
    }
  );
});

test(
  "access control: guest 401, user 403 on list and detail",
  { tag: "@TC-ADMLOGHIST-034" },
  async ({ guestApi, userApi }) => {
    for (const url of [LIST, `${LIST}/000000000000000000000000`]) {
      const guest = await guestApi.get(url);
      expect(guest.status(), url).toBe(401);
      expect(((await guest.json()) as { code: string }).code).toBe(
        "AUTH_MISSING_TOKEN"
      );
      const user = await userApi.get(url);
      expect(user.status(), url).toBe(403);
      expect(((await user.json()) as { code: string }).code).toBe(
        "AUTH_ADMIN_ONLY"
      );
    }
  }
);
