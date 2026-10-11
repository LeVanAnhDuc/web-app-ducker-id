import { test, expect, apiAs } from "@fixtures";
import type { APIRequestContext } from "@playwright/test";
import { request } from "@playwright/test";
import { createAccount } from "@helpers/accounts";
import type { Account } from "@helpers/accounts";
import { BASE_URL } from "@helpers/env";
import { adminContext } from "@helpers/catalog";
import {
  deleteOidcClients,
  obtainCode,
  registerClient,
  signedInUser
} from "@helpers/oidc";
import type { OidcClient } from "@helpers/oidc";

// GET /api/v1/login-history — the caller's own sign-in attempts: contract,
// failed attempts with their reason, filters, paging, validation, isolation
// between users, the admin endpoint's guard, and SSO rows.
// Test cases: test-cases/login-history.md (TC-LOGHIST-020 … 028).
//
// Exact counts come from throwaway accounts (a fresh account's history is
// only what the test did); the seeded user is read for shape only.

const HISTORY = "/api/v1/login-history";

interface Row {
  _id: string;
  method: string;
  status: string;
  failReason: string | null;
  ip: string;
  country: string;
  city: string;
  deviceType: string;
  os: string;
  browser: string;
  clientType: string;
  createdAt: string;
  source: string;
  app: { id: string | null; name: string; iconUrl: string | null } | null;
  interactive: boolean;
  isAnomaly?: boolean;
}

async function rows(api: APIRequestContext, params = {}) {
  const res = await api.get(HISTORY, { params });
  expect(res.status(), await res.text()).toBe(200);
  return (
    (await res.json()) as {
      data: { items: Row[]; meta: Record<string, number> };
    }
  ).data;
}

/** A failed password attempt from a cookie-less context. */
async function failOnce(account: Account) {
  const ctx = await request.newContext({
    baseURL: BASE_URL,
    storageState: { cookies: [], origins: [] }
  });
  const res = await ctx.post("/api/v1/auth/login", {
    data: { email: account.email, password: "Wrong@12345" }
  });
  expect(res.ok()).toBe(false);
  await ctx.dispose();
}

test(
  "contract: every documented field, newest first, page meta",
  { tag: ["@TC-LOGHIST-020", "@smoke"] },
  async ({ userApi }) => {
    const { items, meta } = await rows(userApi, { limit: 5 });
    expect(meta).toMatchObject({ page: 1, limit: 5 });
    expect(items.length).toBeGreaterThan(0);
    for (const r of items) {
      for (const key of [
        "_id",
        "method",
        "status",
        "failReason",
        "ip",
        "country",
        "city",
        "deviceType",
        "os",
        "browser",
        "clientType",
        "createdAt",
        "source",
        "app",
        "interactive"
      ]) {
        expect(r, key).toHaveProperty(key);
      }
      expect(["success", "failed"]).toContain(r.status);
      expect(["idp", "oauth"]).toContain(r.source);
      // The raw IPv6 forms the server used to store never reach the client.
      expect(r.ip).not.toMatch(/^::ffff:|^::1$/);
    }
    for (let i = 1; i < items.length; i += 1) {
      expect(Date.parse(items[i - 1].createdAt)).toBeGreaterThanOrEqual(
        Date.parse(items[i].createdAt)
      );
    }
  }
);

test(
  "a wrong password is listed as failed with its reason",
  { tag: "@TC-LOGHIST-021" },
  async () => {
    const account = await createAccount({ tag: "lh-fail" });
    await failOnce(account);
    const api = await apiAs(account.email, account.password);
    try {
      const { items } = await rows(api);
      const failed = items.filter((r) => r.status === "failed");
      expect(failed).toHaveLength(1);
      expect(failed[0].method).toBe("password");
      expect(failed[0].failReason).toBeTruthy();
      const ok = items.filter((r) => r.status === "success");
      expect(ok.length).toBeGreaterThanOrEqual(1);
      expect(ok.every((r) => r.failReason === null)).toBe(true);
    } finally {
      await api.dispose();
    }
  }
);

test(
  "each row carries the anomaly flag",
  { tag: "@TC-LOGHIST-022" },
  async ({ userApi }) => {
    // BUG: BUG-014 — REQ-LOGHIST-01 lists an anomaly flag on the user's own history,
    // but MyHistoryItemDto has no isAnomaly — only the admin DTO does.
    test.fail();
    const { items } = await rows(userApi, { limit: 5 });
    for (const r of items) expect(typeof r.isAnomaly).toBe("boolean");
  }
);

test(
  "filters: status, method, source and date [EP][DT]",
  { tag: "@TC-LOGHIST-023" },
  async () => {
    const account = await createAccount({ tag: "lh-filter" });
    await failOnce(account);
    const api = await apiAs(account.email, account.password);
    try {
      const all = await rows(api);
      const failed = await rows(api, { status: "failed" });
      const success = await rows(api, { status: "success" });
      expect(failed.items.every((r) => r.status === "failed")).toBe(true);
      expect(success.items.every((r) => r.status === "success")).toBe(true);
      expect(failed.meta.total + success.meta.total).toBe(all.meta.total);

      const pw = await rows(api, { method: "password", status: "failed" });
      expect(pw.items).toHaveLength(1);
      expect((await rows(api, { method: "otp" })).items).toEqual([]);
      expect((await rows(api, { source: "oauth" })).items).toEqual([]);
      expect((await rows(api, { source: "idp" })).meta.total).toBe(
        all.meta.total
      );

      // A date-only bound covers the whole day.
      const today = new Date().toISOString().slice(0, 10);
      const yesterday = new Date(Date.now() - 86_400_000)
        .toISOString()
        .slice(0, 10);
      const tomorrow = new Date(Date.now() + 86_400_000)
        .toISOString()
        .slice(0, 10);
      expect(
        (await rows(api, { fromDate: yesterday, toDate: tomorrow })).meta.total
      ).toBe(all.meta.total);
      expect(
        (await rows(api, { fromDate: tomorrow })).items,
        `nothing after ${today}`
      ).toEqual([]);
    } finally {
      await api.dispose();
    }
  }
);

test(
  "validation and page boundaries [EP][BVA]",
  { tag: "@TC-LOGHIST-024" },
  async ({ userApi }) => {
    for (const [params, status] of [
      [{ status: "maybe" }, 400],
      [{ method: "telepathy" }, 400],
      [{ deviceType: "FRIDGE" }, 400],
      [{ source: "elsewhere" }, 400],
      [{ interactive: "sometimes" }, 400],
      [{ webAppId: "nope" }, 400],
      [{ fromDate: "yesterday" }, 400],
      [{ fromDate: "2026-10-05", toDate: "2026-10-01" }, 400],
      [{ sortBy: "password" }, 400],
      [{ page: 0 }, 400],
      [{ limit: 0 }, 400],
      [{ limit: 1 }, 200],
      [{ limit: 100 }, 200],
      [{ limit: 101 }, 400]
    ] as const) {
      const res = await userApi.get(HISTORY, { params });
      expect(res.status(), JSON.stringify(params)).toBe(status);
    }
    const first = await rows(userApi, { limit: 1 });
    const beyond = await rows(userApi, {
      limit: 1,
      page: first.meta.totalPages + 1
    });
    expect(beyond.items).toEqual([]);
    expect(beyond.meta.total).toBe(first.meta.total);
  }
);

test(
  "a user never sees another user's attempts",
  { tag: ["@TC-LOGHIST-025", "@smoke"] },
  async ({ userApi }) => {
    const alice = await createAccount({ tag: "lh-alice" });
    const bob = await createAccount({ tag: "lh-bob" });
    await failOnce(bob);
    const aliceApi = await apiAs(alice.email, alice.password);
    try {
      const mine = await rows(aliceApi, { limit: 100 });
      // Alice's own history: her sign-up session and this sign-in — all
      // successful. Bob's failed attempt is not hers.
      expect(mine.items.every((r) => r.status === "success")).toBe(true);
      const seeded = await rows(userApi, { limit: 100 });
      const seededIds = new Set(seeded.items.map((r) => r._id));
      expect(mine.items.some((r) => seededIds.has(r._id))).toBe(false);

      // A userId filter is not part of the user endpoint: it is stripped,
      // so it cannot be used to read someone else's rows.
      const tampered = await rows(aliceApi, {
        userId: "ffffffffffffffffffffffff",
        limit: 100
      });
      expect(tampered.meta.total).toBe(mine.meta.total);
    } finally {
      await aliceApi.dispose();
    }
  }
);

test(
  "the endpoints require a session, and the admin list requires admin",
  { tag: "@TC-LOGHIST-026" },
  async ({ guestApi, userApi }) => {
    expect((await guestApi.get(HISTORY)).status()).toBe(401);
    expect((await guestApi.get(`${HISTORY}/stats`)).status()).toBe(401);
    expect((await userApi.get("/api/v1/admin/login-history")).status()).toBe(
      403
    );
  }
);

test.describe("SSO rows", () => {
  let client: OidcClient | undefined;

  test.beforeAll(async () => {
    const admin = await adminContext();
    client = await registerClient(admin, { kind: "public", label: "lh-api" });
    await admin.dispose();
  });

  test.afterAll(async () => {
    if (client) await deleteOidcClients([client]);
  });

  test(
    "a silent SSO is listed with the app, source oauth and interactive false",
    { tag: "@TC-LOGHIST-027" },
    async () => {
      const signed = await signedInUser("lh-sso");
      const api = await apiAs(signed.account.email, signed.account.password);
      try {
        await obtainCode(signed.ctx, client!);
        await expect
          .poll(async () => (await rows(api, { method: "sso" })).items.length)
          .toBe(1);
        const [sso] = (await rows(api, { method: "sso" })).items;
        expect(sso).toMatchObject({
          method: "sso",
          status: "success",
          source: "oauth",
          interactive: false
        });
        expect(sso.app).toMatchObject({
          id: client!.id,
          name: client!.displayName
        });

        // The app filter: webAppId narrows to that app, source=idp excludes it.
        expect(
          (await rows(api, { webAppId: client!.id })).items.map((r) => r._id)
        ).toEqual([sso._id]);
        expect(
          (await rows(api, { source: "idp" })).items.map((r) => r._id)
        ).not.toContain(sso._id);
        expect(
          (await rows(api, { interactive: false })).items.map((r) => r._id)
        ).toEqual([sso._id]);
      } finally {
        await Promise.all([api.dispose(), signed.ctx.dispose()]);
      }
    }
  );
});
