import { test, expect } from "@fixtures";
import {
  adminContext,
  catalogByName,
  createFixtureApps,
  openedUrls,
  removeFixtureApps,
  stubWindowOpen,
  userContext,
  waitForAppsList
} from "@helpers/catalog";
import type { CatalogApp, FixtureApps } from "@helpers/catalog";

// The app catalogue at /apps as the seeded regular user (role "user").
// Test cases: test-cases/apps.md (TC-APPS-001 … 003).
//
// The apps a user can see are read from GET /apps rather than named, so the
// suite does not depend on which apps the database holds. The two apps a user
// must NOT see (one admin-only, one inactive) are registered here through the
// admin API and deleted in afterAll.

const APPS_PATH = "/vi/apps";

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
    "renders only the role-permitted active apps for a user",
    { tag: ["@TC-APPS-001", "@smoke"] },
    async ({ page }) => {
      const listResponse = waitForAppsList(page);
      await page.goto(APPS_PATH);
      const body = (await (await listResponse).json()) as {
        data: { items: CatalogApp[] };
      };

      // Every app the API returned renders as a card with an Open action.
      for (const app of body.data.items.slice(0, 5)) {
        await expect(
          page.getByRole("heading", {
            level: 3,
            name: app.displayName,
            exact: true
          })
        ).toBeVisible();
        await expect(
          page.getByRole("button", { name: `Mở ${app.displayName}` })
        ).toBeVisible();
      }

      // Admin-only and inactive apps are hidden for a non-admin user.
      for (const hidden of [fixtures!.adminOnly, fixtures!.inactive]) {
        await expect(
          page.getByRole("heading", {
            level: 3,
            name: hidden.displayName,
            exact: true
          })
        ).toHaveCount(0);
        await expect(
          page.getByRole("button", { name: `Mở ${hidden.displayName}` })
        ).toHaveCount(0);
      }
    }
  );

  test(
    "Open launches the app homeUrl in a new tab",
    { tag: ["@TC-APPS-002", "@smoke"] },
    async ({ page }) => {
      // Capture window.open without actually navigating to the external URL.
      await stubWindowOpen(page);
      const app = visible[0];
      await page.goto(APPS_PATH);

      const open = page.getByRole("button", { name: `Mở ${app.displayName}` });
      await expect(open).toBeVisible();
      await open.click();

      expect(await openedUrls(page)).toContain(app.homeUrl);
    }
  );
});

test.describe("Apps catalog (/apps EN locale)", () => {
  test(
    "renders catalog with Filters button and Open actions in English",
    { tag: "@TC-APPS-003" },
    async ({ page, userApi }) => {
      const [first] = await catalogByName(userApi);
      await page.goto("/apps");
      await expect(
        page.getByRole("heading", { name: "Apps", exact: true })
      ).toBeVisible();
      // ListToolbar's Filters popover button (unified-list pattern)
      await expect(
        page.getByRole("button", { name: /Filters/i })
      ).toBeVisible();
      await expect(
        page.getByRole("search").getByRole("textbox")
      ).toHaveAttribute("placeholder", "Search apps...");
      // AppCard renders an EN "Open <name>" button.
      await expect(
        page.getByRole("button", { name: `Open ${first.displayName}` })
      ).toBeVisible();
    }
  );
});
