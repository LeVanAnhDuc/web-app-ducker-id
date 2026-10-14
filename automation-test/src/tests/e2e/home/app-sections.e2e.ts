import { test, expect } from "@/fixtures";
import type { Page } from "@playwright/test";
import { copyVi } from "@/data/copy";
import { HomePage } from "@/pages/dashboard/home.page";
import { recentAppPath, waitForAppsList } from "@/utils/catalog";
import { openedUrls, stubWindowOpen } from "@/utils/window-open";
import {
  appStats,
  recentStub,
  stubRecentApps,
  stubStats,
  topApp
} from "./helpers";

// Home (/vi) — the app sections: "Jump back in" (recent apps, or the catalogue
// for a new user), "Most used apps" (lifetime ranking) and "Explore" with its
// call-to-action. Stats and the recent-app list are stubbed (./helpers.ts);
// the catalogue is real. Test cases: test-cases/home.md. Role: user.
// Read-only: the one launch a test triggers is answered by a stub.

test.use({ timezoneId: "Asia/Ho_Chi_Minh" });

const vi = (page: Page) => new HomePage(page, copyVi, "/vi");

test.describe("Home — what the user opened", () => {
  test(
    '"Jump back in" shows the apps the user opened last',
    { tag: ["@TC-HOME-020", "@smoke"] },
    async ({ page }) => {
      const home = vi(page);
      await stubStats(page);
      await stubRecentApps(page, [recentStub(1), recentStub(2)]);
      await home.goto();

      await expect(home.quickAccessSubtitle()).toBeVisible();
      await expect(home.quickAccessText(/^Recent Stub \d$/)).toHaveText([
        "Recent Stub 1",
        "Recent Stub 2"
      ]);
      // Not the catalogue fallback.
      await expect(home.quickAccessEmpty()).toHaveCount(0);
    }
  );

  test(
    '"Jump back in" falls back to the catalogue for a new user',
    { tag: "@TC-HOME-014" },
    async ({ page }) => {
      const home = vi(page);
      await stubStats(page);
      await stubRecentApps(page, []);

      const listResponse = waitForAppsList(page);
      await home.goto();
      await listResponse;

      await expect(home.quickAccessEmpty()).toBeVisible();
      // Which apps the seed holds is not this test's business; that the section
      // falls back to the catalog rather than rendering nothing is.
      await expect(home.quickAccessButtons()).not.toHaveCount(0);
    }
  );

  test(
    'Opening a "Jump back in" tile launches the app and records it',
    { tag: "@TC-HOME-043" },
    async ({ page }) => {
      const home = vi(page);
      const app = recentStub(1);
      await stubWindowOpen(page);
      await stubStats(page);
      await stubRecentApps(page, [app]);
      // The stub app does not exist: answer the launch record here so nothing
      // is written for the seeded user.
      await page.route(recentAppPath(app._id), (route) =>
        route.fulfill({ status: 204 })
      );
      await home.goto();

      const record = page.waitForRequest(
        (r) => r.method() === "POST" && r.url().includes(recentAppPath(app._id))
      );
      await home.openQuickAccessTile(app.displayName);
      await record;
      await expect.poll(() => openedUrls(page)).toContain(app.homeUrl);
    }
  );

  test(
    'A failing recent-apps endpoint degrades "Jump back in" only',
    { tag: "@TC-HOME-042" },
    async ({ page }) => {
      const home = vi(page);
      await stubStats(page);
      await stubRecentApps(page, { status: 500 });
      await home.goto();

      // Same retry budget as the activity card (TC-HOME-013).
      await expect(home.quickAccessError()).toBeVisible({ timeout: 20_000 });
      await expect(home.activityHeading()).toBeVisible();
      await expect(home.topAppsHeading()).toBeVisible();
      await expect(home.exploreHeading()).toBeVisible();
    }
  );
});

test.describe("Home — most used apps", () => {
  test(
    '"Most used apps" ranks by lifetime opens and links to the history',
    { tag: "@TC-HOME-021" },
    async ({ page }) => {
      const home = vi(page);
      await stubStats(page, {
        apps: appStats({
          topApps: [
            topApp("Alpha Top", 9, 1),
            topApp("Beta Top", 5, 2),
            topApp("Gamma Top", 2, 3)
          ]
        })
      });
      await home.goto();
      await expect(home.topAppsHeading()).toBeVisible();
      const rows = home.topAppRows();
      await expect(rows).toHaveCount(3);
      await expect(rows.nth(0)).toContainText("Alpha Top");
      await expect(rows.nth(0)).toContainText("9");
      await expect(rows.nth(1)).toContainText("Beta Top");
      await expect(rows.nth(2)).toContainText("Gamma Top");
      // Each row drills into the history.
      await home.topAppLink(0).click();
      // First visit compiles /recently-used on a dev server; allow for it.
      await expect(page).toHaveURL(/\/recently-used$/, { timeout: 20_000 });
    }
  );

  test(
    "An empty ranking invites the user to open an app",
    { tag: "@TC-HOME-009" },
    async ({ page }) => {
      const home = vi(page);
      await stubStats(page, {
        apps: appStats({ totalApps: 0, topApps: [], byCategory: [] })
      });
      await home.goto();

      await expect(home.topAppsEmpty()).toBeVisible();
    }
  );
});

test.describe("Home — explore", () => {
  test(
    "The explore call-to-action counts the real catalogue",
    { tag: "@TC-HOME-015" },
    async ({ page }) => {
      const home = vi(page);
      await stubStats(page);
      const listResponse = waitForAppsList(page);
      await home.goto();
      const total: number = (await (await listResponse).json()).data.meta.total;

      await expect(home.exploreCtaSubtitle(total)).toBeVisible();
    }
  );
});
