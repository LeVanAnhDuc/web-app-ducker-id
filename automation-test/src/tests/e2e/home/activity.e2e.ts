import { test, expect } from "@/fixtures";
import type { Page } from "@playwright/test";
import { loginStatsRoute } from "@/api/login-history.client";
import { copyVi, fill } from "@/data/copy";
import { HomePage } from "@/pages/dashboard/home.page";
import { buildDays, loginStats, stubStats, unstubStats } from "./helpers";

// Home (/vi) — the stat cards, the sign-in activity card (range toggle, chart,
// screen-reader table, empty / sparse / error states) and the method / device
// breakdown. Both stats endpoints are stubbed (./helpers.ts).
// Test cases: test-cases/home.md. Role: user. Read-only: nothing to revert.

test.use({ timezoneId: "Asia/Ho_Chi_Minh" });

const t = copyVi.home;
const vi = (page: Page) => new HomePage(page, copyVi, "/vi");

test.describe("Home — sign-in activity", () => {
  test(
    "The four stat cards are links carrying their value",
    { tag: ["@TC-HOME-001", "@smoke"] },
    async ({ page }) => {
      const home = vi(page);
      await stubStats(page);
      await home.goto();

      // Every card is an <a>, so it shows up as a link and not as a button:
      // middle-click and "open in new tab" have to keep working.
      await expect(home.statCard("totalApps", 3)).toBeVisible();
      await expect(home.statCard("activeApps", 3)).toBeVisible();
      await expect(home.statCard("successfulLogins", 5)).toBeVisible();
      await expect(home.statCard("failedLogins", 2)).toBeVisible();
    }
  );

  test(
    "The browser timezone is sent so days are cut locally",
    { tag: "@TC-HOME-002" },
    async ({ page }) => {
      const home = vi(page);
      await stubStats(page);
      const request = page.waitForRequest((r) => loginStatsRoute.test(r.url()));
      await home.goto();

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
    "The chart has a screen-reader summary and a data table",
    { tag: "@TC-HOME-003" },
    async ({ page }) => {
      const home = vi(page);
      await stubStats(page);
      await home.goto();

      await expect(home.activityChart(7)).toBeVisible();
      // recharts draws paths; this table is the only point-by-point reading.
      await expect(home.dayTable()).toBeAttached();
    }
  );

  test(
    "One row per day, including days without sign-ins",
    { tag: "@TC-HOME-004" },
    async ({ page }) => {
      const home = vi(page);
      await stubStats(page);
      await home.goto();

      await expect(home.dayRows()).toHaveCount(7);
    }
  );
});

test.describe("Home — range toggle", () => {
  test(
    "The range toggle is kept in the URL",
    { tag: "@TC-HOME-005" },
    async ({ page }) => {
      const home = vi(page);
      await stubStats(page, { login: loginStats({ days: 30 }) });
      await home.goto();

      await home.selectRange("30d");
      await expect(page).toHaveURL(/[?&]range=30d/);

      await page.reload();
      await expect(home.rangeButton("30d")).toHaveAttribute(
        "aria-pressed",
        "true"
      );
      await expect(home.dayRows()).toHaveCount(30);
    }
  );

  test(
    "An unsupported range falls back to 7 days",
    { tag: "@TC-HOME-006" },
    async ({ page }) => {
      const home = vi(page);
      await stubStats(page);
      await home.goto("?range=999d");

      await expect(home.rangeButton("7d")).toHaveAttribute(
        "aria-pressed",
        "true"
      );
      await expect(home.dayRows()).toHaveCount(7);
    }
  );

  test(
    "The 90-day range keeps one row per day",
    { tag: "@TC-HOME-022" },
    async ({ page }) => {
      const home = vi(page);
      await stubStats(page, {
        login: loginStats({ days: 90, byDay: buildDays(90, { 89: [1, 0] }) })
      });
      await home.goto("?range=90d");
      await expect(home.rangeButton("90d")).toHaveAttribute(
        "aria-pressed",
        "true"
      );
      await expect(home.dayRows()).toHaveCount(90);
    }
  );

  test(
    "The stat cards follow the range and name the window they count",
    { tag: "@TC-HOME-037" },
    async ({ page }) => {
      const home = vi(page);
      await stubStats(page, {
        login: (range) =>
          range === "30d"
            ? loginStats({
                days: 30,
                successful: 11,
                failed: 4,
                byDay: buildDays(30, { 29: [11, 4] })
              })
            : loginStats()
      });
      await home.goto();
      await expect(home.statCard("successfulLogins", 5)).toBeVisible();
      await expect(
        home.statHint("successfulLogins", fill(t.stats.inRange, { days: 7 }))
      ).toBeVisible();

      await home.selectRange("30d");

      // The sign-in pair follows the toggle and says so…
      await expect(home.statCard("successfulLogins", 11)).toBeVisible();
      await expect(home.statCard("failedLogins", 4)).toBeVisible();
      await expect(
        home.statHint("successfulLogins", fill(t.stats.inRange, { days: 30 }))
      ).toBeVisible();
      await expect(
        home.statHint("failedLogins", fill(t.stats.inRange, { days: 30 }))
      ).toBeVisible();
      await expect(home.activitySubtitle(30, "Asia/Ho_Chi_Minh")).toBeVisible();
      // …while the app pair keeps its own, fixed window.
      await expect(home.statHint("totalApps", t.stats.allTime)).toBeVisible();
      await expect(
        home.statHint("activeApps", t.stats.stillOpened)
      ).toBeVisible();
    }
  );
});

test.describe("Home — what the page says when there is little to show", () => {
  test(
    "An empty period is explained",
    { tag: "@TC-HOME-007" },
    async ({ page }) => {
      const home = vi(page);
      await stubStats(page, {
        login: loginStats({ successful: 0, failed: 0, byDay: buildDays(7) })
      });
      await home.goto();

      await expect(home.activityEmpty()).toBeVisible();
    }
  );

  test(
    "A sparse period is explained up to the threshold",
    { tag: "@TC-HOME-008" },
    async ({ page }) => {
      const home = vi(page);
      // SPARSE_THRESHOLD = 3: three sign-ins still deserve the explanation,
      // four is an ordinary week.
      await stubStats(page, {
        login: loginStats({
          successful: 3,
          failed: 0,
          byDay: buildDays(7, { 6: [3, 0] })
        })
      });
      await home.goto();
      await expect(home.activitySparse(3)).toBeVisible();

      await unstubStats(page);
      await stubStats(page, {
        login: loginStats({
          successful: 4,
          failed: 0,
          byDay: buildDays(7, { 6: [4, 0] })
        })
      });
      await page.reload();
      await expect(home.activityDayHint()).toBeVisible();
    }
  );

  test(
    "The failed sign-ins card counts unusual sign-ins",
    { tag: "@TC-HOME-038" },
    async ({ page }) => {
      const home = vi(page);
      // anomalies 0: only the window; 1: the window plus the unusual count.
      await stubStats(page, { login: loginStats({ anomalies: 0 }) });
      await home.goto();
      await expect(
        home.statHint("failedLogins", fill(t.stats.inRange, { days: 7 }))
      ).toBeVisible();

      await unstubStats(page);
      await stubStats(page, { login: loginStats({ anomalies: 1 }) });
      await page.reload();
      await expect(
        home.statHint(
          "failedLogins",
          fill(t.stats.withAnomalies, { days: 7, count: 1 })
        )
      ).toBeVisible();
    }
  );

  test(
    "A breakdown leaves out empty slices and explains an empty one",
    { tag: "@TC-HOME-041" },
    async ({ page }) => {
      const home = vi(page);
      await stubStats(page, {
        login: loginStats({
          successful: 5,
          failed: 0,
          byDay: buildDays(7, { 6: [5, 0] }),
          byMethod: {
            password: 5,
            otp: 0,
            "magic-link": 0,
            "forgot-password": 0,
            sso: 0
          },
          byDevice: { DESKTOP: 5, MOBILE: 0, TABLET: 0, UNKNOWN: 0 }
        })
      });
      await home.goto();
      // Only the method and the device that actually occurred are drawn.
      await expect(home.methodLinks()).toHaveCount(1);
      await expect(home.methodLinks()).toContainText(
        copyVi.loginHistory.method.password
      );
      await expect(home.deviceLinks()).toHaveCount(1);
      await expect(
        home.deviceLink(copyVi.loginHistory.deviceType.DESKTOP, 5)
      ).toBeVisible();

      await unstubStats(page);
      await stubStats(page, {
        login: loginStats({
          successful: 0,
          failed: 0,
          byDay: buildDays(7),
          byMethod: {
            password: 0,
            otp: 0,
            "magic-link": 0,
            "forgot-password": 0,
            sso: 0
          },
          byDevice: { DESKTOP: 0, MOBILE: 0, TABLET: 0, UNKNOWN: 0 }
        })
      });
      await page.reload();
      await expect(home.methodsEmpty()).toBeVisible();
      await expect(home.devicesEmpty()).toBeVisible();
    }
  );
});

test.describe("Home — degraded backend", () => {
  test(
    "A failing stats endpoint degrades one card only",
    { tag: "@TC-HOME-013" },
    async ({ page }) => {
      const home = vi(page);
      await stubStats(page, { loginStatus: 500 });
      await home.goto();

      // The shared query client retries a 5xx twice with 1s/2s backoff, so the
      // error state is reached several seconds in — the default 5s expect window
      // is not enough.
      await expect(home.activityError()).toBeVisible({ timeout: 20_000 });
      // The app sections do not depend on that endpoint and must survive it.
      await expect(home.topAppsHeading()).toBeVisible();
    }
  );
});
