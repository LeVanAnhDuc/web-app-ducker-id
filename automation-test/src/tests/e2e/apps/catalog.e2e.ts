import { test, expect } from "@/fixtures";
import type { Request } from "@playwright/test";
import type { CatalogApp, CatalogPage } from "@/api/web-app.client";
import { copyVi } from "@/data/copy";
import { AppsPage } from "@/pages/dashboard/apps.page";
import {
  APPS_LIST_URL,
  catalogByName,
  isAppsListResponse,
  recentAppPath,
  searchParamOf,
  waitForAppsList
} from "@/utils/catalog";
import { openedUrls, stubWindowOpen } from "@/utils/window-open";
import {
  envelope,
  fakeApp,
  fulfillJson,
  pageOf,
  serverError,
  stubCatalog,
  stubPages,
  waitForSearch
} from "./helpers";

// /apps toolbar, states and launch — search, category filter, view toggle,
// pagination, empty / error / loading, keyboard and i18n.
// Test cases: test-cases/apps.md (TC-APPS-004 … 019, 045, 068, 069). Role:
// user, except the access case (guest).
//
// Real data where the shape is guaranteed by the catalogue itself; stubbed
// GET /apps where a state needs more apps, a null icon, or a failure.

const vi = copyVi;

let apps: CatalogApp[] = [];

test.beforeEach(async ({ userApi }) => {
  apps = await catalogByName(userApi);
});

test.describe("Apps catalog — search", () => {
  test(
    "Search filters server-side, persists in the URL and clears",
    { tag: ["@TC-APPS-004", "@smoke"] },
    async ({ page }) => {
      const target = apps[0];
      const appsPage = new AppsPage(page, "vi");
      await Promise.all([waitForAppsList(page), appsPage.goto()]);

      const searched = waitForSearch(page, target.displayName);
      await appsPage.search(target.displayName);
      const res = await searched;
      const { data } = (await res.json()) as { data: CatalogPage };
      expect(data.items.map((a) => a.displayName)).toContain(
        target.displayName
      );
      await expect(page).toHaveURL(/[?&]search=/);
      await expect(
        appsPage.cards.title(target.displayName, { exact: false })
      ).toBeVisible();

      // Reload keeps the search (URL is the source of truth).
      await page.reload();
      await expect(appsPage.searchInput()).toHaveValue(target.displayName);

      // Clearing the box brings the whole catalogue back.
      await appsPage.search("");
      await expect(page).not.toHaveURL(/[?&]search=/);
      await expect(appsPage.cards.titles().first()).toBeVisible();
    }
  );

  test(
    "A search with no match shows the empty state and Clear filters",
    { tag: "@TC-APPS-005" },
    async ({ page }) => {
      const appsPage = new AppsPage(page, "vi");
      await appsPage.goto("?search=zzzqqq-no-such-app");
      await expect(appsPage.emptyState()).toBeVisible();
      await appsPage.clearFiltersButton().click();
      await expect(page).not.toHaveURL(/search=/);
      await expect(appsPage.cards.titles().first()).toBeVisible();
    }
  );

  test(
    "Browser Back after a search restores the previous list",
    { tag: "@TC-APPS-068" },
    async ({ page }) => {
      const target = apps[0];
      const appsPage = new AppsPage(page, "vi");
      await Promise.all([waitForAppsList(page), appsPage.goto()]);

      const searched = waitForSearch(page, target.displayName);
      await appsPage.search(target.displayName);
      await searched;
      await expect(page).toHaveURL(/[?&]search=/);

      // useListQuery pushes a history entry per applied search.
      await page.goBack();
      await expect(page).not.toHaveURL(/[?&]search=/);
      await expect(appsPage.searchInput()).toHaveValue("");
      await expect(appsPage.cards.titles().first()).toBeVisible();
    }
  );
});

test.describe("Apps catalog — category filter", () => {
  test(
    "The category filter narrows the list and badges the Filters button",
    { tag: "@TC-APPS-006" },
    async ({ page }) => {
      const appsPage = new AppsPage(page, "vi");
      await Promise.all([waitForAppsList(page), appsPage.goto()]);

      await appsPage.openFilters();
      await appsPage.categorySelect().first().click();
      const option = appsPage.selectOption(1);
      await expect(option).toBeVisible();
      const filtered = page.waitForResponse(
        (r) =>
          isAppsListResponse(r) &&
          new URL(r.url()).searchParams.has("categoryId")
      );
      await option.click();
      const res = await filtered;
      const categoryId = new URL(res.url()).searchParams.get("categoryId")!;
      const { data } = (await res.json()) as { data: CatalogPage };
      for (const app of data.items) {
        expect(app.categories.map((c) => c._id)).toContain(categoryId);
      }
      await expect(page).toHaveURL(new RegExp(`categoryId=${categoryId}`));
      await expect(appsPage.filtersButton()).toContainText("1");
    }
  );

  test(
    "Search and category combine as an intersection",
    { tag: "@TC-APPS-007" },
    async ({ page }) => {
      const app = apps.find((a) => a.categories.length > 0);
      test.skip(!app, "needs an app with a category");
      const categoryId = app!.categories[0]._id;
      const term = app!.displayName.slice(0, 4);

      const both = page.waitForResponse(
        (r) =>
          isAppsListResponse(r) &&
          new URL(r.url()).searchParams.get("categoryId") === categoryId &&
          searchParamOf(r.url()) === term
      );
      await new AppsPage(page, "vi").goto(
        `?search=${encodeURIComponent(term)}&categoryId=${categoryId}`
      );
      const { data } = (await (await both).json()) as { data: CatalogPage };
      expect(data.items.map((a) => a._id)).toContain(app!._id);
      for (const item of data.items) {
        expect(item.categories.map((c) => c._id)).toContain(categoryId);
      }
    }
  );
});

test.describe("Apps catalog — view and pagination", () => {
  test("Grid / list toggle", { tag: "@TC-APPS-008" }, async ({ page }) => {
    const appsPage = new AppsPage(page, "vi");
    await Promise.all([waitForAppsList(page), appsPage.goto()]);
    const grid = appsPage.gridButton();
    const list = appsPage.listButton();
    await expect(grid).toHaveAttribute("aria-pressed", "true");
    await expect(list).toHaveAttribute("aria-pressed", "false");

    await list.click();
    await expect(list).toHaveAttribute("aria-pressed", "true");
    await expect(grid).toHaveAttribute("aria-pressed", "false");
  });

  test(
    "A single page hides the pager",
    { tag: "@TC-APPS-009" },
    async ({ page }) => {
      await stubPages(page, 1);
      const appsPage = new AppsPage(page, "vi");
      await appsPage.goto();
      await expect(appsPage.text("Stub App 100")).toBeVisible();
      await expect(appsPage.pager()).toHaveCount(0);
    }
  );

  test(
    "The pager walks page 1 → 2 → last, edges disabled",
    { tag: "@TC-APPS-010" },
    async ({ page }) => {
      const seen: Request[] = [];
      await stubPages(page, 3, seen);
      const appsPage = new AppsPage(page, "vi");
      await appsPage.goto();
      await expect(appsPage.pager()).toBeVisible();

      // page 1 — Previous disabled.
      const prev = appsPage.previousPage();
      const next = appsPage.nextPage();
      await expect(prev).toHaveAttribute("aria-disabled", "true");
      await expect(next).not.toHaveAttribute("aria-disabled", "true");

      // page 2 — URL and request follow.
      await appsPage.pageLink(2).click();
      await expect(page).toHaveURL(/[?&]page=2/);
      await expect(appsPage.text("Stub App 200")).toBeVisible();

      // last page — Next disabled.
      await appsPage.pageLink(3).click();
      await expect(page).toHaveURL(/[?&]page=3/);
      await expect(appsPage.text("Stub App 300")).toBeVisible();
      await expect(next).toHaveAttribute("aria-disabled", "true");
      expect(
        seen.map((r) => new URL(r.url()).searchParams.get("page"))
      ).toEqual(expect.arrayContaining(["1", "2", "3"]));
    }
  );

  test(
    "A new search from page 2 starts again at page 1",
    { tag: "@TC-APPS-069" },
    async ({ page }) => {
      await stubPages(page, 3);
      const appsPage = new AppsPage(page, "vi");
      await appsPage.goto();
      await appsPage.pageLink(2).click();
      await expect(page).toHaveURL(/[?&]page=2/);

      await appsPage.search("Stub");
      await expect(page).toHaveURL(/[?&]search=Stub/);
      await expect(page).toHaveURL(/[?&]page=1(&|$)/);
    }
  );

  test(
    "A hand-typed page beyond the last one renders safely",
    { tag: "@TC-APPS-011" },
    async ({ page }) => {
      const appsPage = new AppsPage(page, "vi");
      await appsPage.goto("?page=999");
      // The API answers an empty page; the empty state is the safe outcome.
      await expect(appsPage.emptyState()).toBeVisible();
    }
  );
});

test.describe("Apps catalog — states", () => {
  test(
    "An app without icon or description uses the initial-letter fallback",
    { tag: "@TC-APPS-012" },
    async ({ page }) => {
      await stubCatalog(
        page,
        pageOf([
          fakeApp(1, {
            displayName: "Zebra Null",
            iconUrl: null,
            description: null
          })
        ])
      );
      const appsPage = new AppsPage(page, "vi");
      await appsPage.goto();
      const card = appsPage.cards.card("Zebra Null");
      await expect(card).toBeVisible();
      await expect(appsPage.cards.initial("Zebra Null", "Z")).toBeVisible();
      await expect(appsPage.cards.images("Zebra Null")).toHaveCount(0);
      await expect(card).not.toContainText("null");
    }
  );

  test(
    "Skeleton cards while the catalogue loads",
    { tag: "@TC-APPS-013" },
    async ({ page }) => {
      let release!: () => void;
      const hold = new Promise<void>((r) => (release = r));
      await page.route(APPS_LIST_URL, async (route) => {
        await hold;
        await route.continue();
      });
      const appsPage = new AppsPage(page, "vi");
      await appsPage.goto();
      await expect(appsPage.skeletons().first()).toBeVisible();
      release();
      await expect(appsPage.cards.titles().first()).toBeVisible({
        timeout: 15_000
      });
      await expect(appsPage.skeletons()).toHaveCount(0);
    }
  );

  test(
    "A failing catalogue request shows the error alert",
    { tag: "@TC-APPS-014" },
    async ({ page }) => {
      // An errored query is not "empty", so PageContent renders the
      // role="alert" instead of the empty state (fixed BUG-APPS-01).
      await page.route(APPS_LIST_URL, (route) =>
        fulfillJson(route, serverError("boom"), 500)
      );
      const appsPage = new AppsPage(page, "vi");
      await appsPage.goto();
      // React Query retries a 5xx twice with backoff before giving up.
      await expect(appsPage.errorAlert()).toBeVisible({ timeout: 20_000 });
    }
  );
});

test.describe("Apps catalog — launch and keyboard", () => {
  test(
    "Opening a tile records the launch",
    { tag: ["@TC-APPS-015", "@smoke"] },
    async ({ page, appsPage }) => {
      await stubWindowOpen(page);
      const app = apps[0];
      await appsPage.goto();
      const recorded = page.waitForResponse(
        (r) =>
          r.url().includes(recentAppPath(app._id)) &&
          r.request().method() === "POST"
      );
      await appsPage.cards.open(app.displayName);
      expect((await recorded).status()).toBe(204);
      expect(await openedUrls(page)).toContain(app.homeUrl);
    }
  );

  test(
    "Open works from the keyboard",
    { tag: "@TC-APPS-016" },
    async ({ page }) => {
      await stubWindowOpen(page);
      const app = apps[0];
      const appsPage = new AppsPage(page, "vi");
      await appsPage.goto();
      const open = appsPage.cards.openButton(app.displayName);
      await open.focus();
      await expect(open).toBeFocused();
      await page.keyboard.press("Enter");
      await expect.poll(() => openedUrls(page)).toContain(app.homeUrl);
    }
  );

  test(
    "A filter change is announced",
    { tag: "@TC-APPS-017" },
    async ({ page }) => {
      const appsPage = new AppsPage(page, "vi");
      await Promise.all([waitForAppsList(page), appsPage.goto()]);
      await appsPage.search(apps[0].displayName.slice(0, 3));
      await expect(appsPage.announcer.region()).toHaveText(
        vi.list.announce.filtersApplied,
        { timeout: 5_000 }
      );
    }
  );
});

test.describe("Apps catalog — i18n", () => {
  test(
    "Vietnamese catalogue chrome",
    { tag: "@TC-APPS-018" },
    async ({ page }) => {
      const appsPage = new AppsPage(page, "vi");
      await Promise.all([waitForAppsList(page), appsPage.goto()]);
      await expect(appsPage.heading()).toBeVisible();
      await expect(appsPage.searchInput()).toHaveAttribute(
        "placeholder",
        vi.apps.search.placeholder
      );
      await expect(appsPage.filtersButton()).toBeVisible();
      await expect(
        appsPage.cards.openButton(apps[0].displayName)
      ).toBeVisible();
      const body = await appsPage.body().innerText();
      expect(body).not.toMatch(/\bapps\.(card|search|categories)\./);
    }
  );
});

test.describe("Apps catalog — category names per locale", () => {
  test(
    "Category chips use the active locale's name",
    { tag: "@TC-APPS-045" },
    async ({ page }) => {
      const category = {
        _id: "64b7f0c2f1a2b3c4d5e6c0de",
        slug: "content",
        name: { en: "Content Stub", vi: "Nội dung giả" }
      };
      await page.route(APPS_LIST_URL, (route) =>
        fulfillJson(
          route,
          envelope(pageOf([fakeApp(7, { categories: [category] })]))
        )
      );
      // English first: a /vi visit sets the NEXT_LOCALE cookie, which would
      // make the prefix-less /apps resolve to Vietnamese afterwards.
      const en = new AppsPage(page);
      await en.goto();
      await expect(en.text(category.name.en).first()).toBeVisible();
      await expect(en.text(category.name.vi)).toHaveCount(0);

      const viPage = new AppsPage(page, "vi");
      await viPage.goto();
      await expect(viPage.text(category.name.vi).first()).toBeVisible();
      await expect(viPage.text(category.name.en)).toHaveCount(0);
    }
  );
});

test.describe("Apps catalog — access", () => {
  test.use({ role: "guest" });

  test(
    "A guest is sent to the login screen",
    { tag: ["@TC-APPS-019", "@smoke"] },
    async ({ page }) => {
      const appsPage = new AppsPage(page, "vi");
      await appsPage.goto();
      await expect(page).toHaveURL(/\/login/, { timeout: 20_000 });
      await expect(appsPage.searchRegion()).toHaveCount(0);
    }
  );
});
