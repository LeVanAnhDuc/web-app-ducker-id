import { test, expect } from "@/fixtures";
import type { APIRequestContext } from "@playwright/test";
import { createApiClient } from "@/api";
import type { LoginStats } from "@/api/login-history.client";
import type { RecentAppsStats } from "@/api/recent-app.client";
import { dataOf, errorOf } from "@/api/response";
import { apiAs } from "@/api/session";
import type { MyProfile } from "@/api/user.client";
import { USER } from "@/config/accounts";
import { serverMessage, serverMessageVi } from "@/data/copy";
import { createAccount } from "@/utils/accounts";
import { catalogByName } from "@/utils/catalog";
import {
  clearOverrides,
  getUserIdByEmail,
  setAccess
} from "@/utils/entitlements";
import { authIdOf } from "@/utils/login-history";
import { ageRecentUse } from "@/utils/recent-apps";

// The two endpoints behind every figure on Home:
//   GET /login-history/stats         — sign-ins per day, method, device
//   GET /users/me/recent-apps/stats  — app counts and the top-apps ranking
// Contract, range / timezone / limit validation, internal consistency of the
// numbers, what the ranking counts, authorisation and isolation between users.
// Test cases: test-cases/home.md (TC-HOME-030 … 036, 046 … 050).
//
// Exact counts come from throwaway accounts; the seeded user is read only.

const EN = { "Accept-Language": "en" };

async function loginStats(
  ctx: APIRequestContext,
  params: Record<string, string> = {}
): Promise<LoginStats> {
  const res = await createApiClient(ctx).loginHistory.stats(params);
  expect(res.status(), await res.text()).toBe(200);
  return dataOf<LoginStats>(res);
}

async function appStats(
  ctx: APIRequestContext,
  params: Record<string, string | number> = {}
): Promise<RecentAppsStats> {
  const res = await createApiClient(ctx).recentApps.stats(params);
  expect(res.status(), await res.text()).toBe(200);
  return dataOf<RecentAppsStats>(res);
}

const sum = (o: Record<string, number>) =>
  Object.values(o).reduce((a, b) => a + b, 0);

test(
  "Sign-in stats: one bucket per day, totals that add up",
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
  "Range and timezone validation",
  { tag: "@TC-HOME-031" },
  async ({ userApi }) => {
    const history = createApiClient(userApi).loginHistory;
    // Default range is 7 days.
    expect((await loginStats(userApi)).range.days).toBe(7);

    for (const range of ["1d", "6d", "8d", "91d", "999d", "7", "week"]) {
      const res = await history.stats({ range });
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
      const res = await history.stats({ tz });
      expect(res.status(), tz).toBe(400);
    }
  }
);

test(
  "Method and device breakdowns are complete and consistent",
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
  "The ranking orders by opens and honours `limit`",
  { tag: ["@TC-HOME-033", "@smoke"] },
  async () => {
    const account = await createAccount({ tag: "home-top" });
    const ctx = await apiAs(account.email, account.password);
    try {
      const recent = createApiClient(ctx).recentApps;
      const [a, b, c] = await catalogByName(ctx);
      // a: 3 opens, b: 2 opens, c: 1 open — stepping past the 60 s dedupe.
      for (const [app, opens] of [
        [a, 3],
        [b, 2],
        [c, 1]
      ] as const) {
        for (let i = 0; i < opens; i += 1) {
          if (i > 0) await ageRecentUse(account.email, app._id, 61_000);
          expect((await recent.record(app._id)).status()).toBe(204);
        }
      }

      const s = await appStats(ctx);
      expect(s.totalApps).toBe(3);
      expect(s.activeLast7Days).toBe(3);
      expect(s.activeLast30Days).toBe(3);
      expect(s.topApps.map((t) => [t.appId, t.useCount])).toEqual([
        [a._id, 3],
        [b._id, 2],
        [c._id, 1]
      ]);

      expect((await appStats(ctx, { limit: 1 })).topApps).toHaveLength(1);
      expect((await appStats(ctx, { limit: 10 })).topApps).toHaveLength(3);
      for (const limit of ["0", "11", "abc"]) {
        const res = await recent.stats({ limit });
        expect(res.status(), limit).toBe(400);
      }
    } finally {
      await ctx.dispose();
    }
  }
);

test(
  "A new account has an empty ranking",
  { tag: "@TC-HOME-034" },
  async () => {
    const account = await createAccount({ tag: "home-empty" });
    const ctx = await apiAs(account.email, account.password);
    try {
      const s = await appStats(ctx);
      expect(s).toMatchObject({
        totalApps: 0,
        activeLast7Days: 0,
        activeLast30Days: 0,
        topApps: []
      });
    } finally {
      await ctx.dispose();
    }
  }
);

test(
  "Both stats endpoints require a session",
  { tag: ["@TC-HOME-035", "@smoke"] },
  async ({ guestApi }) => {
    const guest = createApiClient(guestApi);
    expect((await guest.loginHistory.stats()).status()).toBe(401);
    expect((await guest.recentApps.stats()).status()).toBe(401);
  }
);

test(
  "Stats count only the caller's own data",
  { tag: ["@TC-HOME-036", "@smoke"] },
  async ({ userApi }) => {
    const account = await createAccount({ tag: "home-isolation" });
    const ctx = await apiAs(account.email, account.password);
    try {
      const mine = await loginStats(ctx, { range: "7d" });
      // The account is minutes old: its sign-ins are exactly the rows of its
      // own login history, never the seeded user's.
      const history = await createApiClient(ctx).loginHistory.list({
        limit: 100
      });
      const { meta } = await dataOf<{ meta: { total: number } }>(history);
      expect(mine.total).toBe(meta.total);
      expect(mine.total).toBeGreaterThanOrEqual(1);

      const seeded = await loginStats(userApi, { range: "7d" });
      expect(seeded.total).toBeGreaterThanOrEqual(1);
      expect((await appStats(ctx)).topApps).toEqual([]);
    } finally {
      await ctx.dispose();
    }
  }
);

test(
  "Invalid stats queries are refused with a translated validation error",
  { tag: "@TC-HOME-046" },
  async ({ userApi }) => {
    const client = createApiClient(userApi);
    const cases = [
      {
        field: "range",
        send: (h?: Record<string, string>) =>
          client.loginHistory.stats({ range: "8d" }, h),
        en: serverMessage.validation.range.invalid,
        vi: serverMessageVi.validation.range.invalid
      },
      {
        field: "tz",
        send: (h?: Record<string, string>) =>
          client.loginHistory.stats({ tz: "Mars/Olympus" }, h),
        en: serverMessage.validation.timezone.invalid,
        vi: serverMessageVi.validation.timezone.invalid
      },
      {
        field: "limit",
        send: (h?: Record<string, string>) =>
          client.recentApps.stats({ limit: "11" }, h),
        en: serverMessage.validation.limit.invalid,
        vi: serverMessageVi.validation.limit.invalid
      },
      {
        field: "limit",
        send: (h?: Record<string, string>) =>
          client.recentApps.stats({ limit: "abc" }, h),
        en: serverMessage.validation.limit.invalid,
        vi: serverMessageVi.validation.limit.invalid
      }
    ];
    for (const c of cases) {
      // English on request; Vietnamese is the server's default locale.
      for (const [headers, message] of [
        [EN, c.en],
        [undefined, c.vi]
      ] as const) {
        const res = await c.send(headers);
        expect(res.status(), c.field).toBe(400);
        const error = await errorOf(res);
        expect(error.code).toBe("VALIDATION_ERROR");
        expect(error.errors, c.field).toContainEqual(
          expect.objectContaining({ field: c.field, message })
        );
      }
    }
  }
);

test(
  "An over-long timezone is refused with the translated message only",
  { tag: "@TC-HOME-047" },
  async ({ userApi }) => {
    // BUG: defects/home.md#bug-home-01
    test.fail();
    const res = await createApiClient(userApi).loginHistory.stats(
      { tz: "x".repeat(65) },
      EN
    );
    expect(res.status()).toBe(400);
    const error = await errorOf(res);
    expect(error.code).toBe("VALIDATION_ERROR");
    expect(error.errors?.length).toBeGreaterThan(0);
    // Every entry is the catalogue's text — never Joi's raw English sentence.
    for (const e of error.errors ?? []) {
      expect(e).toMatchObject({
        field: "tz",
        message: serverMessage.validation.timezone.invalid
      });
    }
  }
);

test(
  "The ranking leaves out apps removed from the history or no longer allowed",
  { tag: "@TC-HOME-048" },
  async () => {
    const account = await createAccount({ tag: "home-visible" });
    const ctx = await apiAs(account.email, account.password);
    const userId = await getUserIdByEmail(account.email);
    try {
      const recent = createApiClient(ctx).recentApps;
      const [a, b, c] = await catalogByName(ctx);
      for (const app of [a, b, c]) {
        expect((await recent.record(app._id)).status()).toBe(204);
      }
      expect((await appStats(ctx)).totalApps).toBe(3);

      // Removed from the history ("Remove" on /recently-used): not counted.
      expect((await recent.hide(b._id)).status()).toBe(204);
      let s = await appStats(ctx);
      expect(s.totalApps).toBe(2);
      expect(s.activeLast30Days).toBe(2);
      expect(s.topApps.map((t) => t.appId).sort()).toEqual(
        [a._id, c._id].sort()
      );

      // Access revoked by an admin override: not counted either.
      await setAccess([{ userId, appId: c._id, granted: false }]);
      s = await appStats(ctx);
      expect(s.totalApps).toBe(1);
      expect(s.activeLast30Days).toBe(1);
      expect(s.topApps.map((t) => t.appId)).toEqual([a._id]);
    } finally {
      await clearOverrides(userId);
      await ctx.dispose();
    }
  }
);

test("The ranking defaults to five apps", { tag: "@TC-HOME-049" }, async () => {
  const account = await createAccount({ tag: "home-default" });
  const ctx = await apiAs(account.email, account.password);
  try {
    const recent = createApiClient(ctx).recentApps;
    // Six apps where the catalogue has them: one more than the default.
    const apps = (await catalogByName(ctx)).slice(0, 6);
    for (const app of apps) {
      expect((await recent.record(app._id)).status()).toBe(204);
    }
    const s = await appStats(ctx);
    expect(s.totalApps).toBe(apps.length);
    expect(s.topApps).toHaveLength(Math.min(5, apps.length));
  } finally {
    await ctx.dispose();
  }
});

test(
  "A user id in the query cannot widen the stats to another account",
  { tag: ["@TC-HOME-050", "@smoke"] },
  async ({ userApi }) => {
    const seededMe = await createApiClient(userApi).users.me();
    expect(seededMe.status()).toBe(200);
    const seededUserId = (await dataOf<MyProfile>(seededMe))._id;
    const seededAuthId = await authIdOf(USER.email);

    const account = await createAccount({ tag: "home-userid" });
    const ctx = await apiAs(account.email, account.password);
    try {
      const client = createApiClient(ctx);
      const ownHistoryTotal = async () =>
        (
          await dataOf<{ meta: { total: number } }>(
            await client.loginHistory.list({ limit: 100 })
          )
        ).meta.total;
      for (const userId of [seededUserId, seededAuthId]) {
        // Unknown keys are stripped by the schema; the session decides whose
        // data is read. The account's own sign-in row is written a moment
        // after the login, hence the poll.
        await expect
          .poll(
            async () => {
              const widened = await loginStats(ctx, { range: "7d", userId });
              const own = await ownHistoryTotal();
              return widened.total >= 1 && widened.total === own;
            },
            { message: userId, timeout: 10_000 }
          )
          .toBe(true);
        expect((await appStats(ctx, { userId })).topApps, userId).toEqual([]);
      }
    } finally {
      await ctx.dispose();
    }
  }
);
