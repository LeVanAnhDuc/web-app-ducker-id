import { test, expect, apiAs } from "@fixtures";
import type { APIRequestContext } from "@playwright/test";
import { createAccount } from "@helpers/accounts";
import type { Account } from "@helpers/accounts";
import { adminContext, catalogByName } from "@helpers/catalog";
import type { CatalogApp } from "@helpers/catalog";
import { ageRecentUse } from "@helpers/recentApps";
import {
  deleteOidcClients,
  obtainCode,
  registerClient,
  signedInUser
} from "@helpers/oidc";
import type { OidcClient } from "@helpers/oidc";

// /api/v1/users/me/recent-apps — record, list, hide / restore / clear, the
// 60-second dedupe window, pagination and search, isolation and auth, and
// the record an OIDC sign-in leaves behind.
// Test cases: test-cases/recently-used.md (TC-RECENT-020 … 028).
//
// Every case runs on throwaway accounts; the seeded user's history is never
// touched. The one OAuth client is registered and deleted by this file.

const RECENT = "/api/v1/users/me/recent-apps";

interface RecentItem extends CatalogApp {
  lastUsedAt: string;
  useCount: number;
}

interface Fresh {
  account: Account;
  api: APIRequestContext;
  apps: CatalogApp[];
}

async function fresh(tag: string): Promise<Fresh> {
  const account = await createAccount({ tag });
  const api = await apiAs(account.email, account.password);
  return { account, api, apps: await catalogByName(api) };
}

async function list(api: APIRequestContext, params = {}) {
  const res = await api.get(RECENT, { params });
  expect(res.status()).toBe(200);
  return (
    (await res.json()) as {
      data: { items: RecentItem[]; meta: Record<string, number> };
    }
  ).data;
}

const record = (api: APIRequestContext, id: string) =>
  api.post(`${RECENT}/${id}`);

test(
  "list contract: each app once, newest first, with count and time",
  { tag: ["@TC-RECENT-020", "@smoke"] },
  async () => {
    const { api, apps } = await fresh("recent-contract");
    try {
      const [a, b] = apps;
      expect((await record(api, a._id)).status()).toBe(204);
      expect((await record(api, b._id)).status()).toBe(204);
      expect((await record(api, a._id)).status()).toBe(204);

      const { items, meta } = await list(api);
      expect(items.map((i) => i._id)).toEqual([a._id, b._id]);
      expect(meta).toMatchObject({ total: 2, page: 1, totalPages: 1 });
      for (const item of items) {
        expect(new Date(item.lastUsedAt).toString()).not.toBe("Invalid Date");
        expect(item.useCount).toBeGreaterThanOrEqual(1);
        expect(typeof item.isFavorite).toBe("boolean");
      }
      expect(Date.parse(items[0].lastUsedAt)).toBeGreaterThanOrEqual(
        Date.parse(items[1].lastUsedAt)
      );
    } finally {
      await api.dispose();
    }
  }
);

test(
  "opens 60 s apart count twice, opens inside the window count once [BVA]",
  { tag: "@TC-RECENT-021" },
  async () => {
    const { account, api, apps } = await fresh("recent-dedupe");
    try {
      const app = apps[0];
      await record(api, app._id);
      await record(api, app._id); // inside the window
      expect((await list(api)).items[0].useCount).toBe(1);

      // 59 s ago is still inside the 60 s window.
      await ageRecentUse(account.email, app._id, 59_000);
      await record(api, app._id);
      expect((await list(api)).items[0].useCount).toBe(1);

      // 61 s ago is outside it.
      await ageRecentUse(account.email, app._id, 61_000);
      await record(api, app._id);
      expect((await list(api)).items[0].useCount).toBe(2);
    } finally {
      await api.dispose();
    }
  }
);

test(
  "hide → restore → clear → record again [ST]",
  { tag: ["@TC-RECENT-022", "@smoke"] },
  async () => {
    const { account, api, apps } = await fresh("recent-hide");
    try {
      const [a, b] = apps;
      await record(api, a._id);
      await record(api, b._id);
      await ageRecentUse(account.email, a._id, 120_000);
      await record(api, a._id); // useCount 2

      expect((await api.delete(`${RECENT}/${a._id}`)).status()).toBe(204);
      expect((await list(api)).items.map((i) => i._id)).toEqual([b._id]);

      // Undo restores the row with its count intact.
      expect((await api.post(`${RECENT}/${a._id}/restore`)).status()).toBe(204);
      const restored = (await list(api)).items.find((i) => i._id === a._id);
      expect(restored?.useCount).toBe(2);

      // Clear hides everything.
      expect((await api.delete(RECENT)).status()).toBe(204);
      expect((await list(api)).items).toEqual([]);
      expect((await list(api)).meta).toMatchObject({ total: 0, totalPages: 0 });

      // Opening a cleared app starts its count again from one.
      await record(api, a._id);
      const again = await list(api);
      expect(again.items.map((i) => i._id)).toEqual([a._id]);
      expect(again.items[0].useCount).toBe(1);
    } finally {
      await api.dispose();
    }
  }
);

test.describe("pagination and search", () => {
  test("page / limit boundaries [BVA]", { tag: "@TC-RECENT-023" }, async () => {
    const { api, apps } = await fresh("recent-paging");
    try {
      const used = apps.slice(0, 3);
      for (const app of used) await record(api, app._id);

      const p1 = await list(api, { limit: 1, page: 1 });
      expect(p1.items).toHaveLength(1);
      expect(p1.meta).toMatchObject({ total: 3, totalPages: 3 });
      const p3 = await list(api, { limit: 1, page: 3 });
      expect(p3.items).toHaveLength(1);
      const p4 = await list(api, { limit: 1, page: 4 });
      expect(p4.items).toEqual([]);
      expect(
        new Set([p1.items[0]._id, p3.items[0]._id]).size,
        "pages do not overlap"
      ).toBe(2);

      for (const [params, status] of [
        [{ page: 0 }, 400],
        [{ page: "abc" }, 400],
        [{ limit: 0 }, 400],
        [{ limit: 100 }, 200],
        [{ limit: 101 }, 400],
        [{ search: "a".repeat(201) }, 400]
      ] as const) {
        const res = await api.get(RECENT, { params });
        expect(res.status(), JSON.stringify(params)).toBe(status);
      }
    } finally {
      await api.dispose();
    }
  });

  test(
    "search narrows the history to matching apps",
    { tag: "@TC-RECENT-024" },
    async () => {
      const { api, apps } = await fresh("recent-search");
      try {
        const [a, b] = apps;
        await record(api, a._id);
        await record(api, b._id);
        const hit = await list(api, { search: a.displayName });
        expect(hit.items.map((i) => i._id)).toContain(a._id);
        expect(hit.meta.total).toBe(hit.items.length);
        const miss = await list(api, { search: "zzz-no-such-app" });
        expect(miss.items).toEqual([]);
        expect(miss.meta.total).toBe(0);
      } finally {
        await api.dispose();
      }
    }
  );
});

test(
  "validation: malformed id 400, unknown app 404",
  { tag: "@TC-RECENT-025" },
  async () => {
    const { api } = await fresh("recent-valid");
    try {
      expect((await record(api, "not-an-id")).status()).toBe(400);
      expect((await api.delete(`${RECENT}/not-an-id`)).status()).toBe(400);
      expect((await api.post(`${RECENT}/not-an-id/restore`)).status()).toBe(
        400
      );
      const unknown = await record(api, "ffffffffffffffffffffffff");
      expect(unknown.status()).toBe(404);
      expect((await unknown.json()).code).toBeTruthy();
    } finally {
      await api.dispose();
    }
  }
);

test(
  "every endpoint requires a session",
  { tag: "@TC-RECENT-026" },
  async ({ guestApi, userApi }) => {
    const [app] = await catalogByName(userApi);
    expect((await guestApi.get(RECENT)).status()).toBe(401);
    expect((await guestApi.get(`${RECENT}/stats`)).status()).toBe(401);
    expect((await guestApi.post(`${RECENT}/${app._id}`)).status()).toBe(401);
    expect((await guestApi.delete(`${RECENT}/${app._id}`)).status()).toBe(401);
    expect((await guestApi.post(`${RECENT}/${app._id}/restore`)).status()).toBe(
      401
    );
    expect((await guestApi.delete(RECENT)).status()).toBe(401);
  }
);

test(
  "history is private: another user's hide or clear never touches mine",
  { tag: ["@TC-RECENT-027", "@smoke"] },
  async () => {
    const alice = await fresh("recent-alice");
    const bob = await fresh("recent-bob");
    try {
      const [a, b] = alice.apps;
      await record(alice.api, a._id);
      await record(bob.api, b._id);

      expect((await list(alice.api)).items.map((i) => i._id)).toEqual([a._id]);
      expect((await list(bob.api)).items.map((i) => i._id)).toEqual([b._id]);

      await bob.api.delete(`${RECENT}/${a._id}`);
      await bob.api.delete(RECENT);
      expect((await list(alice.api)).items.map((i) => i._id)).toEqual([a._id]);
    } finally {
      await Promise.all([alice.api.dispose(), bob.api.dispose()]);
    }
  }
);

test.describe("sign-in through Ducker ID", () => {
  let client: OidcClient | undefined;

  test.beforeAll(async () => {
    const admin = await adminContext();
    client = await registerClient(admin, {
      kind: "public",
      label: "recent-sso"
    });
    await admin.dispose();
  });

  test.afterAll(async () => {
    if (client) await deleteOidcClients([client]);
  });

  test(
    "a satellite-app sign-in records the app as used",
    { tag: "@TC-RECENT-028" },
    async () => {
      const signed = await signedInUser("recent-sso");
      const api = await apiAs(signed.account.email, signed.account.password);
      try {
        expect((await list(api)).items).toEqual([]);
        await obtainCode(signed.ctx, client!);
        await expect
          .poll(async () => (await list(api)).items.map((i) => i._id))
          .toEqual([client!.id]);
        expect((await list(api)).items[0].useCount).toBe(1);
      } finally {
        await Promise.all([api.dispose(), signed.ctx.dispose()]);
      }
    }
  );
});
