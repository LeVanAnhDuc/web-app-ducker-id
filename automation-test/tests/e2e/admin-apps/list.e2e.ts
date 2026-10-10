import { test, expect } from "@fixtures";
import type { Page } from "@playwright/test";
import { CategoryApi } from "@helpers/categories";

test.use({ role: "admin" });

// /admin/apps — the registry list: readable rendering, search, status and
// category filters, their combination and URL state (REQ-ADMAPPS-01).
// Test cases: test-cases/admin-apps.md (TC-ADMAPPS-010 … TC-ADMAPPS-018).
//
// Read-only: filters and search only change the URL and the query. Seed
// baseline (server/src/database/seeders/data/web-apps.ts): 6 apps, Team
// Calendar is the only inactive ("Paused") one; Productivity holds Team
// Calendar + Notes; Internal Tools holds Analytics Dashboard + Operations
// Console.

const SEED_APPS = [
  "Blog",
  "Analytics Dashboard",
  "IDMS Portal",
  "Team Calendar",
  "Notes",
  "Operations Console"
];

const appNames = (page: Page) =>
  page.locator("tbody tr td:first-child span.font-medium");

// The table keeps the API order; compare as sets, retrying until the query
// for the current URL has landed.
const expectApps = (page: Page, names: string[]) =>
  expect
    .poll(async () => (await appNames(page).allTextContents()).sort())
    .toEqual([...names].sort());

const search = (page: Page) => page.getByRole("search").getByRole("textbox");

const openFilters = async (page: Page) => {
  await page.getByRole("button", { name: /^Filters/ }).click();
  const popover = page.locator('[data-slot="popover-content"]');
  await expect(popover).toBeVisible();
  return popover;
};

// The panel renders Status first, then Category (dataSources/AdminApps).
const pickFilter = async (page: Page, index: 0 | 1, option: string) => {
  const popover = await openFilters(page);
  await popover.getByRole("combobox").nth(index).click();
  await page.getByRole("option", { name: option, exact: true }).click();
  await page.keyboard.press("Escape");
};

let productivityId: string;
let toolsId: string;

test.beforeAll(async () => {
  const api = await CategoryApi.login();
  productivityId = (await api.bySlug("productivity"))._id;
  toolsId = (await api.bySlug("internal-tools"))._id;
  await api.dispose();
});

test.beforeEach(async ({ page }) => {
  await page.goto("/admin/apps");
  await expect(
    page.getByRole("heading", { name: "App Registry" })
  ).toBeVisible();
  await expect(appNames(page).first()).toBeVisible();
});

test.describe("Admin apps list — rendering", () => {
  test(
    "lists every registered app with readable status, roles, categories and dates",
    { tag: ["@TC-ADMAPPS-010", "@smoke"] },
    async ({ page }) => {
      await expectApps(page, SEED_APPS);

      const calendar = page.getByRole("row", { name: /Team Calendar/ });
      await expect(calendar.getByText("Paused", { exact: true })).toBeVisible();
      await expect(
        calendar.getByText("team-calendar", { exact: true })
      ).toBeVisible();
      // CategoryChips renders a hidden measuring copy as well — take the first.
      await expect(
        calendar.getByText("Productivity").filter({ visible: true }).first()
      ).toBeVisible();

      const portal = page.getByRole("row", { name: /IDMS Portal/ });
      await expect(portal.getByText("Active", { exact: true })).toBeVisible();
      await expect(portal.getByText("User", { exact: true })).toBeVisible();
      await expect(portal.getByText("Admin", { exact: true })).toBeVisible();

      // Never the raw enum, an ObjectId or an ISO timestamp.
      const table = page.locator("tbody");
      await expect(
        table.getByText(/^(ACTIVE|INACTIVE|active|inactive)$/)
      ).toHaveCount(0);
      await expect(table.getByText(/\b[0-9a-f]{24}\b/)).toHaveCount(0);
      await expect(table.getByText(/\d{4}-\d{2}-\d{2}T\d{2}:/)).toHaveCount(0);
    }
  );
});

test.describe("Admin apps list — search", () => {
  test(
    "search narrows by name or description and lives in the URL",
    { tag: "@TC-ADMAPPS-011" },
    async ({ page }) => {
      // [EP] display-name match
      await search(page).fill("calendar");
      await expect(page).toHaveURL(/search=calendar/);
      await expectApps(page, ["Team Calendar"]);

      // [EP] description-only match ("restricted to admin role")
      await search(page).fill("restricted");
      await expectApps(page, ["Operations Console"]);

      // [EP] slug match, case-insensitive
      await search(page).fill("IDMS-PORTAL");
      await expectApps(page, ["IDMS Portal"]);

      // reload keeps the applied search
      await page.reload();
      await expect(search(page)).toHaveValue("IDMS-PORTAL");
      await expectApps(page, ["IDMS Portal"]);
    }
  );

  test(
    "a search with no match shows the empty state with Clear filters",
    { tag: "@TC-ADMAPPS-015" },
    async ({ page }) => {
      await search(page).fill("zz-no-such-app-zz");
      await expect(page).toHaveURL(/search=zz-no-such-app-zz/);
      await expect(appNames(page)).toHaveCount(0);
      const clear = page.getByRole("button", { name: "Clear filters" });
      await expect(clear).toBeVisible();
      await clear.click();
      await expect(page).not.toHaveURL(/search=/);
      await expectApps(page, SEED_APPS);
    }
  );

  test(
    "the no-match empty state says nothing matched rather than that no app exists",
    { tag: "@TC-ADMAPPS-016" },
    async ({ page }) => {
      // BUG: BUG-027 — AdminAppsTable always passes emptyTitle "No apps registered yet." to PageContent, so a no-match search claims the registry is empty.
      test.fail();
      await search(page).fill("zz-no-such-app-zz");
      await expect(page.getByText("No results found")).toBeVisible({
        timeout: 5_000
      });
      await expect(page.getByText("No apps registered yet.")).toHaveCount(0);
    }
  );
});

test.describe("Admin apps list — filters", () => {
  test(
    "the status filter shows only paused or only active apps",
    { tag: ["@TC-ADMAPPS-012", "@smoke"] },
    async ({ page }) => {
      await pickFilter(page, 0, "Paused");
      await expect(page).toHaveURL(/status=inactive/);
      await expectApps(page, ["Team Calendar"]);

      await pickFilter(page, 0, "Active");
      await expect(page).toHaveURL(/status=active/);
      await expectApps(
        page,
        SEED_APPS.filter((n) => n !== "Team Calendar")
      );

      // "All" removes the filter again.
      await pickFilter(page, 0, "All");
      await expect(page).not.toHaveURL(/status=/);
      await expectApps(page, SEED_APPS);
    }
  );

  test(
    "the category filter shows the apps of that category",
    { tag: "@TC-ADMAPPS-013" },
    async ({ page }) => {
      await pickFilter(page, 1, "Productivity");
      await expect(page).toHaveURL(new RegExp(`categoryId=${productivityId}`));
      await expectApps(page, ["Team Calendar", "Notes"]);

      await page.reload();
      await expectApps(page, ["Team Calendar", "Notes"]);
    }
  );

  test(
    "[DT] status × category × search combine with AND; the badge counts filters",
    { tag: "@TC-ADMAPPS-014" },
    async ({ page }) => {
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
        await page.goto(`/admin/apps${query}`);
        if (expected.length === 0) {
          await expect(
            page.getByRole("button", { name: "Clear filters" })
          ).toBeVisible();
          await expect(appNames(page)).toHaveCount(0);
        } else {
          await expectApps(page, expected);
        }
      }

      // Two select filters active → badge "2"; Clear all resets both.
      await page.goto(`/admin/apps?status=active&categoryId=${productivityId}`);
      await expect(
        page.getByRole("button", { name: /^Filters\s*2$/ })
      ).toBeVisible();
      const popover = await openFilters(page);
      await popover.getByRole("button", { name: "Clear all" }).click();
      await expect(page).not.toHaveURL(/status=|categoryId=/);
      await page.keyboard.press("Escape");
      await expectApps(page, SEED_APPS);
    }
  );

  test(
    "tampered filter values in the URL do not crash the page",
    { tag: "@TC-ADMAPPS-017" },
    async ({ page }) => {
      // [EP] unknown status → ignored by the client, full list.
      await page.goto("/admin/apps?status=bogus");
      await expectApps(page, SEED_APPS);

      // [Error Guessing] a categoryId that matches no category option is
      // dropped by useListQuery like any unknown select value: the full list
      // shows and the page stays usable.
      await page.goto("/admin/apps?categoryId=not-an-id");
      await expect(
        page.getByRole("heading", { name: "App Registry" })
      ).toBeVisible();
      await expect(page.getByRole("search")).toBeVisible();
      await expectApps(page, SEED_APPS);
    }
  );
});

test.describe("Admin apps list — i18n (vi)", () => {
  test(
    "filters, status labels and empty state render in Vietnamese",
    { tag: "@TC-ADMAPPS-018" },
    async ({ page }) => {
      await page.goto("/vi/admin/apps");
      await expect(
        page.getByRole("heading", { name: "Đăng ký ứng dụng" })
      ).toBeVisible();
      await page.getByRole("button", { name: /^Bộ lọc/ }).click();
      const popover = page.locator('[data-slot="popover-content"]');
      await expect(
        popover.getByText("Trạng thái", { exact: true })
      ).toBeVisible();
      await expect(
        popover.getByText("Danh mục", { exact: true })
      ).toBeVisible();
      await popover.getByRole("combobox").first().click();
      await page.getByRole("option", { name: "Tạm dừng", exact: true }).click();
      await page.keyboard.press("Escape");
      await expectApps(page, ["Team Calendar"]);
      await expect(
        page.getByRole("row", { name: /Team Calendar/ }).getByText("Tạm dừng")
      ).toBeVisible();
    }
  );
});
