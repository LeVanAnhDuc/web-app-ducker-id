import type { APIRequestContext } from "@playwright/test";
import { test, expect } from "@/fixtures";
import { createApiClient } from "@/api";
import { errorOf } from "@/api/response";
import { adminContext, apiAs } from "@/api/session";
import type { CatalogApp, CatalogPage } from "@/api/web-app.client";
import { serverMessage } from "@/data/copy";
import { createAccount } from "@/utils/accounts";
import {
  createFixtureApps,
  listCatalog,
  removeFixtureApps
} from "@/utils/catalog";
import type { FixtureApps } from "@/utils/catalog";

// GET /apps — the user catalogue: contract, role/status visibility,
// pagination, search and category validation, authorisation, and the launch
// record behind an app tile (POST /users/me/recent-apps/:appId).
// Test cases: test-cases/apps.md (TC-APPS-050 … 059, 063, 064, 067).
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
const webApps = (ctx: APIRequestContext) => createApiClient(ctx).webApps;
const EN = { "Accept-Language": "en" };

test(
  "`GET /apps` contract",
  { tag: ["@TC-APPS-050", "@smoke"] },
  async ({ userApi }) => {
    const res = await webApps(userApi).list();
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Object.keys(body).sort()).toEqual(
      ["data", "message", "path", "timestamp"].sort()
    );
    const { items, meta } = body.data as CatalogPage;
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
  "The user catalogue exposes only display fields",
  { tag: "@TC-APPS-067" },
  async ({ userApi }) => {
    const { items } = await listCatalog(userApi);
    expect(items.length).toBeGreaterThan(0);
    for (const app of items) {
      // UserAppDto: no clientId, requiredRoles, status, URIs, grant types…
      expect(Object.keys(app).sort()).toEqual(
        [
          "_id",
          "categories",
          "description",
          "displayName",
          "homeUrl",
          "iconUrl",
          "isFavorite"
        ].sort()
      );
    }
  }
);

test(
  "Visibility follows role × status",
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

test.describe("Page boundaries", { tag: "@TC-APPS-052" }, () => {
  for (const [label, page, status] of [
    ["page=0 (below min)", "0", 400],
    ["page=-1", "-1", 400],
    ["page=abc", "abc", 400],
    ["page=1.5", "1.5", 400]
  ] as const) {
    test(`rejects ${label}`, async ({ userApi }) => {
      const res = await webApps(userApi).list({ page });
      expect(res.status()).toBe(status);
      expect((await res.json()).code).toBeTruthy();
    });
  }

  test("page 1, the last page and last+1 with limit=1", async ({ userApi }) => {
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
  });
});

test.describe("Limit boundaries", { tag: "@TC-APPS-053" }, () => {
  for (const [limit, status] of [
    ["0", 400],
    ["1", 200],
    ["100", 200],
    ["101", 400]
  ] as const) {
    test(`limit=${limit} → ${status}`, async ({ userApi }) => {
      const res = await webApps(userApi).list({ limit });
      expect(res.status()).toBe(status);
      if (status === 200) {
        const { data } = await res.json();
        expect(data.items.length).toBeLessThanOrEqual(Number(limit));
        expect(data.meta.limit).toBe(Number(limit));
      }
    });
  }
});

test(
  "Invalid catalogue queries answer VALIDATION_ERROR naming the field",
  { tag: "@TC-APPS-063" },
  async ({ userApi }) => {
    const v = serverMessage.validation;
    for (const [field, value, message] of [
      ["page", "0", v.page.invalid],
      ["limit", "101", v.limit.invalid],
      ["search", "a".repeat(201), v.search.invalid],
      ["categoryId", "not-an-objectid", v.categoryId.invalid]
    ] as const) {
      const res = await webApps(userApi).list({ [field]: value }, EN);
      expect(res.status(), field).toBe(400);
      const error = await errorOf(res);
      expect(error.code, field).toBe("VALIDATION_ERROR");
      expect(error.message, field).toBe(
        serverMessage.common.errors.validationFailed
      );
      expect(error.errors, field).toEqual([
        expect.objectContaining({ field, message })
      ]);
    }
  }
);

test.describe("Search semantics and length", { tag: "@TC-APPS-054" }, () => {
  test("matches the display name case-insensitively and only returns matches", async ({
    userApi
  }) => {
    const [target] = (await listCatalog(userApi)).items;
    const term = target.displayName.slice(0, 4).toUpperCase();
    const { items } = await listCatalog(userApi, { search: term });
    expect(ids(items)).toContain(target._id);
    for (const app of items) {
      const haystack = `${app.displayName} ${app.description ?? ""}`;
      expect(haystack.toLowerCase()).toContain(term.toLowerCase());
    }
  });

  test("regex metacharacters are treated as text, not as a pattern [EG]", async ({
    userApi
  }) => {
    for (const term of [".*", "(", "[a-z]+", "\\"]) {
      const res = await webApps(userApi).list({ search: term });
      expect(res.status(), term).toBe(200);
      const { data } = await res.json();
      // ".*" as a regex would match every app.
      if (term === ".*") expect(data.items).toEqual([]);
    }
  });

  test("search length 200 is accepted, 201 is rejected [BVA]", async ({
    userApi
  }) => {
    const ok = await webApps(userApi).list({ search: "a".repeat(200) });
    expect(ok.status()).toBe(200);
    const tooLong = await webApps(userApi).list({ search: "a".repeat(201) });
    expect(tooLong.status()).toBe(400);
  });
});

test(
  "Search ignores surrounding spaces and also matches the description",
  { tag: "@TC-APPS-064" },
  async ({ userApi }) => {
    const { items } = await listCatalog(userApi);
    const [target] = items;
    const term = target.displayName.slice(0, 4);

    // Joi trims `search` before the query is built.
    const plain = ids((await listCatalog(userApi, { search: term })).items);
    const padded = ids(
      (await listCatalog(userApi, { search: `  ${term}  ` })).items
    );
    expect(plain).toContain(target._id);
    expect(padded).toEqual(plain);

    // A word that is in an app's description but not in its display name.
    const pick = items
      .map((app) => ({
        app,
        word: (app.description ?? "")
          .split(/[^\p{L}\p{N}]+/u)
          .find(
            (w) =>
              w.length >= 4 &&
              !app.displayName.toLowerCase().includes(w.toLowerCase())
          )
      }))
      .find((p) => p.word);
    if (!pick) {
      test.info().annotations.push({
        type: "partial",
        description: "no app has a description word outside its name"
      });
      return;
    }
    const found = await listCatalog(userApi, { search: pick.word! });
    expect(ids(found.items)).toContain(pick.app._id);
  }
);

test.describe("Category filter validation", { tag: "@TC-APPS-055" }, () => {
  test("a malformed categoryId is a 400, an unknown one an empty page [EP]", async ({
    userApi
  }) => {
    const bad = await webApps(userApi).list({ categoryId: "not-an-objectid" });
    expect(bad.status()).toBe(400);

    const unknown = await listCatalog(userApi, {
      categoryId: "ffffffffffffffffffffffff"
    });
    expect(unknown.items).toEqual([]);
    expect(unknown.meta).toMatchObject({ total: 0, totalPages: 0 });
  });

  test("a real categoryId returns only apps carrying that category", async ({
    userApi
  }) => {
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
  });
});

test(
  "An unknown `status` param never exposes inactive apps",
  { tag: ["@TC-APPS-056", "@smoke"] },
  async ({ userApi }) => {
    for (const status of ["inactive", "INACTIVE", "DISABLED"]) {
      const res = await webApps(userApi).list({ status, limit: 100 });
      expect(res.status(), status).toBe(200);
      const { data } = await res.json();
      expect(ids(data.items)).not.toContain(fixtures!.inactive.id);
    }
  }
);

test(
  "The catalogue requires a valid session",
  { tag: ["@TC-APPS-057", "@smoke"] },
  async ({ guestApi }) => {
    const anon = await webApps(guestApi).list();
    expect(anon.status()).toBe(401);
    expect((await anon.json()).code).toBeTruthy();

    const garbage = await webApps(guestApi).list(
      {},
      { Authorization: "Bearer garbage" }
    );
    expect([401, 403]).toContain(garbage.status());
  }
);

test(
  "Recording a launch",
  { tag: ["@TC-APPS-058", "@smoke"] },
  async ({ guestApi }) => {
    const account = await createAccount({ tag: "apps-launch" });
    const ctx = await apiAs(account.email, account.password);
    try {
      const [visible] = (await listCatalog(ctx)).items;
      const recent = createApiClient(ctx).recentApps;
      const record = (id: string) => recent.record(id);

      expect((await record(visible._id)).status()).toBe(204);
      expect((await record(fixtures!.adminOnly.id)).status()).toBe(404);
      expect((await record(fixtures!.inactive.id)).status()).toBe(404);
      expect((await record("ffffffffffffffffffffffff")).status()).toBe(404);
      expect((await record("not-an-id")).status()).toBe(400);

      const anon = await createApiClient(guestApi).recentApps.record(
        visible._id
      );
      expect(anon.status()).toBe(401);

      const list = await recent.list();
      const { data } = await list.json();
      expect(data.items.map((a: { _id: string }) => a._id)).toEqual([
        visible._id
      ]);
    } finally {
      await ctx.dispose();
    }
  }
);

test(
  "Category names are bilingual on every app",
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
