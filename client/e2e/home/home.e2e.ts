import { test, expect } from "@playwright/test";
import type { Page, Response } from "@playwright/test";

// Home at /vi (ROUTES.HOME = "/"). Every figure is real data now: the daily
// sign-in chart, the method/device breakdown and the app ranking all come from
// GET /login-history/stats and GET /users/me/recent-apps/stats. Both are
// stubbed here so the counts are deterministic — the point of these tests is
// what the page does with a payload, not what the seed happens to contain.
//
// Read-only: nothing to revert, no `A only` scenario.
// Matrix: docs/specs/home-activity-insights/design.md §4.6.

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
  test("renders the four stat cards as links carrying their value", async ({
    page
  }) => {
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
  });

  test("sends the browser timezone so the days are cut locally", async ({
    page
  }) => {
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
  });

  test("exposes the chart to a screen reader as a summary plus a table", async ({
    page
  }) => {
    await stubStats(page);
    await page.goto(HOME_PATH);

    await expect(
      page.getByRole("img", { name: /Hoạt động đăng nhập 7 ngày qua/ })
    ).toBeVisible();
    // recharts draws paths; this table is the only point-by-point reading.
    await expect(
      page.getByRole("table", { name: "Số lượt đăng nhập theo ngày" })
    ).toBeAttached();
  });

  test("keeps a row per day, including the days with no sign-in", async ({
    page
  }) => {
    await stubStats(page);
    await page.goto(HOME_PATH);

    const rows = page
      .getByRole("table", { name: "Số lượt đăng nhập theo ngày" })
      .locator("tbody tr");
    await expect(rows).toHaveCount(7);
  });
});

test.describe("Home — range toggle", () => {
  test("writes the choice into the URL and reloads from it", async ({
    page
  }) => {
    await stubStats(page, { login: loginStats({ days: 30 }) });
    await page.goto(HOME_PATH);

    await page.getByRole("button", { name: "30 ngày" }).click();
    await expect(page).toHaveURL(/[?&]range=30d/);

    await page.reload();
    await expect(page.getByRole("button", { name: "30 ngày" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    await expect(
      page
        .getByRole("table", { name: "Số lượt đăng nhập theo ngày" })
        .locator("tbody tr")
    ).toHaveCount(30);
  });

  test("falls back to seven days when the range is not one we offer", async ({
    page
  }) => {
    await stubStats(page);
    await page.goto(`${HOME_PATH}?range=999d`);

    await expect(page.getByRole("button", { name: "7 ngày" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    await expect(
      page
        .getByRole("table", { name: "Số lượt đăng nhập theo ngày" })
        .locator("tbody tr")
    ).toHaveCount(7);
  });
});

test.describe("Home — what the page says when there is little to show", () => {
  test("explains an empty period instead of showing a blank chart", async ({
    page
  }) => {
    await stubStats(page, {
      login: loginStats({ successful: 0, failed: 0, byDay: buildDays(7) })
    });
    await page.goto(HOME_PATH);

    await expect(
      page.getByText("Chưa ghi nhận lần đăng nhập nào trong khoảng này.")
    ).toBeVisible();
  });

  test("explains a sparse period at the threshold, and stops at one over it", async ({
    page
  }) => {
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
  });

  test("invites the user to open an app when nothing is ranked yet", async ({
    page
  }) => {
    await stubStats(page, {
      apps: appStats({ totalApps: 0, topApps: [], byCategory: [] })
    });
    await page.goto(HOME_PATH);

    await expect(
      page.getByText("Mở một ứng dụng, nó sẽ được xếp hạng ở đây.")
    ).toBeVisible();
  });
});

test.describe("Home — drill-down", () => {
  test("a stat card opens the matching filtered list", async ({ page }) => {
    await stubStats(page);
    await page.goto(HOME_PATH);

    await page.getByRole("link", { name: /Đăng nhập thất bại: 2/ }).click();
    await expect(page).toHaveURL(/\/login-history\?status=failed$/);
  });

  test("a method slice opens the list filtered to that method", async ({
    page
  }) => {
    await stubStats(page);
    await page.goto(HOME_PATH);

    await page
      .getByRole("link", { name: /Mật khẩu/ })
      .first()
      .click();
    await expect(page).toHaveURL(/\/login-history\?method=password$/);
  });

  test("a device row filters the list, and the panel shows that filter", async ({
    page
  }) => {
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
  });
});

test.describe("Home — degraded backend", () => {
  test("shows an error in the activity card without taking the page down", async ({
    page
  }) => {
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
  });
});

test.describe("Home — app sections", () => {
  test("Quick Access falls back to the catalog before anything was opened", async ({
    page
  }) => {
    await stubStats(page);
    await page.route(RECENT_RE, (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(
          envelope(
            { items: [], meta: { total: 0, page: 1, limit: 4, totalPages: 0 } },
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
  });

  test("the explore CTA counts the catalog instead of a hardcoded number", async ({
    page
  }) => {
    await stubStats(page);
    const listResponse = page.waitForResponse(isAppsList);
    await page.goto(HOME_PATH);
    const total: number = (await (await listResponse).json()).data.meta.total;

    await expect(
      page.getByText(`Hiện có ${total} ứng dụng — tìm cái tiếp theo bạn cần.`)
    ).toBeVisible();
  });
});

test.describe("Home — i18n", () => {
  test("renders the same screen in English at /", async ({ page }) => {
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
    await expect(page.getByRole("heading", { name: "Explore" })).toBeVisible();
  });

  test("the removed vanity metrics are gone from both locales", async ({
    page
  }) => {
    await stubStats(page);

    await page.goto(HOME_PATH);
    await expect(page.getByText("Thời gian tiết kiệm")).toHaveCount(0);

    await page.goto(HOME_EN);
    await expect(page.getByText("Time Saved")).toHaveCount(0);
    await expect(page.getByText("Current Streak")).toHaveCount(0);
  });
});

test.describe("Home — access", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("sends a signed-out visitor to the login screen", async ({ page }) => {
    await page.goto(HOME_PATH);
    await expect(page).toHaveURL(/\/login/);
  });
});
