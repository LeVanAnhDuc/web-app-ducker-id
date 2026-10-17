import { test, expect } from "@/fixtures";
import type { Page } from "@playwright/test";
import { createApiClient } from "@/api";
import type { MyProfile } from "@/api/user.client";
import { copy, copyVi } from "@/data/copy";
import { HomePage } from "@/pages/dashboard/home.page";
import { appStats, lastOccurrenceAt, stubStats, unstubStats } from "./helpers";

// Home — the greeting card: the h1 follows the browser's local hour
// (GreetingSection: MORNING_ENDS = 12, AFTERNOON_ENDS = 18) and names the user;
// the line under it counts the apps the user has used. Stats are stubbed
// (./helpers.ts). Test cases: test-cases/home.md. Role: user. Read-only.

// Pinned to UTC+7 so the result does not depend on the machine running the suite.
test.use({ timezoneId: "Asia/Ho_Chi_Minh" });

const vi = (page: Page) => new HomePage(page, copyVi, "/vi");

test.describe("The greeting follows the local hour", () => {
  // Each time sits on one side of a boundary, in the browser's timezone.
  const g = copyVi.home.greeting;
  const cases: [string, string, string][] = [
    ["00:00", g.morning, "first minute of the day"],
    ["11:59", g.morning, "last morning minute"],
    ["12:00", g.afternoon, "first afternoon minute"],
    ["17:59", g.afternoon, "last afternoon minute"],
    ["18:00", g.evening, "first evening minute"],
    ["23:59", g.evening, "last minute of the day"]
  ];
  for (const [time, greeting, label] of cases) {
    test(
      `greets by the local hour at ${time} (${label}) [BVA]`,
      { tag: "@TC-HOME-019" },
      async ({ page }) => {
        const home = vi(page);
        await page.clock.setFixedTime(lastOccurrenceAt(time));
        await stubStats(page);
        await home.goto();
        await expect(home.greetingHeading(greeting)).toBeVisible();
      }
    );
  }

  test(
    "greets in English on / and names the signed-in user",
    { tag: "@TC-HOME-019" },
    async ({ page, homePage, userApi }) => {
      const me = await createApiClient(userApi).users.me();
      const fullName = me.ok()
        ? ((await me.json()) as { data: Partial<MyProfile> }).data.fullName
        : undefined;
      await page.clock.setFixedTime(lastOccurrenceAt("09:00"));
      await stubStats(page);
      await homePage.goto();
      const heading = homePage.greetingHeading(copy.home.greeting.morning);
      await expect(heading).toBeVisible();
      if (fullName) await expect(heading).toContainText(fullName);
    }
  );
});

test(
  "The greeting subtitle counts the apps the user has used",
  { tag: "@TC-HOME-044" },
  async ({ page }) => {
    const home = vi(page);
    // BVA: one app → the counted sentence; none → the invitation.
    await stubStats(page, { apps: appStats({ totalApps: 1 }) });
    await home.goto();
    await expect(home.greetingSubtitle(1)).toBeVisible();

    await unstubStats(page);
    await stubStats(page, {
      apps: appStats({ totalApps: 0, topApps: [], byCategory: [] })
    });
    await page.reload();
    await expect(home.greetingSubtitle(0)).toBeVisible();
  }
);
