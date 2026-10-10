import { test, expect, apiAs } from "@fixtures";
import type { APIRequestContext } from "@playwright/test";
import { createAccount } from "@helpers/accounts";
import { catalogByName } from "@helpers/catalog";
import { ageRecentUse } from "@helpers/recentApps";

// The two endpoints behind every figure on Home:
//   GET /api/v1/login-history/stats      — sign-ins per day, method, device
//   GET /api/v1/users/me/recent-apps/stats — app counts and the top-apps ranking
// Contract, range / timezone / limit validation, internal consistency of the
// numbers, authorisation and isolation between users.
// Test cases: test-cases/home.md (TC-HOME-030 … 036).

const LOGIN_STATS = "/api/v1/login-history/stats";
const APP_STATS = "/api/v1/users/me/recent-apps/stats";

interface LoginStats {
  total: number;
  successful: number;
  failed: number;
  byMethod: Record<string, number>;
  byDevice: Record<string, number>;
  byDay: { date: string; total: number; successful: number; failed: number }[];
  anomalies: number;
  range: { from: string; to: string; days: number; timezone: string };
}

interface AppStats {
  totalApps: number;
  activeLast7Days: number;
  activeLast30Days: number;
  topApps: { appId: string; displayName: string; useCount: number }[];
}

async function loginStats(api: APIRequestContext, params = {}) {
  const res = await api.get(LOGIN_STATS, { params });
  expect(res.status(), await res.text()).toBe(200);
  return ((await res.json()) as { data: LoginStats }).data;
}

async function appStats(api: APIRequestContext, params = {}) {
  const res = await api.get(APP_STATS, { params });
  expect(res.status(), await res.text()).toBe(200);
  return ((await res.json()) as { data: AppStats }).data;
}

const sum = (o: Record<string, number>) =>
  Object.values(o).reduce((a, b) => a + b, 0);

test(
  "sign-in stats: one zero-filled bucket per day and consistent totals",
  { tag: ["@TC-HOME-030", "@smoke"] },
  async ({ userApi }) => {
    for (const range of ["7d", "30d", "90d"] as const) {
      const s = await loginStats(userApi, { range, tz: "Asia/Ho_Chi_Minh" });
      const days = Number(range.replace("d", ""));
      expect(s.range.days).toBe(days);
      expect(s.byDay).toHaveLength(days);
      // `from` / `to` are instants; the buckets are local calendar days, and
      // the last one is today in the requested timezone.
      const localDay = (d: Date | string) =>
        new Intl.DateTimeFormat("en-CA", {
          timeZone: "Asia/Ho_Chi_Minh"
        }).format(new Date(d));
      expect(s.byDay[0].date).toBe(localDay(s.range.from));
      expect(s.byDay[days - 1].date).toBe(localDay(new Date()));
      // Consecutive calendar days, no gap.
      for (let i = 1; i < s.byDay.length; i += 1) {
        const prev = Date.parse(`${s.byDay[i - 1].date}T00:00:00Z`);
        const cur = Date.parse(`${s.byDay[i].date}T00:00:00Z`);
        expect(cur - prev).toBe(86_400_000);
      }
      expect(s.successful + s.failed).toBe(s.total);
      expect(s.byDay.reduce((a, d) => a + d.total, 0)).toBe(s.total);
      for (const d of s.byDay) expect(d.successful + d.failed).toBe(d.total);
    }
  }
);

test(
  "range and timezone validation [EP][BVA]",
  { tag: "@TC-HOME-031" },
  async ({ userApi }) => {
    // Default range is 7 days.
    expect((await loginStats(userApi)).range.days).toBe(7);

    for (const range of ["1d", "6d", "8d", "91d", "999d", "7", "week"]) {
      const res = await userApi.get(LOGIN_STATS, { params: { range } });
      expect(res.status(), range).toBe(400);
    }
    // Both spellings Chrome may report are accepted.
    for (const tz of [
      "Asia/Ho_Chi_Minh",
      "Asia/Saigon",
      "UTC",
      "Europe/Paris"
    ]) {
      const s = await loginStats(userApi, { tz });
      expect([tz, "Asia/Ho_Chi_Minh", "Asia/Saigon"]).toContain(
        s.range.timezone
      );
    }
    for (const tz of ["Mars/Olympus", "not a zone", "x".repeat(65)]) {
      const res = await userApi.get(LOGIN_STATS, { params: { tz } });
      expect(res.status(), tz).toBe(400);
    }
  }
);

test(
  "method and device breakdowns cover every key and add up to the total",
  { tag: "@TC-HOME-032" },
  async ({ userApi }) => {
    const s = await loginStats(userApi, { range: "30d" });
    expect(Object.keys(s.byMethod).sort()).toEqual(
      ["forgot-password", "magic-link", "otp", "password", "sso"].sort()
    );
    expect(Object.keys(s.byDevice).sort()).toEqual(
      ["DESKTOP", "MOBILE", "TABLET", "UNKNOWN"].sort()
    );
    expect(sum(s.byMethod)).toBe(s.total);
    expect(sum(s.byDevice)).toBe(s.total);
    expect(s.anomalies).toBeGreaterThanOrEqual(0);
    expect(s.anomalies).toBeLessThanOrEqual(s.total);
  }
);

test(
  "top apps are ranked by lifetime opens and honour the limit [BVA]",
  { tag: ["@TC-HOME-033", "@smoke"] },
  async () => {
    const account = await createAccount({ tag: "home-top" });
    const api = await apiAs(account.email, account.password);
    try {
      const [a, b, c] = await catalogByName(api);
      // a: 3 opens, b: 2 opens, c: 1 open — stepping past the 60 s dedupe.
      for (const [app, opens] of [
        [a, 3],
        [b, 2],
        [c, 1]
      ] as const) {
        for (let i = 0; i < opens; i += 1) {
          if (i > 0) await ageRecentUse(account.email, app._id, 61_000);
          expect(
            (await api.post(`/api/v1/users/me/recent-apps/${app._id}`)).status()
          ).toBe(204);
        }
      }

      const s = await appStats(api);
      expect(s.totalApps).toBe(3);
      expect(s.activeLast7Days).toBe(3);
      expect(s.activeLast30Days).toBe(3);
      expect(s.topApps.map((t) => [t.appId, t.useCount])).toEqual([
        [a._id, 3],
        [b._id, 2],
        [c._id, 1]
      ]);

      expect((await appStats(api, { limit: 1 })).topApps).toHaveLength(1);
      expect((await appStats(api, { limit: 10 })).topApps).toHaveLength(3);
      for (const limit of ["0", "11", "abc"]) {
        const res = await api.get(APP_STATS, { params: { limit } });
        expect(res.status(), limit).toBe(400);
      }
    } finally {
      await api.dispose();
    }
  }
);

test(
  "a brand-new account has an empty ranking",
  { tag: "@TC-HOME-034" },
  async () => {
    const account = await createAccount({ tag: "home-empty" });
    const api = await apiAs(account.email, account.password);
    try {
      const s = await appStats(api);
      expect(s).toMatchObject({
        totalApps: 0,
        activeLast7Days: 0,
        activeLast30Days: 0,
        topApps: []
      });
    } finally {
      await api.dispose();
    }
  }
);

test(
  "both stats endpoints require a session",
  { tag: "@TC-HOME-035" },
  async ({ guestApi }) => {
    expect((await guestApi.get(LOGIN_STATS)).status()).toBe(401);
    expect((await guestApi.get(APP_STATS)).status()).toBe(401);
  }
);

test(
  "stats count only the caller's own sign-ins and apps",
  { tag: "@TC-HOME-036" },
  async ({ userApi }) => {
    const account = await createAccount({ tag: "home-isolation" });
    const api = await apiAs(account.email, account.password);
    try {
      const mine = await loginStats(api, { range: "7d" });
      // The account is minutes old: its sign-ins are exactly the rows of its
      // own login history, never the seeded user's.
      const history = await api.get("/api/v1/login-history", {
        params: { limit: 100 }
      });
      const { data } = await history.json();
      expect(mine.total).toBe(data.meta.total);
      expect(mine.total).toBeGreaterThanOrEqual(1);

      const seeded = await loginStats(userApi, { range: "7d" });
      expect(seeded.total).toBeGreaterThanOrEqual(1);
      expect((await appStats(api)).topApps).toEqual([]);
    } finally {
      await api.dispose();
    }
  }
);
