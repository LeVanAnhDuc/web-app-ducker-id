import { test, expect } from "@/fixtures";
import { copyVi } from "@/data/copy";
import { HomePage } from "@/pages/dashboard/home.page";
import { REMOVED_METRICS, stubStats } from "./helpers";

// Home in English at / (the `homePage` fixture) next to the Vietnamese /vi,
// and the vanity metrics design DR-2 removed staying gone in both.
// Stats are stubbed (./helpers.ts). Test cases: test-cases/home.md.
// Role: user. Read-only.

test.use({ timezoneId: "Asia/Ho_Chi_Minh" });

test("Home in English", { tag: "@TC-HOME-016" }, async ({ page, homePage }) => {
  await stubStats(page);
  await homePage.goto();

  await expect(homePage.activityHeading()).toBeVisible();
  await expect(homePage.statCard("failedLogins", 2)).toBeVisible();
  await expect(homePage.rangeButton("7d")).toBeVisible();
  await expect(homePage.topAppsHeading()).toBeVisible();
  await expect(homePage.exploreHeading()).toBeVisible();
});

test(
  "The removed vanity metrics stay gone",
  { tag: "@TC-HOME-017" },
  async ({ page, homePage }) => {
    await stubStats(page);

    const vi = new HomePage(page, copyVi, "/vi");
    await vi.goto();
    for (const label of REMOVED_METRICS.vi) {
      await expect(vi.text(label)).toHaveCount(0);
    }

    await homePage.goto();
    for (const label of REMOVED_METRICS.en) {
      await expect(homePage.text(label)).toHaveCount(0);
    }
  }
);
