import { test, expect } from "@/fixtures";
import type { APIRequestContext } from "@playwright/test";
import { createApiClient } from "@/api";
import { errorOf } from "@/api/response";
import { adminContext, apiAs } from "@/api/session";
import type { CatalogApp } from "@/api/web-app.client";
import { createAccount } from "@/utils/accounts";
import {
  catalogByName,
  createFixtureApps,
  listCatalog,
  removeFixtureApps
} from "@/utils/catalog";
import type { FixtureApps } from "@/utils/catalog";

// /users/me/favorites — add / list / remove, idempotency, validation,
// visibility rules, isolation between users and authorisation.
// Test cases: test-cases/favorites.md (TC-FAVORITES-020 … 028, 032 … 034).
//
// Every case runs on throwaway accounts so the seeded user's favourites are
// never touched; the cleanup project deletes the accounts and their rows.

/** A well-formed ObjectId no app has. */
const ZERO_ID = "ffffffffffffffffffffffff";
/** SEARCH_MAX_LENGTH (server/src/validators/constants.ts). */
const SEARCH_MAX = 200;

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

const favoritesOf = (ctx: APIRequestContext) => createApiClient(ctx).favorites;

async function favouriteIds(ctx: APIRequestContext, params = {}) {
  const res = await favoritesOf(ctx).list(params);
  expect(res.status()).toBe(200);
  const { data } = (await res.json()) as { data: { items: CatalogApp[] } };
  return data.items.map((a) => a._id);
}

test(
  "Add → list → remove round-trip",
  { tag: ["@TC-FAVORITES-020", "@smoke"] },
  async () => {
    const api = await freshUser("fav-rt");
    try {
      const favorites = favoritesOf(api);
      const [app] = await catalogByName(api);
      expect(await favouriteIds(api)).toEqual([]);

      const add = await favorites.add(app._id);
      expect(add.status()).toBe(201);
      expect(await favouriteIds(api)).toEqual([app._id]);

      const remove = await favorites.remove(app._id);
      expect(remove.status()).toBe(204);
      expect(await favouriteIds(api)).toEqual([]);
    } finally {
      await api.dispose();
    }
  }
);

test(
  "Add and remove are idempotent",
  { tag: "@TC-FAVORITES-021" },
  async () => {
    const api = await freshUser("fav-idem");
    try {
      const favorites = favoritesOf(api);
      const [app] = await catalogByName(api);
      expect((await favorites.add(app._id)).status()).toBe(201);
      expect((await favorites.add(app._id)).status()).toBe(201);
      expect(await favouriteIds(api)).toEqual([app._id]);

      expect((await favorites.remove(app._id)).status()).toBe(204);
      expect((await favorites.remove(app._id)).status()).toBe(204);
      expect(await favouriteIds(api)).toEqual([]);
    } finally {
      await api.dispose();
    }
  }
);

test("Input validation", { tag: "@TC-FAVORITES-022" }, async ({ userApi }) => {
  const favorites = favoritesOf(userApi);
  expect((await favorites.add("not-an-id")).status()).toBe(400);
  expect((await favorites.remove("not-an-id")).status()).toBe(400);
  const unknown = await favorites.add(ZERO_ID);
  expect(unknown.status()).toBe(404);
  expect((await unknown.json()).code).toBeTruthy();

  expect((await favorites.list({ sort: "popular" })).status()).toBe(400);
  expect((await favorites.list({ categoryId: "nope" })).status()).toBe(400);
  expect(
    (await favorites.list({ search: "a".repeat(SEARCH_MAX + 1) })).status()
  ).toBe(400);
});

test(
  "Only visible apps can be favourited",
  { tag: ["@TC-FAVORITES-023", "@smoke"] },
  async ({ adminApi }) => {
    const api = await freshUser("fav-authz");
    try {
      const favorites = favoritesOf(api);
      const asAdmin = favoritesOf(adminApi);
      // role=user × admin-only → 404, × inactive → 404
      expect((await favorites.add(fixtures!.adminOnly.id)).status()).toBe(404);
      expect((await favorites.add(fixtures!.inactive.id)).status()).toBe(404);
      expect(await favouriteIds(api)).toEqual([]);

      // role=admin × admin-only → 201 (then removed again)
      const ok = await asAdmin.add(fixtures!.adminOnly.id);
      expect(ok.status()).toBe(201);
      expect(await favouriteIds(adminApi)).toContain(fixtures!.adminOnly.id);
      expect((await asAdmin.remove(fixtures!.adminOnly.id)).status()).toBe(204);
      // role=admin × inactive → 404
      expect((await asAdmin.add(fixtures!.inactive.id)).status()).toBe(404);
    } finally {
      await api.dispose();
    }
  }
);

test(
  "Favourites are private to each user",
  { tag: ["@TC-FAVORITES-024", "@smoke"] },
  async () => {
    const alice = await freshUser("fav-alice");
    const bob = await freshUser("fav-bob");
    try {
      const [a, b] = await catalogByName(alice);
      expect(b, "needs two catalogue apps").toBeTruthy();
      await favoritesOf(alice).add(a._id);
      await favoritesOf(bob).add(b._id);

      expect(await favouriteIds(alice)).toEqual([a._id]);
      expect(await favouriteIds(bob)).toEqual([b._id]);

      // Bob removing Alice's app only touches Bob's (empty) row.
      expect((await favoritesOf(bob).remove(a._id)).status()).toBe(204);
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

test("Sort orders", { tag: "@TC-FAVORITES-025" }, async () => {
  const api = await freshUser("fav-sort");
  try {
    const apps = (await catalogByName(api)).slice(0, 3);
    test.skip(apps.length < 3, "needs three catalogue apps");
    for (const app of apps) {
      expect((await favoritesOf(api).add(app._id)).status()).toBe(201);
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
});

test(
  "The endpoints require a session",
  { tag: ["@TC-FAVORITES-026", "@smoke"] },
  async ({ guestApi, userApi }) => {
    const [app] = await catalogByName(userApi);
    const anonymous = favoritesOf(guestApi);
    expect((await anonymous.list()).status()).toBe(401);
    expect((await anonymous.add(app._id)).status()).toBe(401);
    expect((await anonymous.remove(app._id)).status()).toBe(401);
  }
);

test(
  "Favourites persist across sessions",
  { tag: "@TC-FAVORITES-027" },
  async () => {
    const account = await createAccount({ tag: "fav-persist" });
    const first = await apiAs(account.email, account.password);
    const [app] = await catalogByName(first);
    await favoritesOf(first).add(app._id);
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
  "Search and category narrow the list",
  { tag: "@TC-FAVORITES-028" },
  async () => {
    const api = await freshUser("fav-filter");
    try {
      const apps = (await catalogByName(api)).slice(0, 3);
      for (const app of apps) await favoritesOf(api).add(app._id);
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

test(
  "Unknown, inactive and forbidden apps get the same 404",
  { tag: "@TC-FAVORITES-032" },
  async () => {
    const api = await freshUser("fav-enum");
    try {
      const favorites = favoritesOf(api);
      const responses = [
        await favorites.add(ZERO_ID),
        await favorites.add(fixtures!.inactive.id),
        await favorites.add(fixtures!.adminOnly.id)
      ];
      const bodies = [];
      for (const res of responses) {
        expect(res.status()).toBe(404);
        bodies.push(await errorOf(res));
      }
      // Nothing tells "does not exist" apart from "exists but not for you".
      for (const body of bodies) {
        expect(body.code).toBe("FAVORITE_APP_NOT_FOUND");
        expect(body.message).toBe(bodies[0].message);
        expect(body.errors).toBeUndefined();
      }
      expect(await favouriteIds(api)).toEqual([]);
    } finally {
      await api.dispose();
    }
  }
);

test(
  "Search length boundary: 200 accepted, 201 rejected",
  { tag: "@TC-FAVORITES-033" },
  async ({ userApi }) => {
    const favorites = favoritesOf(userApi);
    const atMax = await favorites.list({ search: "a".repeat(SEARCH_MAX) });
    expect(atMax.status()).toBe(200);

    const overMax = await favorites.list({
      search: "a".repeat(SEARCH_MAX + 1)
    });
    expect(overMax.status()).toBe(400);
    const error = await errorOf(overMax);
    expect(error.code).toBe("VALIDATION_ERROR");
    expect(error.errors?.map((e) => [e.field, e.reason])).toEqual([
      ["search", "string.max"]
    ]);

    // Surrounding whitespace is trimmed before the length check.
    const padded = await favorites.list({
      search: ` ${"a".repeat(SEARCH_MAX)} `
    });
    expect(padded.status()).toBe(200);
  }
);

test(
  "Search ignores case and surrounding spaces and combines with the category",
  { tag: "@TC-FAVORITES-034" },
  async () => {
    const api = await freshUser("fav-search");
    try {
      const apps = (await catalogByName(api)).slice(0, 3);
      test.skip(apps.length < 2, "needs two catalogue apps");
      for (const app of apps) await favoritesOf(api).add(app._id);
      const target = apps.find((a) => a.categories.length > 0) ?? apps[0];

      // Case and padding do not matter.
      const shouted = await favouriteIds(api, {
        search: `  ${target.displayName.toUpperCase()}  `
      });
      expect(shouted).toContain(target._id);

      // search × categoryId is an intersection: both must match.
      if (target.categories.length > 0) {
        const own = target.categories[0]._id;
        expect(
          await favouriteIds(api, {
            search: target.displayName,
            categoryId: own
          })
        ).toContain(target._id);

        const foreign = apps
          .flatMap((a) => a.categories.map((c) => c._id))
          .find((id) => !target.categories.some((c) => c._id === id));
        if (foreign) {
          expect(
            await favouriteIds(api, {
              search: target.displayName,
              categoryId: foreign
            })
          ).not.toContain(target._id);
        }
      }
    } finally {
      await api.dispose();
    }
  }
);
