import { test, expect } from "@fixtures";
import type { Page, Request, Route } from "@playwright/test";
import {
  APPS_API,
  catalogByName,
  isAppsListResponse,
  openedUrls,
  stubWindowOpen,
  waitForAppsList
} from "@helpers/catalog";
import type { CatalogApp } from "@helpers/catalog";

// /apps toolbar, states and launch — search, category filter, view toggle,
// pagination, empty / error / loading, keyboard and i18n.
// Test cases: test-cases/apps.md (TC-APPS-004 … 019). Role: user, except
// the access case (guest).
//
// Real data where the shape is guaranteed by the catalogue itself; stubbed
// GET /apps where a state needs more apps, a null icon, or a failure.

const LIST_RE = /\/api\/v1\/apps(\?|$)/;

const envelope = (data: unknown) => ({
  timestamp: new Date().toISOString(),
  path: APPS_API,
  message: "OK",
  data
});

const fakeApp = (i: number, over: Partial<CatalogApp> = {}): CatalogApp => ({
  _id: `64b7f0c2f1a2b3c4d5e6${String(i).padStart(4, "0")}`,
  displayName: `Stub App ${i}`,
  description: `Stub description ${i}`,
  iconUrl: null,
  homeUrl: `https://stub-${i}.example.com`,
  categories: [],
  isFavorite: false,
  ...over
});

/** Fulfils GET /apps with `pages` pages of 20; records every request. */
const stubPages = (page: Page, totalPages: number, seen: Request[] = []) =>
  page.route(LIST_RE, (route: Route) => {
    seen.push(route.request());
    const p = Number(new URL(route.request().url()).searchParams.get("page"));
    const pageNo = p || 1;
    const items = Array.from({ length: 2 }, (_, i) =>
      fakeApp(pageNo * 100 + i)
    );
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(
        envelope({
          items,
          meta: { total: totalPages * 20, page: pageNo, limit: 20, totalPages }
        })
      )
    });
  });

const toolbarSearch = (page: Page) =>
  page.getByRole("search").getByRole("textbox");

let apps: CatalogApp[] = [];

test.beforeEach(async ({ userApi }) => {
  apps = await catalogByName(userApi);
});

test.describe("Apps catalog — search", () => {
  test(
    "search filters the catalog server-side, lands in the URL and clears",
    { tag: ["@TC-APPS-004", "@smoke"] },
    async ({ page }) => {
      const target = apps[0];
      await Promise.all([waitForAppsList(page), page.goto("/vi/apps")]);

      const searched = page.waitForResponse(
        (r) =>
          isAppsListResponse(r) &&
          new URL(r.url()).searchParams.get("search") === target.displayName
      );
      await toolbarSearch(page).fill(target.displayName);
      const res = await searched;
      const { data } = (await res.json()) as { data: { items: CatalogApp[] } };
      expect(data.items.map((a) => a.displayName)).toContain(
        target.displayName
      );
      await expect(page).toHaveURL(/[?&]search=/);
      await expect(
        page.getByRole("heading", { level: 3, name: target.displayName })
      ).toBeVisible();

      // Reload keeps the search (URL is the source of truth).
      await page.reload();
      await expect(toolbarSearch(page)).toHaveValue(target.displayName);

      // Clearing the box brings the whole catalogue back.
      await toolbarSearch(page).fill("");
      await expect(page).not.toHaveURL(/[?&]search=/);
      await expect(
        page.getByRole("heading", { level: 3 }).first()
      ).toBeVisible();
    }
  );

  test(
    "a search that matches nothing shows the empty state with Clear filters",
    { tag: "@TC-APPS-005" },
    async ({ page }) => {
      await page.goto("/vi/apps?search=zzzqqq-no-such-app");
      await expect(
        page.getByRole("heading", { name: "Không tìm thấy ứng dụng nào." })
      ).toBeVisible();
      await page.getByRole("button", { name: "Xóa bộ lọc" }).click();
      await expect(page).not.toHaveURL(/search=/);
      await expect(
        page.getByRole("heading", { level: 3 }).first()
      ).toBeVisible();
    }
  );
});

test.describe("Apps catalog — category filter", () => {
  test(
    "picking a category filters the list and shows the active-filter badge",
    { tag: "@TC-APPS-006" },
    async ({ page }) => {
      await Promise.all([waitForAppsList(page), page.goto("/vi/apps")]);

      await page.getByRole("button", { name: /Bộ lọc/ }).click();
      const popover = page.locator('[data-slot="popover-content"]');
      await popover.getByRole("combobox").first().click();
      const option = page.getByRole("option").nth(1);
      await expect(option).toBeVisible();
      const filtered = page.waitForResponse(
        (r) =>
          isAppsListResponse(r) &&
          new URL(r.url()).searchParams.has("categoryId")
      );
      await option.click();
      const res = await filtered;
      const categoryId = new URL(res.url()).searchParams.get("categoryId")!;
      const { data } = (await res.json()) as { data: { items: CatalogApp[] } };
      for (const app of data.items) {
        expect(app.categories.map((c) => c._id)).toContain(categoryId);
      }
      await expect(page).toHaveURL(new RegExp(`categoryId=${categoryId}`));
      await expect(page.getByRole("button", { name: /Bộ lọc/ })).toContainText(
        "1"
      );
    }
  );

  test(
    "search and category combine as an intersection [DT]",
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
          new URL(r.url()).searchParams.get("search") === term
      );
      await page.goto(
        `/vi/apps?search=${encodeURIComponent(term)}&categoryId=${categoryId}`
      );
      const { data } = (await (await both).json()) as {
        data: { items: CatalogApp[] };
      };
      expect(data.items.map((a) => a._id)).toContain(app!._id);
      for (const item of data.items) {
        expect(item.categories.map((c) => c._id)).toContain(categoryId);
      }
    }
  );
});

test.describe("Apps catalog — view and pagination", () => {
  test(
    "grid / list toggle switches the layout and exposes the pressed state",
    { tag: "@TC-APPS-008" },
    async ({ page }) => {
      await Promise.all([waitForAppsList(page), page.goto("/vi/apps")]);
      const grid = page.getByRole("button", { name: "Dạng lưới" });
      const list = page.getByRole("button", { name: "Dạng danh sách" });
      await expect(grid).toHaveAttribute("aria-pressed", "true");
      await expect(list).toHaveAttribute("aria-pressed", "false");

      await list.click();
      await expect(list).toHaveAttribute("aria-pressed", "true");
      await expect(grid).toHaveAttribute("aria-pressed", "false");
    }
  );

  test(
    "a single page hides the pager [BVA: totalPages = 1]",
    { tag: "@TC-APPS-009" },
    async ({ page }) => {
      await stubPages(page, 1);
      await page.goto("/vi/apps");
      await expect(page.getByText("Stub App 100")).toBeVisible();
      await expect(
        page.getByRole("navigation", { name: "pagination" })
      ).toHaveCount(0);
    }
  );

  test(
    "pager walks page 1 → 2 → last and the edges are disabled [BVA]",
    { tag: "@TC-APPS-010" },
    async ({ page }) => {
      const seen: Request[] = [];
      await stubPages(page, 3, seen);
      await page.goto("/vi/apps");
      const pager = page.getByRole("navigation", { name: "pagination" });
      await expect(pager).toBeVisible();

      // page 1 — Previous disabled.
      const prev = pager.getByRole("link", { name: "Go to previous page" });
      const next = pager.getByRole("link", { name: "Go to next page" });
      await expect(prev).toHaveAttribute("aria-disabled", "true");
      await expect(next).not.toHaveAttribute("aria-disabled", "true");

      // page 2 — URL and request follow.
      await pager.getByRole("link", { name: "2", exact: true }).click();
      await expect(page).toHaveURL(/[?&]page=2/);
      await expect(page.getByText("Stub App 200")).toBeVisible();

      // last page — Next disabled.
      await pager.getByRole("link", { name: "3", exact: true }).click();
      await expect(page).toHaveURL(/[?&]page=3/);
      await expect(page.getByText("Stub App 300")).toBeVisible();
      await expect(next).toHaveAttribute("aria-disabled", "true");
      expect(
        seen.map((r) => new URL(r.url()).searchParams.get("page"))
      ).toEqual(expect.arrayContaining(["1", "2", "3"]));
    }
  );

  test(
    "a hand-typed page beyond the last one renders safely [BVA: last+1]",
    { tag: "@TC-APPS-011" },
    async ({ page }) => {
      await page.goto("/vi/apps?page=999");
      // The API answers an empty page; the empty state is the safe outcome.
      await expect(
        page.getByRole("heading", { name: "Không tìm thấy ứng dụng nào." })
      ).toBeVisible();
    }
  );
});

test.describe("Apps catalog — states", () => {
  test(
    "an app with no icon and no description renders the initial-letter fallback",
    { tag: "@TC-APPS-012" },
    async ({ page }) => {
      await page.route(LIST_RE, (route) =>
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(
            envelope({
              items: [
                fakeApp(1, {
                  displayName: "Zebra Null",
                  iconUrl: null,
                  description: null
                })
              ],
              meta: { total: 1, page: 1, limit: 20, totalPages: 1 }
            })
          )
        })
      );
      await page.goto("/vi/apps");
      const card = page
        .locator('[data-slot="card"]')
        .filter({ has: page.getByRole("heading", { name: "Zebra Null" }) });
      await expect(card).toBeVisible();
      await expect(card.getByText("Z", { exact: true })).toBeVisible();
      await expect(card.locator("img")).toHaveCount(0);
      await expect(card).not.toContainText("null");
    }
  );

  test(
    "skeleton cards show while the catalogue request is pending",
    { tag: "@TC-APPS-013" },
    async ({ page }) => {
      let release!: () => void;
      const hold = new Promise<void>((r) => (release = r));
      await page.route(LIST_RE, async (route) => {
        await hold;
        await route.continue();
      });
      await page.goto("/vi/apps");
      await expect(page.locator(".animate-pulse").first()).toBeVisible();
      release();
      await expect(page.getByRole("heading", { level: 3 }).first()).toBeVisible(
        { timeout: 15_000 }
      );
      await expect(page.locator(".animate-pulse")).toHaveCount(0);
    }
  );

  test(
    "a failing catalogue request shows the error alert",
    { tag: "@TC-APPS-014" },
    async ({ page }) => {
      // BUG: BUG-016 — AppsBoard renders its role="alert" inside PageContent's children,
      // but an errored query has no items, so PageContent shows the empty
      // state instead and the error never reaches the user.
      test.fail();
      await page.route(LIST_RE, (route) =>
        route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({
            code: "INTERNAL_ERROR",
            message: "boom",
            timestamp: new Date().toISOString(),
            path: APPS_API
          })
        })
      );
      await page.goto("/vi/apps");
      // React Query retries a 5xx twice with backoff before giving up.
      await expect(
        page.getByRole("alert").filter({
          hasText: "Không thể tải ứng dụng. Vui lòng thử lại."
        })
      ).toBeVisible({ timeout: 20_000 });
    }
  );
});

test.describe("Apps catalog — launch and keyboard", () => {
  test(
    "opening a tile records the launch for Recently used",
    { tag: "@TC-APPS-015" },
    async ({ page }) => {
      await stubWindowOpen(page);
      const app = apps[0];
      await page.goto("/apps");
      const recorded = page.waitForResponse(
        (r) =>
          r.url().includes(`/api/v1/users/me/recent-apps/${app._id}`) &&
          r.request().method() === "POST"
      );
      await page
        .getByRole("button", { name: `Open ${app.displayName}` })
        .click();
      expect((await recorded).status()).toBe(204);
      expect(await openedUrls(page)).toContain(app.homeUrl);
    }
  );

  test(
    "Open is reachable by keyboard and Enter launches the app",
    { tag: "@TC-APPS-016" },
    async ({ page }) => {
      await stubWindowOpen(page);
      const app = apps[0];
      await page.goto("/vi/apps");
      const open = page.getByRole("button", { name: `Mở ${app.displayName}` });
      await open.focus();
      await expect(open).toBeFocused();
      await page.keyboard.press("Enter");
      await expect.poll(() => openedUrls(page)).toContain(app.homeUrl);
    }
  );

  test(
    "a filter change is announced through the live region",
    { tag: "@TC-APPS-017" },
    async ({ page }) => {
      await Promise.all([waitForAppsList(page), page.goto("/vi/apps")]);
      await toolbarSearch(page).fill(apps[0].displayName.slice(0, 3));
      await expect(page.locator("#announcer")).toHaveText(
        "Đã áp dụng bộ lọc.",
        { timeout: 5_000 }
      );
    }
  );
});

test.describe("Apps catalog — i18n", () => {
  test(
    "Vietnamese chrome: title, search placeholder, Filters, Open, view toggle",
    { tag: "@TC-APPS-018" },
    async ({ page }) => {
      await Promise.all([waitForAppsList(page), page.goto("/vi/apps")]);
      await expect(
        page.getByRole("heading", { name: "Ứng dụng", exact: true })
      ).toBeVisible();
      await expect(toolbarSearch(page)).toHaveAttribute(
        "placeholder",
        "Tìm ứng dụng..."
      );
      await expect(page.getByRole("button", { name: /Bộ lọc/ })).toBeVisible();
      await expect(
        page.getByRole("button", { name: `Mở ${apps[0].displayName}` })
      ).toBeVisible();
      const body = await page.locator("body").innerText();
      expect(body).not.toMatch(/\bapps\.(card|search|categories)\./);
    }
  );
});

test.describe("Apps catalog — category names per locale", () => {
  test(
    "a category chip reads the Vietnamese name on /vi and the English one on /",
    { tag: "@TC-APPS-045" },
    async ({ page }) => {
      const category = {
        _id: "64b7f0c2f1a2b3c4d5e6c0de",
        slug: "content",
        name: { en: "Content Stub", vi: "Nội dung giả" }
      };
      await page.route(LIST_RE, (route) =>
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(
            envelope({
              items: [fakeApp(7, { categories: [category] })],
              meta: { total: 1, page: 1, limit: 20, totalPages: 1 }
            })
          )
        })
      );
      // English first: a /vi visit sets the NEXT_LOCALE cookie, which would
      // make the prefix-less /apps resolve to Vietnamese afterwards.
      await page.goto("/apps");
      await expect(page.getByText("Content Stub").first()).toBeVisible();
      await expect(page.getByText("Nội dung giả")).toHaveCount(0);

      await page.goto("/vi/apps");
      await expect(page.getByText("Nội dung giả").first()).toBeVisible();
      await expect(page.getByText("Content Stub")).toHaveCount(0);
    }
  );
});

test.describe("Apps catalog — access", () => {
  test.use({ role: "guest" });

  test(
    "a signed-out visitor is sent to the login screen",
    { tag: "@TC-APPS-019" },
    async ({ page }) => {
      await page.goto("/vi/apps");
      await expect(page).toHaveURL(/\/login/, { timeout: 20_000 });
      await expect(page.getByRole("search")).toHaveCount(0);
    }
  );
});
