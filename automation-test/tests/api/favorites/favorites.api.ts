import { test, expect, apiAs } from "@fixtures";
import type { APIRequestContext } from "@playwright/test";
import { createAccount } from "@helpers/accounts";
import {
  adminContext,
  catalogByName,
  createFixtureApps,
  listCatalog,
  removeFixtureApps
} from "@helpers/catalog";
import type { CatalogApp, FixtureApps } from "@helpers/catalog";

// /api/v1/users/me/favorites — add / list / remove, idempotency, validation,
// visibility rules, isolation between users and authorisation.
// Test cases: test-cases/favorites.md (TC-FAV-020 … 028).
//
// Every case runs on throwaway accounts so the seeded user's favourites are
// never touched; the cleanup project deletes the accounts and their rows.

const FAV = "/api/v1/users/me/favorites";
const ZERO_ID = "ffffffffffffffffffffffff";

test.describe.configure({ mode: "serial" });

let fixtures: FixtureApps | undefined;

test.beforeAll(async () => {
  const admin = await adminContext();
  fixtures = await createFixtureApps(admin, "fav-api");
  await admin.dispose();
});

test.afterAll(async () => {
  await removeFixtureApps(fixtures);
});

async function freshUser(tag: string) {
  const account = await createAccount({ tag });
  return apiAs(account.email, account.password);
}

async function favouriteIds(api: APIRequestContext, params = {}) {
  const res = await api.get(FAV, { params });
  expect(res.status()).toBe(200);
  const { data } = (await res.json()) as { data: { items: CatalogApp[] } };
  return data.items.map((a) => a._id);
}

test(
  "add → list → remove round-trip [ST]",
  { tag: ["@TC-FAV-020", "@smoke"] },
  async () => {
    const api = await freshUser("fav-rt");
    try {
      const [app] = await catalogByName(api);
      expect(await favouriteIds(api)).toEqual([]);

      const add = await api.post(`${FAV}/${app._id}`);
      expect(add.status()).toBe(201);
      expect(await favouriteIds(api)).toEqual([app._id]);

      const remove = await api.delete(`${FAV}/${app._id}`);
      expect(remove.status()).toBe(204);
      expect(await favouriteIds(api)).toEqual([]);
    } finally {
      await api.dispose();
    }
  }
);

test(
  "adding twice and removing twice are idempotent",
  { tag: "@TC-FAV-021" },
  async () => {
    const api = await freshUser("fav-idem");
    try {
      const [app] = await catalogByName(api);
      expect((await api.post(`${FAV}/${app._id}`)).status()).toBe(201);
      expect((await api.post(`${FAV}/${app._id}`)).status()).toBe(201);
      expect(await favouriteIds(api)).toEqual([app._id]);

      expect((await api.delete(`${FAV}/${app._id}`)).status()).toBe(204);
      expect((await api.delete(`${FAV}/${app._id}`)).status()).toBe(204);
      expect(await favouriteIds(api)).toEqual([]);
    } finally {
      await api.dispose();
    }
  }
);

test(
  "validation: malformed id 400, unknown id 404, bad sort / categoryId 400 [EP]",
  { tag: "@TC-FAV-022" },
  async ({ userApi }) => {
    expect((await userApi.post(`${FAV}/not-an-id`)).status()).toBe(400);
    expect((await userApi.delete(`${FAV}/not-an-id`)).status()).toBe(400);
    const unknown = await userApi.post(`${FAV}/${ZERO_ID}`);
    expect(unknown.status()).toBe(404);
    expect((await unknown.json()).code).toBeTruthy();

    expect(
      (await userApi.get(FAV, { params: { sort: "popular" } })).status()
    ).toBe(400);
    expect(
      (await userApi.get(FAV, { params: { categoryId: "nope" } })).status()
    ).toBe(400);
    expect(
      (await userApi.get(FAV, { params: { search: "a".repeat(201) } })).status()
    ).toBe(400);
  }
);

test(
  "only apps the caller may see can be favourited [DT]",
  { tag: "@TC-FAV-023" },
  async ({ adminApi }) => {
    const api = await freshUser("fav-authz");
    try {
      // role=user × admin-only → 404, × inactive → 404
      expect(
        (await api.post(`${FAV}/${fixtures!.adminOnly.id}`)).status()
      ).toBe(404);
      expect((await api.post(`${FAV}/${fixtures!.inactive.id}`)).status()).toBe(
        404
      );
      expect(await favouriteIds(api)).toEqual([]);

      // role=admin × admin-only → 201 (then removed again)
      const ok = await adminApi.post(`${FAV}/${fixtures!.adminOnly.id}`);
      expect(ok.status()).toBe(201);
      expect(await favouriteIds(adminApi)).toContain(fixtures!.adminOnly.id);
      expect(
        (await adminApi.delete(`${FAV}/${fixtures!.adminOnly.id}`)).status()
      ).toBe(204);
      // role=admin × inactive → 404
      expect(
        (await adminApi.post(`${FAV}/${fixtures!.inactive.id}`)).status()
      ).toBe(404);
    } finally {
      await api.dispose();
    }
  }
);

test(
  "favourites are private to each user",
  { tag: ["@TC-FAV-024", "@smoke"] },
  async () => {
    const alice = await freshUser("fav-alice");
    const bob = await freshUser("fav-bob");
    try {
      const [a, b] = await catalogByName(alice);
      expect(b, "needs two catalogue apps").toBeTruthy();
      await alice.post(`${FAV}/${a._id}`);
      await bob.post(`${FAV}/${b._id}`);

      expect(await favouriteIds(alice)).toEqual([a._id]);
      expect(await favouriteIds(bob)).toEqual([b._id]);

      // Bob removing Alice's app only touches Bob's (empty) row.
      expect((await bob.delete(`${FAV}/${a._id}`)).status()).toBe(204);
      expect(await favouriteIds(alice)).toEqual([a._id]);

      // isFavorite on the catalogue is per caller as well.
      const aliceCat = (await listCatalog(alice)).items.find(
        (x) => x._id === a._id
      );
      const bobCat = (await listCatalog(bob)).items.find(
        (x) => x._id === a._id
      );
      expect(aliceCat?.isFavorite).toBe(true);
      expect(bobCat?.isFavorite).toBe(false);
    } finally {
      await Promise.all([alice.dispose(), bob.dispose()]);
    }
  }
);

test(
  "sort: recent (newest first, default) vs name (alphabetical)",
  { tag: "@TC-FAV-025" },
  async () => {
    const api = await freshUser("fav-sort");
    try {
      const apps = (await catalogByName(api)).slice(0, 3);
      test.skip(apps.length < 3, "needs three catalogue apps");
      for (const app of apps) {
        expect((await api.post(`${FAV}/${app._id}`)).status()).toBe(201);
      }
      const byName = apps.map((a) => a._id);
      expect(await favouriteIds(api)).toEqual([...byName].reverse());
      expect(await favouriteIds(api, { sort: "recent" })).toEqual(
        [...byName].reverse()
      );
      expect(await favouriteIds(api, { sort: "name" })).toEqual(byName);
    } finally {
      await api.dispose();
    }
  }
);

test(
  "no token → 401 on list, add and remove",
  { tag: ["@TC-FAV-026", "@smoke"] },
  async ({ guestApi, userApi }) => {
    const [app] = await catalogByName(userApi);
    expect((await guestApi.get(FAV)).status()).toBe(401);
    expect((await guestApi.post(`${FAV}/${app._id}`)).status()).toBe(401);
    expect((await guestApi.delete(`${FAV}/${app._id}`)).status()).toBe(401);
  }
);

test(
  "favourites persist across sessions and follow app visibility",
  { tag: "@TC-FAV-027" },
  async () => {
    const account = await createAccount({ tag: "fav-persist" });
    const first = await apiAs(account.email, account.password);
    const [app] = await catalogByName(first);
    await first.post(`${FAV}/${app._id}`);
    await first.dispose();

    // A new session (re-login) still sees the favourite.
    const second = await apiAs(account.email, account.password);
    try {
      expect(await favouriteIds(second)).toEqual([app._id]);
      const listed = (await listCatalog(second)).items.find(
        (x) => x._id === app._id
      );
      expect(listed?.isFavorite).toBe(true);
    } finally {
      await second.dispose();
    }
  }
);

test(
  "search and categoryId narrow the favourites list",
  { tag: "@TC-FAV-028" },
  async () => {
    const api = await freshUser("fav-filter");
    try {
      const apps = (await catalogByName(api)).slice(0, 3);
      for (const app of apps) await api.post(`${FAV}/${app._id}`);
      const target = apps[0];

      const bySearch = await favouriteIds(api, {
        search: target.displayName
      });
      expect(bySearch).toContain(target._id);
      expect(await favouriteIds(api, { search: "zzz-no-such-app" })).toEqual(
        []
      );

      const categorised = apps.find((a) => a.categories.length > 0);
      if (categorised) {
        const categoryId = categorised.categories[0]._id;
        const byCategory = await favouriteIds(api, { categoryId });
        expect(byCategory).toContain(categorised._id);
        for (const id of byCategory) {
          const app = apps.find((a) => a._id === id)!;
          expect(app.categories.map((c) => c._id)).toContain(categoryId);
        }
      }
    } finally {
      await api.dispose();
    }
  }
);
