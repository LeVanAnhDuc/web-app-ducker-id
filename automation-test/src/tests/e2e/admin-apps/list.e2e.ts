import { test, expect } from "@/fixtures";
import { copy, copyVi } from "@/data/copy";
import { SEED_APPS } from "@/data/test-data";
import { AdminAppsPage } from "@/pages/admin/admin-apps.page";
import { categoryIdsBySlug } from "@/utils/admin-apps";

test.use({ role: "admin" });

// /admin/apps — the registry list: readable rendering, search, status and
// category filters, their combination and URL state (REQ-ADMINAPPS-01).
// Test cases: test-cases/admin-apps.md (TC-ADMINAPPS-010 … TC-ADMINAPPS-018).
//
// Read-only: filters and search only change the URL and the query. Seed
// baseline: data/test-data.ts → SEED_APPS.

const t = copy.adminApps;
const ALL_APPS: string[] = [...SEED_APPS];

// The table keeps the API order; compare as sets, retrying until the query
// for the current URL has landed.
const expectApps = (adminAppsPage: AdminAppsPage, names: string[]) =>
  expect
    .poll(async () => (await adminAppsPage.appNames().allTextContents()).sort())
    .toEqual([...names].sort());

let productivityId: string;
let toolsId: string;

test.beforeEach(async ({ api, adminAppsPage }) => {
  const bySlug = await categoryIdsBySlug(api);
  productivityId = bySlug.productivity;
  toolsId = bySlug["internal-tools"];

  await adminAppsPage.goto();
  await expect(adminAppsPage.heading()).toBeVisible();
  await expect(adminAppsPage.appNames().first()).toBeVisible();
});

test.describe("Admin apps list — rendering", () => {
  test(
    "The registry lists every app with readable values",
    { tag: ["@TC-ADMINAPPS-010", "@smoke"] },
    async ({ adminAppsPage }) => {
      await expectApps(adminAppsPage, ALL_APPS);

      const calendar = /Team Calendar/;
      await expect(
        adminAppsPage.rowText(calendar, t.status.inactive, { exact: true })
      ).toBeVisible();
      await expect(
        adminAppsPage.rowText(calendar, "team-calendar", { exact: true })
      ).toBeVisible();
      await expect(
        adminAppsPage.rowCategory(calendar, "Productivity")
      ).toBeVisible();

      const portal = /IDMS Portal/;
      await expect(
        adminAppsPage.rowText(portal, t.status.active, { exact: true })
      ).toBeVisible();
      await expect(
        adminAppsPage.rowText(portal, t.roles.user, { exact: true })
      ).toBeVisible();
      await expect(
        adminAppsPage.rowText(portal, t.roles.admin, { exact: true })
      ).toBeVisible();

      // Never the raw enum, an ObjectId or an ISO timestamp.
      await expect(
        adminAppsPage.tableText(/^(ACTIVE|INACTIVE|active|inactive)$/)
      ).toHaveCount(0);
      await expect(adminAppsPage.tableText(/\b[0-9a-f]{24}\b/)).toHaveCount(0);
      await expect(
        adminAppsPage.tableText(/\d{4}-\d{2}-\d{2}T\d{2}:/)
      ).toHaveCount(0);
    }
  );
});

test.describe("Admin apps list — search", () => {
  test(
    "Search narrows by name, slug or description and lives in the URL",
    { tag: "@TC-ADMINAPPS-011" },
    async ({ page, adminAppsPage }) => {
      const search = adminAppsPage.searchInput();
      // [EP] display-name match
      await search.fill("calendar");
      await expect(page).toHaveURL(/search=calendar/);
      await expectApps(adminAppsPage, ["Team Calendar"]);

      // [EP] description-only match ("restricted to admin role")
      await search.fill("restricted");
      await expectApps(adminAppsPage, ["Operations Console"]);

      // [EP] slug match, case-insensitive
      await search.fill("IDMS-PORTAL");
      await expectApps(adminAppsPage, ["IDMS Portal"]);

      // reload keeps the applied search
      await page.reload();
      await expect(search).toHaveValue("IDMS-PORTAL");
      await expectApps(adminAppsPage, ["IDMS Portal"]);
    }
  );

  test(
    "A search with no match offers Clear filters",
    { tag: "@TC-ADMINAPPS-015" },
    async ({ page, adminAppsPage }) => {
      await adminAppsPage.searchInput().fill("zz-no-such-app-zz");
      await expect(page).toHaveURL(/search=zz-no-such-app-zz/);
      await expect(adminAppsPage.appNames()).toHaveCount(0);
      const clear = adminAppsPage.clearFiltersButton();
      await expect(clear).toBeVisible();
      await clear.click();
      await expect(page).not.toHaveURL(/search=/);
      await expectApps(adminAppsPage, ALL_APPS);
    }
  );

  test(
    "The no-match empty state says nothing matched",
    { tag: "@TC-ADMINAPPS-016" },
    async ({ adminAppsPage }) => {
      // AdminAppsTable always passes emptyTitle "No apps registered yet." to PageContent, so a no-match search claims the registry is empty.
      // BUG: defects/admin-apps.md#bug-adminapps-01
      test.fail();
      await adminAppsPage.searchInput().fill("zz-no-such-app-zz");
      await expect(adminAppsPage.text(copy.list.noResultsTitle)).toBeVisible({
        timeout: 5_000
      });
      await expect(adminAppsPage.text(t.table.empty)).toHaveCount(0);
    }
  );
});

test.describe("Admin apps list — filters", () => {
  test(
    "The status filter shows only paused or only active apps",
    { tag: ["@TC-ADMINAPPS-012", "@smoke"] },
    async ({ page, adminAppsPage }) => {
      await adminAppsPage.pickFilter(0, t.status.inactive);
      await expect(page).toHaveURL(/status=inactive/);
      await expectApps(adminAppsPage, ["Team Calendar"]);

      await adminAppsPage.pickFilter(0, t.status.active);
      await expect(page).toHaveURL(/status=active/);
      await expectApps(
        adminAppsPage,
        ALL_APPS.filter((n) => n !== "Team Calendar")
      );

      // "All" removes the filter again.
      await adminAppsPage.pickFilter(0, copy.list.all);
      await expect(page).not.toHaveURL(/status=/);
      await expectApps(adminAppsPage, ALL_APPS);
    }
  );

  test(
    "The category filter shows the apps of that category",
    { tag: "@TC-ADMINAPPS-013" },
    async ({ page, adminAppsPage }) => {
      await adminAppsPage.pickFilter(1, "Productivity");
      await expect(page).toHaveURL(new RegExp(`categoryId=${productivityId}`));
      await expectApps(adminAppsPage, ["Team Calendar", "Notes"]);

      await page.reload();
      await expectApps(adminAppsPage, ["Team Calendar", "Notes"]);
    }
  );

  test(
    "Status, category and search combine with AND",
    { tag: "@TC-ADMINAPPS-014" },
    async ({ page, adminAppsPage }) => {
      const rows: [string, string[]][] = [
        // (status, category, search) → expected set
        [`?status=active&categoryId=${productivityId}`, ["Notes"]],
        [`?status=inactive&categoryId=${productivityId}`, ["Team Calendar"]],
        [`?status=inactive&categoryId=${toolsId}`, []],
        [
          `?status=active&categoryId=${toolsId}&search=ops`,
          ["Operations Console"]
        ],
        [`?categoryId=${toolsId}&search=calendar`, []]
      ];
      for (const [query, expected] of rows) {
        await adminAppsPage.goto(query);
        if (expected.length === 0) {
          await expect(adminAppsPage.clearFiltersButton()).toBeVisible();
          await expect(adminAppsPage.appNames()).toHaveCount(0);
        } else {
          await expectApps(adminAppsPage, expected);
        }
      }

      // Two select filters active → badge "2"; Clear all resets both.
      await adminAppsPage.goto(`?status=active&categoryId=${productivityId}`);
      await expect(adminAppsPage.filtersButton(2)).toBeVisible();
      await adminAppsPage.openFilters();
      await expect(adminAppsPage.filtersPanel()).toBeVisible();
      await adminAppsPage.clearAllButton().click();
      await expect(page).not.toHaveURL(/status=|categoryId=/);
      await page.keyboard.press("Escape");
      await expectApps(adminAppsPage, ALL_APPS);
    }
  );

  test(
    "Tampered filter values in the URL do not break the page",
    { tag: "@TC-ADMINAPPS-017" },
    async ({ adminAppsPage }) => {
      // [EP] unknown status → ignored by the client, full list.
      await adminAppsPage.goto("?status=bogus");
      await expectApps(adminAppsPage, ALL_APPS);

      // [Error Guessing] a categoryId that matches no category option is
      // dropped by useListQuery like any unknown select value: the full list
      // shows and the page stays usable.
      await adminAppsPage.goto("?categoryId=not-an-id");
      await expect(adminAppsPage.heading()).toBeVisible();
      await expect(adminAppsPage.searchLandmark()).toBeVisible();
      await expectApps(adminAppsPage, ALL_APPS);
    }
  );
});

test.describe("Admin apps list — i18n (vi)", () => {
  test(
    "Filters and status labels render in Vietnamese",
    { tag: "@TC-ADMINAPPS-018" },
    async ({ page }) => {
      const vi = new AdminAppsPage(page, copyVi, "/vi");
      const tVi = copyVi.adminApps;
      await vi.goto();
      await expect(vi.heading()).toBeVisible();
      await vi.filtersButton().click();
      await expect(vi.filterLabel(tVi.toolbar.status)).toBeVisible();
      await expect(vi.filterLabel(tVi.toolbar.category)).toBeVisible();
      await vi.filterSelect(0).click();
      await vi.option(tVi.status.inactive).click();
      await page.keyboard.press("Escape");
      await expectApps(vi, ["Team Calendar"]);
      await expect(
        vi.rowText(/Team Calendar/, tVi.status.inactive)
      ).toBeVisible();
    }
  );
});
