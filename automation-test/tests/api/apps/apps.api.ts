import { test, expect, apiAs } from "@fixtures";
import { createAccount } from "@helpers/accounts";
import {
  APPS_API,
  adminContext,
  createFixtureApps,
  listCatalog,
  removeFixtureApps
} from "@helpers/catalog";
import type { CatalogApp, FixtureApps } from "@helpers/catalog";

// GET /api/v1/apps — the user catalogue: contract, role/status visibility,
// pagination, search and category validation, authorisation, and the launch
// record behind an app tile (POST /users/me/recent-apps/:appId).
// Test cases: test-cases/apps.md (TC-APPS-050 … 059).
//
// One admin-only and one inactive app are registered for the visibility
// cases and deleted in afterAll. Launches are recorded on a throwaway
// account, never on the seeded user.

test.describe.configure({ mode: "serial" });

let fixtures: FixtureApps | undefined;

test.beforeAll(async () => {
  const admin = await adminContext();
  fixtures = await createFixtureApps(admin, "apps-api");
  await admin.dispose();
});

test.afterAll(async () => {
  await removeFixtureApps(fixtures);
});

const ids = (items: CatalogApp[]) => items.map((a) => a._id);

test(
  "GET /apps returns the envelope, app DTOs and page meta",
  { tag: ["@TC-APPS-050", "@smoke"] },
  async ({ userApi }) => {
    const res = await userApi.get(APPS_API);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Object.keys(body).sort()).toEqual(
      ["data", "message", "path", "timestamp"].sort()
    );
    const { items, meta } = body.data as {
      items: CatalogApp[];
      meta: Record<string, number>;
    };
    expect(meta).toMatchObject({ page: 1, limit: 20 });
    expect(meta.totalPages).toBe(Math.ceil(meta.total / meta.limit));
    expect(items.length).toBeLessThanOrEqual(20);
    for (const app of items) {
      expect(typeof app._id).toBe("string");
      expect(typeof app.displayName).toBe("string");
      expect(app.homeUrl).toMatch(/^https?:\/\//);
      expect(typeof app.isFavorite).toBe("boolean");
      expect(Array.isArray(app.categories)).toBe(true);
      // Secrets and OAuth plumbing never reach the user catalogue.
      expect(app).not.toHaveProperty("clientSecretHash");
      expect(app).not.toHaveProperty("redirectUris");
    }
  }
);

test(
  "visibility follows role × status [DT]",
  { tag: ["@TC-APPS-051", "@smoke"] },
  async ({ userApi, adminApi }) => {
    const user = ids((await listCatalog(userApi)).items);
    const admin = ids((await listCatalog(adminApi)).items);

    // role=user  × active admin-only → hidden
    expect(user).not.toContain(fixtures!.adminOnly.id);
    // role=admin × active admin-only → shown
    expect(admin).toContain(fixtures!.adminOnly.id);
    // any role   × inactive          → hidden
    expect(user).not.toContain(fixtures!.inactive.id);
    expect(admin).not.toContain(fixtures!.inactive.id);
    // everything a user sees, an admin sees too
    for (const id of user) expect(admin).toContain(id);
  }
);

test.describe("pagination [BVA]", () => {
  for (const [label, page, status] of [
    ["page=0 (below min)", "0", 400],
    ["page=-1", "-1", 400],
    ["page=abc", "abc", 400],
    ["page=1.5", "1.5", 400]
  ] as const) {
    test(`rejects ${label}`, { tag: "@TC-APPS-052" }, async ({ userApi }) => {
      const res = await userApi.get(APPS_API, { params: { page } });
      expect(res.status()).toBe(status);
      expect((await res.json()).code).toBeTruthy();
    });
  }

  test(
    "page 1, the last page and last+1 with limit=1",
    { tag: "@TC-APPS-052" },
    async ({ userApi }) => {
      const first = await listCatalog(userApi, { limit: 1, page: 1 });
      const total = first.meta.total;
      expect(first.items).toHaveLength(Math.min(1, total));
      expect(first.meta.totalPages).toBe(total);

      const last = await listCatalog(userApi, { limit: 1, page: total });
      expect(last.items).toHaveLength(1);
      expect(last.meta.page).toBe(total);

      const beyond = await listCatalog(userApi, { limit: 1, page: total + 1 });
      expect(beyond.items).toEqual([]);
      expect(beyond.meta.total).toBe(total);

      // Pages do not overlap.
      expect(ids(first.items)).not.toEqual(ids(last.items));
    }
  );

  for (const [limit, status] of [
    ["0", 400],
    ["1", 200],
    ["100", 200],
    ["101", 400]
  ] as const) {
    test(
      `limit=${limit} → ${status}`,
      { tag: "@TC-APPS-053" },
      async ({ userApi }) => {
        const res = await userApi.get(APPS_API, { params: { limit } });
        expect(res.status()).toBe(status);
        if (status === 200) {
          const { data } = await res.json();
          expect(data.items.length).toBeLessThanOrEqual(Number(limit));
          expect(data.meta.limit).toBe(Number(limit));
        }
      }
    );
  }
});

test.describe("search", () => {
  test(
    "matches the display name case-insensitively and only returns matches",
    { tag: "@TC-APPS-054" },
    async ({ userApi }) => {
      const [target] = (await listCatalog(userApi)).items;
      const term = target.displayName.slice(0, 4).toUpperCase();
      const { items } = await listCatalog(userApi, { search: term });
      expect(ids(items)).toContain(target._id);
      for (const app of items) {
        const haystack = `${app.displayName} ${app.description ?? ""}`;
        expect(haystack.toLowerCase()).toContain(term.toLowerCase());
      }
    }
  );

  test(
    "regex metacharacters are treated as text, not as a pattern [EG]",
    { tag: "@TC-APPS-054" },
    async ({ userApi }) => {
      for (const term of [".*", "(", "[a-z]+", "\\"]) {
        const res = await userApi.get(APPS_API, { params: { search: term } });
        expect(res.status(), term).toBe(200);
        const { data } = await res.json();
        // ".*" as a regex would match every app.
        if (term === ".*") expect(data.items).toEqual([]);
      }
    }
  );

  test(
    "search length 200 is accepted, 201 is rejected [BVA]",
    { tag: "@TC-APPS-054" },
    async ({ userApi }) => {
      const ok = await userApi.get(APPS_API, {
        params: { search: "a".repeat(200) }
      });
      expect(ok.status()).toBe(200);
      const tooLong = await userApi.get(APPS_API, {
        params: { search: "a".repeat(201) }
      });
      expect(tooLong.status()).toBe(400);
    }
  );
});

test.describe("category filter", () => {
  test(
    "a malformed categoryId is a 400, an unknown one an empty page [EP]",
    { tag: "@TC-APPS-055" },
    async ({ userApi }) => {
      const bad = await userApi.get(APPS_API, {
        params: { categoryId: "not-an-objectid" }
      });
      expect(bad.status()).toBe(400);

      const unknown = await listCatalog(userApi, {
        categoryId: "ffffffffffffffffffffffff"
      });
      expect(unknown.items).toEqual([]);
      expect(unknown.meta).toMatchObject({ total: 0, totalPages: 0 });
    }
  );

  test(
    "a real categoryId returns only apps carrying that category",
    { tag: "@TC-APPS-055" },
    async ({ userApi }) => {
      const app = (await listCatalog(userApi)).items.find(
        (a) => a.categories.length > 0
      );
      test.skip(!app, "needs an app with a category");
      const categoryId = app!.categories[0]._id;
      const { items } = await listCatalog(userApi, { categoryId });
      expect(ids(items)).toContain(app!._id);
      for (const item of items) {
        expect(item.categories.map((c) => c._id)).toContain(categoryId);
      }
    }
  );
});

test(
  "an unknown status param is stripped — inactive apps never leak [EG]",
  { tag: "@TC-APPS-056" },
  async ({ userApi }) => {
    for (const status of ["inactive", "INACTIVE", "DISABLED"]) {
      const res = await userApi.get(APPS_API, {
        params: { status, limit: 100 }
      });
      expect(res.status(), status).toBe(200);
      const { data } = await res.json();
      expect(ids(data.items)).not.toContain(fixtures!.inactive.id);
    }
  }
);

test(
  "no token → 401, a garbage token → rejected, never anonymous",
  { tag: ["@TC-APPS-057", "@smoke"] },
  async ({ guestApi }) => {
    const anon = await guestApi.get(APPS_API);
    expect(anon.status()).toBe(401);
    expect((await anon.json()).code).toBeTruthy();

    const garbage = await guestApi.get(APPS_API, {
      headers: { Authorization: "Bearer garbage" }
    });
    expect([401, 403]).toContain(garbage.status());
  }
);

test(
  "recording a launch: visible app 204, hidden or missing app 404, bad id 400",
  { tag: "@TC-APPS-058" },
  async ({ guestApi }) => {
    const account = await createAccount({ tag: "apps-launch" });
    const api = await apiAs(account.email, account.password);
    try {
      const [visible] = (await listCatalog(api)).items;
      const record = (id: string) =>
        api.post(`/api/v1/users/me/recent-apps/${id}`);

      expect((await record(visible._id)).status()).toBe(204);
      expect((await record(fixtures!.adminOnly.id)).status()).toBe(404);
      expect((await record(fixtures!.inactive.id)).status()).toBe(404);
      expect((await record("ffffffffffffffffffffffff")).status()).toBe(404);
      expect((await record("not-an-id")).status()).toBe(400);

      const anon = await guestApi.post(
        `/api/v1/users/me/recent-apps/${visible._id}`
      );
      expect(anon.status()).toBe(401);

      const recent = await api.get("/api/v1/users/me/recent-apps");
      const { data } = await recent.json();
      expect(data.items.map((a: { _id: string }) => a._id)).toEqual([
        visible._id
      ]);
    } finally {
      await api.dispose();
    }
  }
);

test(
  "category names come as { en, vi } on every app",
  { tag: "@TC-APPS-059" },
  async ({ userApi }) => {
    const { items } = await listCatalog(userApi);
    const categories = items.flatMap((a) => a.categories);
    test.skip(categories.length === 0, "no categorised app");
    for (const c of categories) {
      expect(typeof c.name.en).toBe("string");
      expect(typeof c.name.vi).toBe("string");
      expect(c.name.en.length).toBeGreaterThan(0);
      expect(c.name.vi.length).toBeGreaterThan(0);
    }
  }
);
