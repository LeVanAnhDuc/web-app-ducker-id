import { test, expect } from "@/fixtures";
import type { APIRequestContext } from "@playwright/test";
import { createApiClient } from "@/api";
import type { RecentAppClient, RecentAppsPage } from "@/api/recent-app.client";
import { dataOf, errorOf } from "@/api/response";
import {
  adminContext,
  apiAs,
  bearerContext,
  loginOverApi
} from "@/api/session";
import type { CatalogApp } from "@/api/web-app.client";
import { serverMessage } from "@/data/copy";
import { createAccount } from "@/utils/accounts";
import type { Account } from "@/utils/accounts";
import { catalogByName } from "@/utils/catalog";
import { ageRecentUse } from "@/utils/recent-apps";
import {
  deleteOidcClients,
  obtainCode,
  registerClient,
  signedInUser
} from "@/utils/oidc-state";
import type { OidcClient } from "@/utils/oidc";

// /users/me/recent-apps — record, list, hide / restore / clear, the
// 60-second dedupe window, pagination and search, isolation and auth, the
// per-user rate limit and the record an OIDC sign-in leaves behind.
// Test cases: test-cases/recently-used.md (TC-RECENTLYUSED-020 … 028, 035 … 037).
//
// Every case runs on throwaway accounts; the seeded user's history is never
// touched. The one OAuth client is registered and deleted by this file.

interface Fresh {
  account: Account;
  api: APIRequestContext;
  recent: RecentAppClient;
  apps: CatalogApp[];
}

async function fresh(tag: string): Promise<Fresh> {
  const account = await createAccount({ tag });
  const api = await apiAs(account.email, account.password);
  return {
    account,
    api,
    recent: createApiClient(api).recentApps,
    apps: await catalogByName(api)
  };
}

async function list(
  recent: RecentAppClient,
  params = {}
): Promise<RecentAppsPage> {
  const res = await recent.list(params);
  expect(res.status()).toBe(200);
  return dataOf<RecentAppsPage>(res);
}

test(
  "List contract: one row per app, newest first",
  { tag: ["@TC-RECENTLYUSED-020", "@smoke"] },
  async () => {
    const { api, recent, apps } = await fresh("recent-contract");
    try {
      const [a, b] = apps;
      expect((await recent.record(a._id)).status()).toBe(204);
      expect((await recent.record(b._id)).status()).toBe(204);
      expect((await recent.record(a._id)).status()).toBe(204);

      const { items, meta } = await list(recent);
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
  "The dedupe window counts one open per minute",
  { tag: "@TC-RECENTLYUSED-021" },
  async () => {
    const { account, api, recent, apps } = await fresh("recent-dedupe");
    try {
      const app = apps[0];
      await recent.record(app._id);
      await recent.record(app._id); // inside the window
      expect((await list(recent)).items[0].useCount).toBe(1);

      // 59 s ago is still inside the 60 s window.
      await ageRecentUse(account.email, app._id, 59_000);
      await recent.record(app._id);
      expect((await list(recent)).items[0].useCount).toBe(1);

      // 61 s ago is outside it.
      await ageRecentUse(account.email, app._id, 61_000);
      await recent.record(app._id);
      expect((await list(recent)).items[0].useCount).toBe(2);
    } finally {
      await api.dispose();
    }
  }
);

test(
  "Hide, restore, clear and re-record",
  { tag: ["@TC-RECENTLYUSED-022", "@smoke"] },
  async () => {
    const { account, api, recent, apps } = await fresh("recent-hide");
    try {
      const [a, b] = apps;
      await recent.record(a._id);
      await recent.record(b._id);
      await ageRecentUse(account.email, a._id, 120_000);
      await recent.record(a._id); // useCount 2

      expect((await recent.hide(a._id)).status()).toBe(204);
      expect((await list(recent)).items.map((i) => i._id)).toEqual([b._id]);

      // Undo restores the row with its count intact.
      expect((await recent.restore(a._id)).status()).toBe(204);
      const restored = (await list(recent)).items.find((i) => i._id === a._id);
      expect(restored?.useCount).toBe(2);

      // Clear hides everything.
      expect((await recent.clear()).status()).toBe(204);
      expect((await list(recent)).items).toEqual([]);
      expect((await list(recent)).meta).toMatchObject({
        total: 0,
        totalPages: 0
      });

      // Opening a cleared app starts its count again from one.
      await recent.record(a._id);
      const again = await list(recent);
      expect(again.items.map((i) => i._id)).toEqual([a._id]);
      expect(again.items[0].useCount).toBe(1);
    } finally {
      await api.dispose();
    }
  }
);

test.describe("pagination and search", () => {
  test(
    "Page and limit boundaries",
    { tag: "@TC-RECENTLYUSED-023" },
    async () => {
      const { api, recent, apps } = await fresh("recent-paging");
      try {
        const used = apps.slice(0, 3);
        for (const app of used) await recent.record(app._id);

        const p1 = await list(recent, { limit: 1, page: 1 });
        expect(p1.items).toHaveLength(1);
        expect(p1.meta).toMatchObject({ total: 3, totalPages: 3 });
        const p3 = await list(recent, { limit: 1, page: 3 });
        expect(p3.items).toHaveLength(1);
        const p4 = await list(recent, { limit: 1, page: 4 });
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
          [{ search: "a".repeat(200) }, 200],
          [{ search: "a".repeat(201) }, 400]
        ] as const) {
          const res = await recent.list(params);
          expect(res.status(), JSON.stringify(params)).toBe(status);
        }
      } finally {
        await api.dispose();
      }
    }
  );

  test("Search over the history", { tag: "@TC-RECENTLYUSED-024" }, async () => {
    const { api, recent, apps } = await fresh("recent-search");
    try {
      const [a, b] = apps;
      await recent.record(a._id);
      await recent.record(b._id);
      const hit = await list(recent, { search: a.displayName });
      expect(hit.items.map((i) => i._id)).toContain(a._id);
      expect(hit.meta.total).toBe(hit.items.length);
      const miss = await list(recent, { search: "zzz-no-such-app" });
      expect(miss.items).toEqual([]);
      expect(miss.meta.total).toBe(0);
    } finally {
      await api.dispose();
    }
  });

  test(
    "Search ignores surrounding spaces and letter case",
    { tag: "@TC-RECENTLYUSED-036" },
    async () => {
      const { api, recent, apps } = await fresh("recent-search-case");
      try {
        const [a] = apps;
        await recent.record(a._id);
        for (const search of [
          `  ${a.displayName}  `,
          a.displayName.toUpperCase(),
          a.displayName.toLowerCase()
        ]) {
          const hit = await list(recent, { search });
          expect(
            hit.items.map((i) => i._id),
            JSON.stringify(search)
          ).toEqual([a._id]);
        }
      } finally {
        await api.dispose();
      }
    }
  );
});

test("Id validation", { tag: "@TC-RECENTLYUSED-025" }, async () => {
  const { api, recent } = await fresh("recent-valid");
  try {
    expect((await recent.record("not-an-id")).status()).toBe(400);
    expect((await recent.hide("not-an-id")).status()).toBe(400);
    expect((await recent.restore("not-an-id")).status()).toBe(400);
    const unknown = await recent.record("ffffffffffffffffffffffff");
    expect(unknown.status()).toBe(404);
    expect((await errorOf(unknown)).code).toBeTruthy();
  } finally {
    await api.dispose();
  }
});

test(
  "Hide and restore can be repeated safely",
  { tag: "@TC-RECENTLYUSED-035" },
  async () => {
    const { api, recent, apps } = await fresh("recent-idempotent");
    try {
      const [a, b] = apps;
      await recent.record(a._id);

      // Twice in a row: the second call changes nothing and still succeeds.
      expect((await recent.hide(a._id)).status()).toBe(204);
      expect((await recent.hide(a._id)).status()).toBe(204);
      expect((await list(recent)).items).toEqual([]);
      expect((await recent.restore(a._id)).status()).toBe(204);
      expect((await recent.restore(a._id)).status()).toBe(204);
      expect((await list(recent)).items.map((i) => i._id)).toEqual([a._id]);

      // An app never opened (b): hiding or restoring it creates no row.
      expect((await recent.hide(b._id)).status()).toBe(204);
      expect((await recent.restore(b._id)).status()).toBe(204);
      expect((await list(recent)).items.map((i) => i._id)).toEqual([a._id]);
    } finally {
      await api.dispose();
    }
  }
);

test(
  "Every endpoint requires a session",
  { tag: ["@TC-RECENTLYUSED-026", "@smoke"] },
  async ({ guestApi, userApi }) => {
    const [app] = await catalogByName(userApi);
    const guest = createApiClient(guestApi).recentApps;
    expect((await guest.list()).status()).toBe(401);
    expect((await guest.stats()).status()).toBe(401);
    expect((await guest.record(app._id)).status()).toBe(401);
    expect((await guest.hide(app._id)).status()).toBe(401);
    expect((await guest.restore(app._id)).status()).toBe(401);
    expect((await guest.clear()).status()).toBe(401);
  }
);

test(
  "History is private to each user",
  { tag: ["@TC-RECENTLYUSED-027", "@smoke"] },
  async () => {
    const alice = await fresh("recent-alice");
    const bob = await fresh("recent-bob");
    try {
      const [a, b] = alice.apps;
      await alice.recent.record(a._id);
      await bob.recent.record(b._id);

      expect((await list(alice.recent)).items.map((i) => i._id)).toEqual([
        a._id
      ]);
      expect((await list(bob.recent)).items.map((i) => i._id)).toEqual([b._id]);

      await bob.recent.hide(a._id);
      await bob.recent.clear();
      expect((await list(alice.recent)).items.map((i) => i._id)).toEqual([
        a._id
      ]);
    } finally {
      await Promise.all([alice.api.dispose(), bob.api.dispose()]);
    }
  }
);

test.describe("rate limit", () => {
  test.use({ keepRateLimits: true });

  test(
    "Recording is rate-limited per user",
    { tag: "@TC-RECENTLYUSED-037" },
    async () => {
      // 61 sequential requests, each a round trip to the cloud Redis, take
      // ~27 s against the 30 s default — too close to the limit.
      test.slow();
      // Fresh accounts: the limiter is keyed by user id, so no other test's
      // counter can be in the way. English messages need Accept-Language.
      const session = async (tag: string) => {
        const account = await createAccount({ tag });
        const login = await loginOverApi(account.email, account.password);
        expect(login.status, `login ${tag}`).toBe(200);
        return bearerContext(login.accessToken!, { "Accept-Language": "en" });
      };
      const first = await session("recent-rl-a");
      const second = await session("recent-rl-b");
      try {
        const [app] = await catalogByName(first);
        const recent = createApiClient(first).recentApps;

        // RATE_LIMIT_CONFIG.RECENT_APP.RECORD.PER_USER: 60 requests / 60 s.
        for (let i = 1; i <= 60; i += 1) {
          expect((await recent.record(app._id)).status(), `#${i}`).toBe(204);
        }
        const limited = await recent.record(app._id);
        expect(limited.status()).toBe(429);
        const error = await errorOf(limited);
        expect(error.code).toBe("TOO_MANY_REQUESTS");
        expect(error.message).toBe(
          serverMessage.recentApp.errors.rateLimitExceeded
        );

        // Per user, not per IP: another account on the same machine still records.
        expect(
          (await createApiClient(second).recentApps.record(app._id)).status()
        ).toBe(204);
      } finally {
        await Promise.all([first.dispose(), second.dispose()]);
      }
    }
  );
});

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
    "Signing in to a satellite app records it as used",
    { tag: ["@TC-RECENTLYUSED-028", "@smoke"] },
    async () => {
      const signed = await signedInUser("recent-sso");
      const api = await apiAs(signed.account.email, signed.account.password);
      const recent = createApiClient(api).recentApps;
      try {
        expect((await list(recent)).items).toEqual([]);
        await obtainCode(signed.ctx, client!);
        await expect
          .poll(async () => (await list(recent)).items.map((i) => i._id))
          .toEqual([client!.id]);
        expect((await list(recent)).items[0].useCount).toBe(1);
      } finally {
        await Promise.all([api.dispose(), signed.ctx.dispose()]);
      }
    }
  );
});
