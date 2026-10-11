import { test, expect } from "@fixtures";
import type { Page, Response } from "@playwright/test";

// Home at /vi (ROUTES.HOME = "/"). Every figure is real data: the daily
// sign-in chart, the method/device breakdown and the app ranking come from
// GET /login-history/stats and GET /users/me/recent-apps/stats. Both are
// stubbed here so the counts are deterministic — the point of these tests is
// what the page does with a payload, not what the database happens to hold.
// The server side of those endpoints is tests/api/home/stats.api.ts.
// Test cases: test-cases/home.md (TC-HOME-001 … 022). Role: user, except the
// access case (guest).
//
// Read-only: nothing to revert.

const HOME_PATH = "/vi";
const HOME_EN = "/";

const STATS_RE = /\/api\/v1\/login-history\/stats(\?|$)/;
const APP_STATS_RE = /\/api\/v1\/users\/me\/recent-apps\/stats(\?|$)/;
const RECENT_RE = /\/api\/v1\/users\/me\/recent-apps(\?|$)/;

const isAppsList = (r: Response) =>
  r.url().includes("/api/v1/apps") &&
  !r.url().includes("/apps/categories") &&
  r.status() === 200;

const envelope = (data: unknown, path: string) => ({
  timestamp: new Date().toISOString(),
  path,
  message: "ok",
  data
});

/** `days` buckets ending today, all zero unless `fill` says otherwise. */
const buildDays = (
  count: number,
  fill: Record<number, [number, number]> = {}
) =>
  Array.from({ length: count }, (_, i) => {
    const date = new Date(Date.UTC(2026, 9, 4) - (count - 1 - i) * 86_400_000)
      .toISOString()
      .slice(0, 10);
    const [successful, failed] = fill[i] ?? [0, 0];
    return { date, total: successful + failed, successful, failed };
  });

const loginStats = (
  overrides: Partial<{
    days: number;
    byDay: ReturnType<typeof buildDays>;
    successful: number;
    failed: number;
    byMethod: Record<string, number>;
    byDevice: Record<string, number>;
    anomalies: number;
  }> = {}
) => {
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

const appStats = (overrides: Partial<Record<string, unknown>> = {}) => ({
  totalApps: 3,
  activeLast7Days: 2,
  activeLast30Days: 3,
  topApps: [
    {
      appId: "64b7f0c2f1a2b3c4d5e6f7a1",
      displayName: "Blog",
      iconUrl: null,
      homeUrl: "https://blog.example.com",
      category: {
        _id: "cat-content",
        slug: "content",
        name: { en: "Content", vi: "Nội dung" }
      },
      useCount: 9,
      lastUsedAt: "2026-10-04T09:00:00.000Z"
    }
  ],
  byCategory: [
    {
      category: {
        _id: "cat-content",
        slug: "content",
        name: { en: "Content", vi: "Nội dung" }
      },
      count: 3
    }
  ],
  ...overrides
});

const stubStats = async (
  page: Page,
  options: { login?: unknown; apps?: unknown; loginStatus?: number } = {}
) => {
  await page.route(STATS_RE, (route) =>
    options.loginStatus && options.loginStatus >= 400
      ? route.fulfill({
          status: options.loginStatus,
          contentType: "application/json",
          body: JSON.stringify({ code: "SERVER_ERROR", message: "boom" })
        })
      : route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(
            envelope(
              options.login ?? loginStats(),
              "/api/v1/login-history/stats"
            )
          )
        })
  );

  // The stats route is a prefix of the list route, so it is registered first.
  await page.route(APP_STATS_RE, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(
        envelope(
          options.apps ?? appStats(),
          "/api/v1/users/me/recent-apps/stats"
        )
      )
    })
  );
};

test.use({ timezoneId: "Asia/Ho_Chi_Minh" });

test.describe("Home — sign-in activity", () => {
  test(
    "renders the four stat cards as links carrying their value",
    { tag: ["@TC-HOME-001", "@smoke"] },
    async ({ page }) => {
      await stubStats(page);
      await page.goto(HOME_PATH);

      // Every card is an <a>, so it shows up as a link and not as a button:
      // middle-click and "open in new tab" have to keep working.
      await expect(
        page.getByRole("link", { name: /Ứng dụng đã dùng: 3/ })
      ).toBeVisible();
      await expect(
        page.getByRole("link", { name: /Hoạt động 30 ngày: 3/ })
      ).toBeVisible();
      await expect(
        page.getByRole("link", { name: /Đăng nhập thành công: 5/ })
      ).toBeVisible();
      await expect(
        page.getByRole("link", { name: /Đăng nhập thất bại: 2/ })
      ).toBeVisible();
    }
  );

  test(
    "sends the browser timezone so the days are cut locally",
    { tag: "@TC-HOME-002" },
    async ({ page }) => {
      await stubStats(page);
      const request = page.waitForRequest((r) => STATS_RE.test(r.url()));
      await page.goto(HOME_PATH);

      // Without this the server falls back to UTC and every bucket silently
      // shifts for anyone east or west of Greenwich.
      //
      // Either spelling is correct: Chrome reports whichever its ICU build calls
      // canonical, and the server accepts both on purpose — see
      // validators/timezone.spec.ts.
      expect(new URL((await request).url()).searchParams.get("tz")).toMatch(
        /^Asia\/(Saigon|Ho_Chi_Minh)$/
      );
    }
  );

  test(
    "exposes the chart to a screen reader as a summary plus a table",
    { tag: "@TC-HOME-003" },
    async ({ page }) => {
      await stubStats(page);
      await page.goto(HOME_PATH);

      await expect(
        page.getByRole("img", { name: /Hoạt động đăng nhập 7 ngày qua/ })
      ).toBeVisible();
      // recharts draws paths; this table is the only point-by-point reading.
      await expect(
        page.getByRole("table", { name: "Số lượt đăng nhập theo ngày" })
      ).toBeAttached();
    }
  );

  test(
    "keeps a row per day, including the days with no sign-in",
    { tag: "@TC-HOME-004" },
    async ({ page }) => {
      await stubStats(page);
      await page.goto(HOME_PATH);

      const rows = page
        .getByRole("table", { name: "Số lượt đăng nhập theo ngày" })
        .locator("tbody tr");
      await expect(rows).toHaveCount(7);
    }
  );
});

test.describe("Home — range toggle", () => {
  test(
    "writes the choice into the URL and reloads from it",
    { tag: "@TC-HOME-005" },
    async ({ page }) => {
      await stubStats(page, { login: loginStats({ days: 30 }) });
      await page.goto(HOME_PATH);

      await page.getByRole("button", { name: "30 ngày" }).click();
      await expect(page).toHaveURL(/[?&]range=30d/);

      await page.reload();
      await expect(
        page.getByRole("button", { name: "30 ngày" })
      ).toHaveAttribute("aria-pressed", "true");
      await expect(
        page
          .getByRole("table", { name: "Số lượt đăng nhập theo ngày" })
          .locator("tbody tr")
      ).toHaveCount(30);
    }
  );

  test(
    "falls back to seven days when the range is not one we offer",
    { tag: "@TC-HOME-006" },
    async ({ page }) => {
      await stubStats(page);
      await page.goto(`${HOME_PATH}?range=999d`);

      await expect(
        page.getByRole("button", { name: "7 ngày" })
      ).toHaveAttribute("aria-pressed", "true");
      await expect(
        page
          .getByRole("table", { name: "Số lượt đăng nhập theo ngày" })
          .locator("tbody tr")
      ).toHaveCount(7);
    }
  );
});

test.describe("Home — what the page says when there is little to show", () => {
  test(
    "explains an empty period instead of showing a blank chart",
    { tag: "@TC-HOME-007" },
    async ({ page }) => {
      await stubStats(page, {
        login: loginStats({ successful: 0, failed: 0, byDay: buildDays(7) })
      });
      await page.goto(HOME_PATH);

      await expect(
        page.getByText("Chưa ghi nhận lần đăng nhập nào trong khoảng này.")
      ).toBeVisible();
    }
  );

  test(
    "explains a sparse period at the threshold, and stops at one over it",
    { tag: "@TC-HOME-008" },
    async ({ page }) => {
      // SPARSE_THRESHOLD = 3: three sign-ins still deserve the explanation,
      // four is an ordinary week.
      await stubStats(page, {
        login: loginStats({
          successful: 3,
          failed: 0,
          byDay: buildDays(7, { 6: [3, 0] })
        })
      });
      await page.goto(HOME_PATH);
      await expect(page.getByText(/Chỉ có 3 lần đăng nhập/)).toBeVisible();

      await page.unroute(STATS_RE);
      await stubStats(page, {
        login: loginStats({
          successful: 4,
          failed: 0,
          byDay: buildDays(7, { 6: [4, 0] })
        })
      });
      await page.reload();
      await expect(
        page.getByText("Chọn một ngày để xem các lượt đăng nhập của ngày đó.")
      ).toBeVisible();
    }
  );

  test(
    "invites the user to open an app when nothing is ranked yet",
    { tag: "@TC-HOME-009" },
    async ({ page }) => {
      await stubStats(page, {
        apps: appStats({ totalApps: 0, topApps: [], byCategory: [] })
      });
      await page.goto(HOME_PATH);

      await expect(
        page.getByText("Mở một ứng dụng, nó sẽ được xếp hạng ở đây.")
      ).toBeVisible();
    }
  );
});

test.describe("Home — drill-down", () => {
  test(
    "a stat card opens the matching filtered list",
    { tag: "@TC-HOME-010" },
    async ({ page }) => {
      await stubStats(page);
      await page.goto(HOME_PATH);

      await page.getByRole("link", { name: /Đăng nhập thất bại: 2/ }).click();
      await expect(page).toHaveURL(/\/login-history\?status=failed$/);
    }
  );

  test(
    "a method slice opens the list filtered to that method",
    { tag: "@TC-HOME-011" },
    async ({ page }) => {
      await stubStats(page);
      await page.goto(HOME_PATH);

      await page
        .getByRole("link", { name: /Mật khẩu/ })
        .first()
        .click();
      await expect(page).toHaveURL(/\/login-history\?method=password$/);
    }
  );

  test(
    "a device row filters the list, and the panel shows that filter",
    { tag: "@TC-HOME-012" },
    async ({ page }) => {
      await stubStats(page);
      await page.goto(HOME_PATH);

      await page.getByRole("link", { name: /Di động: 1/ }).click();
      await expect(page).toHaveURL(/\/login-history\?deviceType=MOBILE$/);

      // useListQuery drops any param with no filter definition, so without the
      // deviceType filter this link would land on an unfiltered list and say
      // nothing about it. The badge is the proof the filter was actually taken.
      await expect(page.getByRole("button", { name: /Bộ lọc/ })).toContainText(
        "1"
      );
    }
  );
});

test.describe("Home — degraded backend", () => {
  test(
    "shows an error in the activity card without taking the page down",
    { tag: "@TC-HOME-013" },
    async ({ page }) => {
      await stubStats(page, { loginStatus: 500 });
      await page.goto(HOME_PATH);

      // The shared query client retries a 5xx twice with 1s/2s backoff, so the
      // error state is reached several seconds in — the default 5s expect window
      // is not enough.
      await expect(
        page.getByText("Không tải được hoạt động đăng nhập.")
      ).toBeVisible({ timeout: 20_000 });
      // The app sections do not depend on that endpoint and must survive it.
      await expect(
        page.getByRole("heading", { name: "Ứng dụng dùng nhiều nhất" })
      ).toBeVisible();
    }
  );
});

test.describe("Home — app sections", () => {
  test(
    "Quick Access falls back to the catalog before anything was opened",
    { tag: "@TC-HOME-014" },
    async ({ page }) => {
      await stubStats(page);
      await page.route(RECENT_RE, (route) =>
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(
            envelope(
              {
                items: [],
                meta: { total: 0, page: 1, limit: 4, totalPages: 0 }
              },
              "/api/v1/users/me/recent-apps"
            )
          )
        })
      );

      const listResponse = page.waitForResponse(isAppsList);
      await page.goto(HOME_PATH);
      await listResponse;

      await expect(
        page.getByText("Bạn chưa mở ứng dụng nào — đây là những gì đang có.")
      ).toBeVisible();
      // Which apps the seed holds is not this test's business; that the section
      // falls back to the catalog rather than rendering nothing is.
      const section = page.getByRole("region", { name: "Dùng gần đây" });
      await expect(section.getByRole("button")).not.toHaveCount(0);
    }
  );

  test(
    "the explore CTA counts the catalog instead of a hardcoded number",
    { tag: "@TC-HOME-015" },
    async ({ page }) => {
      await stubStats(page);
      const listResponse = page.waitForResponse(isAppsList);
      await page.goto(HOME_PATH);
      const total: number = (await (await listResponse).json()).data.meta.total;

      await expect(
        page.getByText(`Hiện có ${total} ứng dụng — tìm cái tiếp theo bạn cần.`)
      ).toBeVisible();
    }
  );
});

test.describe("Home — i18n", () => {
  test(
    "renders the same screen in English at /",
    { tag: "@TC-HOME-016" },
    async ({ page }) => {
      await stubStats(page);
      await page.goto(HOME_EN);

      await expect(
        page.getByRole("heading", { name: "Sign-in activity" })
      ).toBeVisible();
      await expect(
        page.getByRole("link", { name: /Failed sign-ins: 2/ })
      ).toBeVisible();
      await expect(page.getByRole("button", { name: "7 days" })).toBeVisible();
      await expect(
        page.getByRole("heading", { name: "Most used apps" })
      ).toBeVisible();
      await expect(
        page.getByRole("heading", { name: "Explore" })
      ).toBeVisible();
    }
  );

  test(
    "the removed vanity metrics are gone from both locales",
    { tag: "@TC-HOME-017" },
    async ({ page }) => {
      await stubStats(page);

      await page.goto(HOME_PATH);
      await expect(page.getByText("Thời gian tiết kiệm")).toHaveCount(0);

      await page.goto(HOME_EN);
      await expect(page.getByText("Time Saved")).toHaveCount(0);
      await expect(page.getByText("Current Streak")).toHaveCount(0);
    }
  );
});

test.describe("Home — access", () => {
  test.use({ role: "guest" });

  test(
    "sends a signed-out visitor to the login screen",
    { tag: "@TC-HOME-018" },
    async ({ page }) => {
      await page.goto(HOME_PATH);
      await expect(page).toHaveURL(/\/login/);
    }
  );
});

/**
 * The most recent instant (now or earlier) at which the clock in UTC+7 read
 * `hh:mm`. Freezing the browser clock in the FUTURE makes the client treat the
 * just-issued 15-minute access token as expired, and Home never renders — so
 * the frozen time must never be ahead of the real one.
 */
function lastOccurrenceAt(hhmm: string): Date {
  const today = new Date().toISOString().slice(0, 10);
  const at = new Date(`${today}T${hhmm}:00+07:00`);
  if (at.getTime() > Date.now()) at.setUTCDate(at.getUTCDate() - 1);
  return at;
}

test.describe("Home — greeting", () => {
  // MORNING_ENDS = 12, AFTERNOON_ENDS = 18 (GreetingSection). Each time sits
  // on one side of a boundary, in the browser's timezone — pinned to UTC+7 so
  // the result does not depend on the machine running the suite.
  test.use({ timezoneId: "Asia/Ho_Chi_Minh" });
  const cases: [string, string, string][] = [
    ["00:00", "Chào buổi sáng", "first minute of the day"],
    ["11:59", "Chào buổi sáng", "last morning minute"],
    ["12:00", "Chào buổi chiều", "first afternoon minute"],
    ["17:59", "Chào buổi chiều", "last afternoon minute"],
    ["18:00", "Chào buổi tối", "first evening minute"],
    ["23:59", "Chào buổi tối", "last minute of the day"]
  ];
  for (const [time, greeting, label] of cases) {
    test(
      `greets by the local hour at ${time} (${label}) [BVA]`,
      { tag: "@TC-HOME-019" },
      async ({ page }) => {
        await page.clock.setFixedTime(lastOccurrenceAt(time));
        await stubStats(page);
        await page.goto(HOME_PATH);
        await expect(
          page.getByRole("heading", {
            level: 1,
            name: new RegExp(`^${greeting}`)
          })
        ).toBeVisible();
      }
    );
  }

  test(
    "greets in English on / and names the signed-in user",
    { tag: "@TC-HOME-019" },
    async ({ page, userApi }) => {
      const me = await userApi.get("/api/v1/users/me");
      const fullName = me.ok()
        ? ((await me.json()) as { data: { fullName?: string } }).data.fullName
        : undefined;
      await page.clock.setFixedTime(lastOccurrenceAt("09:00"));
      await stubStats(page);
      await page.goto(HOME_EN);
      const heading = page.getByRole("heading", {
        level: 1,
        name: /^Good morning/
      });
      await expect(heading).toBeVisible();
      if (fullName) await expect(heading).toContainText(fullName);
    }
  );
});

test.describe("Home — what the user opened", () => {
  test(
    "Jump back in shows the apps the user opened last, newest first",
    { tag: "@TC-HOME-020" },
    async ({ page }) => {
      await stubStats(page);
      const recent = (i: number) => ({
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
      await page.route(RECENT_RE, (route) =>
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(
            envelope(
              {
                items: [recent(1), recent(2)],
                meta: { total: 2, page: 1, limit: 4, totalPages: 1 }
              },
              "/api/v1/users/me/recent-apps"
            )
          )
        })
      );
      await page.goto(HOME_PATH);
      const section = page.getByRole("region", { name: "Dùng gần đây" });
      await expect(
        section.getByText("Quay lại nơi bạn vừa rời đi")
      ).toBeVisible();
      await expect(section.getByText(/^Recent Stub \d$/)).toHaveText([
        "Recent Stub 1",
        "Recent Stub 2"
      ]);
      // Not the catalogue fallback.
      await expect(
        section.getByText("Bạn chưa mở ứng dụng nào — đây là những gì đang có.")
      ).toHaveCount(0);
    }
  );

  test(
    "Most used apps ranks the apps by lifetime opens",
    { tag: "@TC-HOME-021" },
    async ({ page }) => {
      const top = (name: string, useCount: number, i: number) => ({
        appId: `64b7f0c2f1a2b3c4d5e6b${String(i).padStart(3, "0")}`,
        displayName: name,
        iconUrl: null,
        homeUrl: "https://top.example.com",
        category: null,
        useCount,
        lastUsedAt: "2026-10-04T09:00:00.000Z"
      });
      await stubStats(page, {
        apps: appStats({
          topApps: [
            top("Alpha Top", 9, 1),
            top("Beta Top", 5, 2),
            top("Gamma Top", 2, 3)
          ]
        })
      });
      await page.goto(HOME_PATH);
      const card = page.locator('[aria-labelledby="home-top-apps"]');
      await expect(
        card.getByRole("heading", { name: "Ứng dụng dùng nhiều nhất" })
      ).toBeVisible();
      const rows = card.getByRole("listitem");
      await expect(rows).toHaveCount(3);
      await expect(rows.nth(0)).toContainText("Alpha Top");
      await expect(rows.nth(0)).toContainText("9");
      await expect(rows.nth(1)).toContainText("Beta Top");
      await expect(rows.nth(2)).toContainText("Gamma Top");
      // Each row drills into the history.
      await rows.nth(0).getByRole("link").click();
      // First visit compiles /recently-used on a dev server; allow for it.
      await expect(page).toHaveURL(/\/recently-used$/, { timeout: 20_000 });
    }
  );

  test(
    "the 90-day range is the widest and still keeps a row per day [BVA]",
    { tag: "@TC-HOME-022" },
    async ({ page }) => {
      await stubStats(page, {
        login: loginStats({ days: 90, byDay: buildDays(90, { 89: [1, 0] }) })
      });
      await page.goto(`${HOME_PATH}?range=90d`);
      await expect(
        page.getByRole("button", { name: "90 ngày" })
      ).toHaveAttribute("aria-pressed", "true");
      await expect(
        page
          .getByRole("table", { name: "Số lượt đăng nhập theo ngày" })
          .locator("tbody tr")
      ).toHaveCount(90);
    }
  );
});
