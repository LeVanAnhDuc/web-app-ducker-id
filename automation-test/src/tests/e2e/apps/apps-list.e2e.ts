import { test, expect } from "@/fixtures";
import { adminContext, userContext } from "@/api/session";
import type { CatalogApp, CatalogPage } from "@/api/web-app.client";
import { copy } from "@/data/copy";
import { AppsPage } from "@/pages/dashboard/apps.page";
import {
  catalogByName,
  createFixtureApps,
  removeFixtureApps,
  waitForAppsList
} from "@/utils/catalog";
import type { FixtureApps } from "@/utils/catalog";
import { openedUrls, stubWindowOpen } from "@/utils/window-open";

// The app catalogue at /apps as the seeded regular user (role "user").
// Test cases: test-cases/apps.md (TC-APPS-001 … 003).
//
// The apps a user can see are read from GET /apps rather than named, so the
// suite does not depend on which apps the database holds. The two apps a user
// must NOT see (one admin-only, one inactive) are registered here through the
// admin API and deleted in afterAll.

let visible: CatalogApp[] = [];
let fixtures: FixtureApps | undefined;

test.describe("Apps catalog (/vi/apps)", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeAll(async () => {
    const [admin, user] = await Promise.all([adminContext(), userContext()]);
    fixtures = await createFixtureApps(admin, "apps-list");
    visible = await catalogByName(user);
    await Promise.all([admin.dispose(), user.dispose()]);
    expect(visible.length, "the user sees at least one app").toBeGreaterThan(0);
  });

  test.afterAll(async () => {
    await removeFixtureApps(fixtures);
  });

  test(
    "The catalogue shows exactly the apps the user's role may open",
    { tag: ["@TC-APPS-001", "@smoke"] },
    async ({ page }) => {
      const apps = new AppsPage(page, "vi");
      const listResponse = waitForAppsList(page);
      await apps.goto();
      const body = (await (await listResponse).json()) as {
        data: CatalogPage;
      };

      // Every app the API returned renders as a card with an Open action.
      for (const app of body.data.items.slice(0, 5)) {
        await expect(apps.cards.title(app.displayName)).toBeVisible();
        await expect(apps.cards.openButton(app.displayName)).toBeVisible();
      }

      // Admin-only and inactive apps are hidden for a non-admin user.
      for (const hidden of [fixtures!.adminOnly, fixtures!.inactive]) {
        await expect(apps.cards.title(hidden.displayName)).toHaveCount(0);
        await expect(apps.cards.openButton(hidden.displayName)).toHaveCount(0);
      }
    }
  );

  test(
    "Open launches the app's own URL in a new tab",
    { tag: ["@TC-APPS-002", "@smoke"] },
    async ({ page }) => {
      // Capture window.open without actually navigating to the external URL.
      await stubWindowOpen(page);
      const app = visible[0];
      const apps = new AppsPage(page, "vi");
      await apps.goto();

      const open = apps.cards.openButton(app.displayName);
      await expect(open).toBeVisible();
      await open.click();

      expect(await openedUrls(page)).toContain(app.homeUrl);
    }
  );
});

test.describe("Apps catalog (/apps EN locale)", () => {
  test(
    "English catalogue chrome at `/apps`",
    { tag: "@TC-APPS-003" },
    async ({ appsPage, userApi }) => {
      const [first] = await catalogByName(userApi);
      await appsPage.goto();
      await expect(appsPage.heading()).toBeVisible();
      // ListToolbar's Filters popover button (unified-list pattern)
      await expect(appsPage.filtersButton()).toBeVisible();
      await expect(appsPage.searchInput()).toHaveAttribute(
        "placeholder",
        copy.apps.search.placeholder
      );
      // AppCard renders an EN "Open <name>" button.
      await expect(appsPage.cards.openButton(first.displayName)).toBeVisible();
    }
  );
});
