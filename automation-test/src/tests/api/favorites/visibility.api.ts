import { test, expect } from "@/fixtures";
import type { APIRequestContext } from "@playwright/test";
import { createApiClient } from "@/api";
import { adminContext, apiAs } from "@/api/session";
import type { CatalogApp } from "@/api/web-app.client";
import { setClientStatus } from "@/utils/oidc-state";
import { createAccount } from "@/utils/accounts";
import {
  catalogByName,
  createFixtureApps,
  listCatalog,
  removeFixtureApps
} from "@/utils/catalog";
import type { FixtureApps } from "@/utils/catalog";
import {
  clearOverrides,
  getUserIdByEmail,
  setAccess
} from "@/utils/entitlements";

// What may be starred, and what stays listed, follows the caller's access to
// the app — role default ± entitlement override — and the app's status.
// Test cases: test-cases/favorites.md (TC-FAVORITES-030, 031). The revoke →
// hidden → re-grant flow as the user sees it is TC-FAVORITES-029
// (tests/e2e/apps/launcher-access.e2e.ts).
//
// Overrides are written for throwaway accounts only (every flip notifies its
// target) and removed in `finally`; the admin-only fixture app is this
// file's own and is deleted in afterAll.

test.describe.configure({ mode: "serial" });

let fixtures: FixtureApps | undefined;

test.beforeAll(async () => {
  const admin = await adminContext();
  fixtures = await createFixtureApps(admin, "fav-vis");
  await admin.dispose();
});

test.afterAll(async () => {
  await removeFixtureApps(fixtures);
});

async function freshUser(tag: string) {
  const account = await createAccount({ tag });
  const api = await apiAs(account.email, account.password);
  const userId = await getUserIdByEmail(account.email);
  return { api, userId };
}

const favoritesOf = (ctx: APIRequestContext) => createApiClient(ctx).favorites;

async function favouriteIds(ctx: APIRequestContext) {
  const res = await favoritesOf(ctx).list();
  expect(res.status()).toBe(200);
  const { data } = (await res.json()) as { data: { items: CatalogApp[] } };
  return data.items.map((a) => a._id);
}

test(
  "Access, not role, decides what can be starred",
  { tag: "@TC-FAVORITES-030" },
  async () => {
    const { api, userId } = await freshUser("fav-access");
    try {
      const favorites = favoritesOf(api);
      const adminOnly = fixtures!.adminOnly.id;
      const [roleDefault] = await catalogByName(api);

      // role=user × admin-only app × no override → 404
      expect((await favorites.add(adminOnly)).status()).toBe(404);

      // × allow override → 201, listed
      await setAccess([{ userId, appId: adminOnly, granted: true }]);
      expect((await favorites.add(adminOnly)).status()).toBe(201);
      expect(await favouriteIds(api)).toEqual([adminOnly]);

      // role-default app × deny override → 404, nothing stored
      await setAccess([{ userId, appId: roleDefault._id, granted: false }]);
      expect((await favorites.add(roleDefault._id)).status()).toBe(404);
      expect(await favouriteIds(api)).toEqual([adminOnly]);
    } finally {
      await clearOverrides(userId);
      await api.dispose();
    }
  }
);

test(
  "A deactivated favourite is hidden, kept, and returns when reactivated",
  { tag: "@TC-FAVORITES-031" },
  async () => {
    const { api, userId } = await freshUser("fav-inactive");
    const admin = await adminContext();
    const app = fixtures!.adminOnly;
    try {
      await setAccess([{ userId, appId: app.id, granted: true }]);
      expect((await favoritesOf(api).add(app.id)).status()).toBe(201);
      expect(await favouriteIds(api)).toEqual([app.id]);

      // Deactivated: gone from /favorites and from the catalogue.
      await setClientStatus(admin, app, "inactive");
      expect(await favouriteIds(api)).toEqual([]);
      expect((await listCatalog(api)).items.map((a) => a._id)).not.toContain(
        app.id
      );

      // Reactivated: the star was never deleted, so it is back.
      await setClientStatus(admin, app, "active");
      expect(await favouriteIds(api)).toEqual([app.id]);
      const listed = (await listCatalog(api)).items.find(
        (a) => a._id === app.id
      );
      expect(listed?.isFavorite).toBe(true);
    } finally {
      await setClientStatus(admin, app, "active");
      await clearOverrides(userId);
      await Promise.all([api.dispose(), admin.dispose()]);
    }
  }
);
