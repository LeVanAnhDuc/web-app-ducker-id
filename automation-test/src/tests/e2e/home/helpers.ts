import type { Page } from "@playwright/test";
import {
  loginStatsPath,
  loginStatsRoute,
  type LoginStats,
  type LoginStatsDay
} from "@/api/login-history.client";
import {
  recentAppsStatsPath,
  recentAppsStatsRoute,
  type RecentAppItem,
  type RecentAppsStats,
  type TopApp
} from "@/api/recent-app.client";
import { RECENT_APPS_LIST_URL, recentAppsBody } from "@/utils/recent-apps";

// Stubbed payloads for the Home browser suite (moved out of home.e2e.ts).
// Every figure on Home comes from GET /login-history/stats and
// GET /users/me/recent-apps/stats; both are stubbed so counts, thresholds and
// empty states are deterministic — the point of these specs is what the page
// does with a payload, not what the database happens to hold. The server side
// is tests/api/home/stats.api.ts.

const envelope = (data: unknown, path: string) => ({
  timestamp: new Date().toISOString(),
  path,
  message: "ok",
  data
});

/** `count` buckets ending 2026-10-04, all zero unless `fill` says otherwise. */
export const buildDays = (
  count: number,
  fill: Record<number, [number, number]> = {}
): LoginStatsDay[] =>
  Array.from({ length: count }, (_, i) => {
    const date = new Date(Date.UTC(2026, 9, 4) - (count - 1 - i) * 86_400_000)
      .toISOString()
      .slice(0, 10);
    const [successful, failed] = fill[i] ?? [0, 0];
    return { date, total: successful + failed, successful, failed };
  });

/** A login-stats payload: 7 days, 5 successful + 2 failed on day 7 (index 6). */
export const loginStats = (
  overrides: Partial<{
    days: number;
    byDay: LoginStatsDay[];
    successful: number;
    failed: number;
    byMethod: Record<string, number>;
    byDevice: Record<string, number>;
    anomalies: number;
  }> = {}
): LoginStats => {
  const days = overrides.days ?? 7;
  const byDay = overrides.byDay ?? buildDays(days, { 6: [5, 2] });
  const successful = overrides.successful ?? 5;
  const failed = overrides.failed ?? 2;
  return {
    total: successful + failed,
    successful,
    failed,
    byMethod: overrides.byMethod ?? {
      password: 5,
      otp: 2,
      "magic-link": 0,
      "forgot-password": 0,
      sso: 0
    },
    byDevice: overrides.byDevice ?? {
      DESKTOP: 6,
      MOBILE: 1,
      TABLET: 0,
      UNKNOWN: 0
    },
    byDay,
    byApp: [],
    anomalies: overrides.anomalies ?? 0,
    range: {
      from: byDay[0].date,
      to: byDay[byDay.length - 1].date,
      days,
      timezone: "Asia/Ho_Chi_Minh"
    }
  };
};

const CONTENT = {
  _id: "cat-content",
  slug: "content",
  name: { en: "Content", vi: "Nội dung" }
};

/** One ranking row; `i` makes the 24-hex id unique. */
export const topApp = (name: string, useCount: number, i: number): TopApp => ({
  appId: `64b7f0c2f1a2b3c4d5e6b${String(i).padStart(3, "0")}`,
  displayName: name,
  iconUrl: null,
  homeUrl: "https://top.example.com",
  category: null,
  useCount,
  lastUsedAt: "2026-10-04T09:00:00.000Z"
});

/** An app-stats payload: 3 apps used, 2 / 3 active, Blog ranked with 9 opens. */
export const appStats = (
  overrides: Partial<RecentAppsStats> = {}
): RecentAppsStats => ({
  totalApps: 3,
  activeLast7Days: 2,
  activeLast30Days: 3,
  topApps: [
    {
      appId: "64b7f0c2f1a2b3c4d5e6f7a1",
      displayName: "Blog",
      iconUrl: null,
      homeUrl: "https://blog.example.com",
      category: CONTENT,
      useCount: 9,
      lastUsedAt: "2026-10-04T09:00:00.000Z"
    }
  ],
  byCategory: [{ category: CONTENT, count: 3 }],
  ...overrides
});

const json = (status: number, body: unknown) => ({
  status,
  contentType: "application/json",
  body: JSON.stringify(body)
});

/**
 * Stubs both stats endpoints. `login` is a payload, or a function of the
 * requested `range` (for specs that switch it); `loginStatus` ≥ 400 answers
 * the login stats with that error instead.
 */
export async function stubStats(
  page: Page,
  options: {
    login?: LoginStats | ((range: string) => LoginStats);
    apps?: RecentAppsStats;
    loginStatus?: number;
  } = {}
): Promise<void> {
  await page.route(loginStatsRoute, (route) => {
    if (options.loginStatus && options.loginStatus >= 400) {
      return route.fulfill(
        json(options.loginStatus, { code: "SERVER_ERROR", message: "boom" })
      );
    }
    const range =
      new URL(route.request().url()).searchParams.get("range") ?? "7d";
    const login =
      typeof options.login === "function"
        ? options.login(range)
        : (options.login ?? loginStats());
    return route.fulfill(json(200, envelope(login, loginStatsPath)));
  });

  // The stats route is a prefix of the list route, so it is registered first.
  await page.route(recentAppsStatsRoute, (route) =>
    route.fulfill(
      json(200, envelope(options.apps ?? appStats(), recentAppsStatsPath))
    )
  );
}

/** Drops both stats stubs, so a spec can register different ones and reload. */
export async function unstubStats(page: Page): Promise<void> {
  await page.unroute(loginStatsRoute);
  await page.unroute(recentAppsStatsRoute);
}

/**
 * Stubs GET /users/me/recent-apps (what "Jump back in" reads): `items`, or an
 * error `status`.
 */
export async function stubRecentApps(
  page: Page,
  items: RecentAppItem[] | { status: number }
): Promise<void> {
  await page.route(RECENT_APPS_LIST_URL, (route) =>
    Array.isArray(items)
      ? route.fulfill({
          status: 200,
          contentType: "application/json",
          body: recentAppsBody(items, {
            total: items.length,
            page: 1,
            limit: 4,
            totalPages: items.length ? 1 : 0
          })
        })
      : route.fulfill(
          json(items.status, { code: "SERVER_ERROR", message: "boom" })
        )
  );
}

/** Recent-app row `i` for "Jump back in": "Recent Stub <i>", opened `i` minutes ago. */
export const recentStub = (i: number): RecentAppItem => ({
  _id: `64b7f0c2f1a2b3c4d5e6a${String(i).padStart(3, "0")}`,
  displayName: `Recent Stub ${i}`,
  description: null,
  iconUrl: null,
  homeUrl: `https://recent-${i}.example.com`,
  categories: [],
  isFavorite: false,
  lastUsedAt: new Date(Date.now() - i * 60_000).toISOString(),
  useCount: 1
});

/**
 * Labels of the vanity metrics design DR-2 removed (Time Saved, Current
 * Streak). They are gone from home.json too, so they live here, not in copy.
 */
export const REMOVED_METRICS = {
  vi: ["Thời gian tiết kiệm"],
  en: ["Time Saved", "Current Streak"]
} as const;

/**
 * The most recent instant (now or earlier) at which the clock in UTC+7 read
 * `hh:mm`. Freezing the browser clock in the FUTURE makes the client treat the
 * just-issued 15-minute access token as expired, and Home never renders — so
 * the frozen time must never be ahead of the real one.
 */
export function lastOccurrenceAt(hhmm: string): Date {
  const today = new Date().toISOString().slice(0, 10);
  const at = new Date(`${today}T${hhmm}:00+07:00`);
  if (at.getTime() > Date.now()) at.setUTCDate(at.getUTCDate() - 1);
  return at;
}
