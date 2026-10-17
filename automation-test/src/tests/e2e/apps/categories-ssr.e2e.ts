import { test, expect } from "@/fixtures";
import { createApiClient } from "@/api";
import type { CatalogCategory } from "@/api/category.client";
import type { CatalogPage } from "@/api/web-app.client";
import { AppsPage } from "@/pages/dashboard/apps.page";
import { APPS_PATH, APP_CATEGORIES_PATH } from "@/utils/catalog";

// Categories on /apps: the page fetches GET /apps/categories (public) in a
// Server Component that seeds the client cache; the apps LIST (GET /apps)
// still needs a session. The endpoint itself is tests/api/apps/categories.api.ts.
// Test cases: test-cases/apps.md (TC-APPS-041 … 044). Role: user (default).
//
// Read-only: every test only performs GET requests.

test.describe("Apps catalog (/apps) — SSR category prop", () => {
  // Reconciled for category-management (DR-19): the SSR list SEEDS the
  // client cache instead of replacing the client fetch. The filter renders
  // from server data straight away, and the client refetches exactly once on
  // mount so a category deleted within the SSR cache window disappears.
  test(
    "The filter renders from SSR data and refetches once",
    { tag: "@TC-APPS-041" },
    async ({ page }) => {
      let categoriesRequests = 0;
      page.on("request", (req) => {
        if (req.url().includes("/apps/categories")) categoriesRequests += 1;
      });

      const listResponse = page.waitForResponse(
        (r) => r.url().includes(APPS_PATH) && r.status() === 200
      );
      const categoriesResponse = page.waitForResponse(
        (r) => r.url().includes(APP_CATEGORIES_PATH) && r.status() === 200
      );
      await new AppsPage(page, "vi").goto();
      await listResponse;
      // The SSR seed is stale on purpose (initialDataUpdatedAt: 0), so the
      // client refetches once on mount; once that response lands the data is
      // fresh for the query client's 5-minute staleTime and nothing else can
      // trigger another fetch. A duplicate mount fetch would have been sent
      // before this response, so the count is final here.
      await categoriesResponse;

      expect(categoriesRequests).toBe(1);
    }
  );
});

test.describe("Apps catalog (/apps) — category i18n", () => {
  test(
    "The category filter label follows the locale",
    { tag: "@TC-APPS-042" },
    async ({ page, appsPage }) => {
      // EN first: a fresh page has no NEXT_LOCALE cookie yet, so the
      // prefix-less "/apps" resolves to the default (en). (VI first would set
      // a vi cookie that makes the later prefix-less "/apps" resolve to vi.)
      await appsPage.goto();
      await page.waitForResponse(
        (r) => r.url().includes(APPS_PATH) && r.status() === 200
      );
      await appsPage.openFilters();
      await expect(appsPage.categoryGroupLabel()).toBeVisible();
      await page.keyboard.press("Escape");

      // VI via the explicit "/vi/" path — the prefix forces vi regardless of
      // any cookie the en visit may have set.
      const vi = new AppsPage(page, "vi");
      await vi.goto();
      await page.waitForResponse(
        (r) => r.url().includes(APPS_PATH) && r.status() === 200
      );
      await vi.openFilters();
      await expect(vi.categoryGroupLabel()).toBeVisible();
    }
  );
});

test.describe("Apps catalog (/apps) — categoryId deep link", () => {
  test(
    "A `categoryId` deep link pre-selects the filter",
    { tag: "@TC-APPS-043" },
    async ({ page, userApi }) => {
      // Discover a real category id from the public categories endpoint.
      const catRes = await createApiClient(userApi).categories.listPublic();
      expect(catRes.status()).toBe(200);
      const catBody = (await catRes.json()) as { data: CatalogCategory[] };
      expect(catBody.data.length).toBeGreaterThan(0);
      const target = catBody.data[0];

      const listResponse = page.waitForResponse(
        (r) =>
          r.url().includes(APPS_PATH) &&
          r.url().includes(`categoryId=${target._id}`) &&
          r.status() === 200
      );
      const apps = new AppsPage(page, "vi");
      await apps.goto(`?categoryId=${target._id}`);
      const res = await listResponse;
      const body = (await res.json()) as { data: CatalogPage };

      // Filters button shows an active-filter badge (activeFilterCount = 1).
      const filtersBtn = apps.filtersButton();
      await expect(filtersBtn).toBeVisible();
      await expect(filtersBtn.getByText("1")).toBeVisible();

      // Opening the popover shows the pre-selected option.
      await filtersBtn.click();
      await expect(apps.categorySelect()).toBeVisible();

      // Every returned item has the requested category among its categories
      // (category-management: apps carry 1–5 categories).
      for (const item of body.data.items) {
        expect(item.categories.map((c) => c._id)).toContain(target._id);
      }
    }
  );

  test(
    "A garbage `categoryId` deep link does not crash",
    { tag: "@TC-APPS-044" },
    async ({ appsPage }) => {
      // A garbage categoryId is not one of the select's option ids, so the
      // filter ignores it and the client does NOT forward it to the API. The
      // requirement is that the page does not crash — the catalogue shell
      // (toolbar + Filters) renders.
      await appsPage.goto("?categoryId=garbage");
      await expect(appsPage.filtersButton()).toBeVisible();
    }
  );
});
