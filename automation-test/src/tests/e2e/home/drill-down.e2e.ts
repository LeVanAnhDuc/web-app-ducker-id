import { test, expect } from "@/fixtures";
import type { Page } from "@playwright/test";
import { copyVi } from "@/data/copy";
import { HomePage, type StatKey } from "@/pages/dashboard/home.page";
import { LoginHistoryPage } from "@/pages/dashboard/login-history.page";
import { buildDays, loginStats, stubStats } from "./helpers";

// Home (/vi) — every figure and section leads to the list behind it: the stat
// cards, a method slice, a device row, the section links, and the way back.
// Both stats endpoints are stubbed (./helpers.ts); the destination lists are
// the real pages. Test cases: test-cases/home.md. Role: user. Read-only.

test.use({ timezoneId: "Asia/Ho_Chi_Minh" });

const vi = (page: Page) => new HomePage(page, copyVi, "/vi");

test.describe("Home — drill-down", () => {
  test(
    "A stat card opens the matching filtered list",
    { tag: "@TC-HOME-010" },
    async ({ page }) => {
      const home = vi(page);
      await stubStats(page);
      await home.goto();

      await home.statCard("failedLogins", 2).click();
      await expect(page).toHaveURL(/\/login-history\?status=failed$/);
    }
  );

  test(
    "Every stat card opens its own list",
    { tag: "@TC-HOME-039" },
    async ({ page }) => {
      const home = vi(page);
      await stubStats(page);
      // The fourth card (failed sign-ins) is TC-HOME-010.
      const cards: [StatKey, number, RegExp][] = [
        ["totalApps", 3, /\/recently-used$/],
        ["activeApps", 3, /\/recently-used$/],
        ["successfulLogins", 5, /\/login-history\?status=success$/]
      ];
      for (const [key, value, url] of cards) {
        await home.goto();
        await home.statCard(key, value).click();
        // First visit compiles the target route on a dev server; allow for it.
        await expect(page, key).toHaveURL(url, { timeout: 20_000 });
      }
    }
  );

  test(
    "A method slice opens the list filtered by method",
    { tag: "@TC-HOME-011" },
    async ({ page }) => {
      const home = vi(page);
      await stubStats(page);
      await home.goto();

      await home.methodLink(copyVi.loginHistory.method.password).click();
      await expect(page).toHaveURL(/\/login-history\?method=password$/);
    }
  );

  test(
    "A device row filters the list and the filter is applied",
    { tag: "@TC-HOME-012" },
    async ({ page }) => {
      const home = vi(page);
      await stubStats(page);
      await home.goto();

      await home.deviceLink(copyVi.loginHistory.deviceType.MOBILE, 1).click();
      await expect(page).toHaveURL(/\/login-history\?deviceType=MOBILE$/);

      // useListQuery drops any param with no filter definition, so without the
      // deviceType filter this link would land on an unfiltered list and say
      // nothing about it. The badge is the proof the filter was actually taken.
      await expect(
        new LoginHistoryPage(page, copyVi, "/vi").filtersButton()
      ).toContainText("1");
    }
  );

  test(
    "Each section links to its full list",
    { tag: "@TC-HOME-040" },
    async ({ page }) => {
      const home = vi(page);
      await stubStats(page);
      await home.goto();

      // Real anchors (SectionLink), so the target is in the href.
      await expect(home.seeHistoryLink()).toHaveAttribute(
        "href",
        /\/login-history$/
      );
      await expect(home.topAppsSeeAll()).toHaveAttribute(
        "href",
        /\/recently-used$/
      );
      await expect(home.quickAccessSeeAll()).toHaveAttribute(
        "href",
        /\/recently-used$/
      );
      await expect(home.exploreSeeAll()).toHaveAttribute("href", /\/apps$/);
      await expect(home.exploreCtaLink()).toHaveAttribute("href", /\/apps$/);

      await home.exploreCtaLink().click();
      await expect(page).toHaveURL(/\/apps$/, { timeout: 20_000 });
    }
  );

  test(
    "Going back from a drill-down keeps the chosen range",
    { tag: "@TC-HOME-045" },
    async ({ page }) => {
      const home = vi(page);
      await stubStats(page, {
        login: (range) =>
          range === "30d"
            ? loginStats({ days: 30, byDay: buildDays(30, { 29: [5, 2] }) })
            : loginStats()
      });
      await home.goto("?range=30d");
      await expect(home.rangeButton("30d")).toHaveAttribute(
        "aria-pressed",
        "true"
      );

      await home.statCard("failedLogins", 2).click();
      await expect(page).toHaveURL(/\/login-history\?status=failed$/);

      await page.goBack();
      await expect(page).toHaveURL(/[?&]range=30d/);
      await expect(home.rangeButton("30d")).toHaveAttribute(
        "aria-pressed",
        "true"
      );
      await expect(home.dayRows()).toHaveCount(30);
    }
  );
});
