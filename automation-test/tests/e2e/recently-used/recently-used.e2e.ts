import { test, expect } from "@fixtures";
import type { Page } from "@playwright/test";
import { getCatalogIdsByName } from "@helpers/favorites";
import {
  clearRecentApps,
  getRecentApps,
  recordRecentApps,
  restoreRecentApps
} from "@helpers/recentApps";

// Recently used (/recently-used) — real data from /users/me/recent-apps.
// Role: user (user@test.com). History is set up through the API helper and
// the original snapshot is replayed in afterAll (see helpers/recentApps.ts).
// States that need dates or volumes the live data cannot produce (day
// groups, paging, failure) stub the list endpoint.
// Test cases: test-cases/recently-used.md (TC-RECENT-001 … 013).

const PATH = "/recently-used";

const waitForList = (page: Page) =>
  page.waitForResponse(
    (r) =>
      r.url().includes("/api/v1/users/me/recent-apps") &&
      r.request().method() === "GET" &&
      r.status() === 200
  );

// Register the wait before navigating: the list can resolve before load does.
const gotoAndWait = async (page: Page, url: string) => {
  await Promise.all([waitForList(page), page.goto(url)]);
};

const rowTitle = (page: Page, name: string) =>
  page.getByRole("heading", { name, exact: true });

const rowTitles = (page: Page) =>
  page.locator("section[aria-labelledby^='recent-group-'] h3");

interface StubItem {
  _id: string;
  displayName: string;
  description: null;
  iconUrl: null;
  homeUrl: string;
  categories: never[];
  isFavorite: boolean;
  lastUsedAt: string;
  useCount: number;
}

const stubItem = (i: number, over: Partial<StubItem> = {}): StubItem => ({
  _id: `64b7f0c2f1a2b3c4d5e6f7${String(i).padStart(2, "0")}`,
  displayName: `Stub App ${i}`,
  description: null,
  iconUrl: null,
  homeUrl: "https://example.com",
  categories: [],
  isFavorite: false,
  lastUsedAt: new Date().toISOString(),
  useCount: 1,
  ...over
});

/** One page holding every item. */
const stubList = (page: Page, items: StubItem[]) =>
  page.route(/\/api\/v1\/users\/me\/recent-apps(\?|$)/, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        timestamp: new Date().toISOString(),
        path: "/api/v1/users/me/recent-apps",
        message: "ok",
        data: {
          items,
          meta: { total: items.length, page: 1, limit: 20, totalPages: 1 }
        }
      })
    })
  );

let snapshot: Awaited<ReturnType<typeof getRecentApps>> = [];
let idByName: Record<string, string> = {};
// The two catalog apps the suite works with, read from the live catalog so the
// suite does not depend on a particular seed. B is optional: tests that need
// two apps skip when the catalog has only one.
let A = "";
let B = "";

test.use({ timezoneId: "Asia/Ho_Chi_Minh" });

test.describe("Recently used (/recently-used)", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeAll(async () => {
    snapshot = await getRecentApps();
    idByName = await getCatalogIdsByName();
    [A = "", B = ""] = Object.keys(idByName).sort();
  });

  test.afterAll(async () => {
    await restoreRecentApps(snapshot);
  });

  test(
    "lists recorded apps under Today, newest first",
    { tag: ["@TC-RECENT-001", "@smoke"] },
    async ({ page }) => {
      test.skip(!B, "needs two user-visible catalog apps");
      await clearRecentApps();
      await recordRecentApps([idByName[B], idByName[A]]);

      await gotoAndWait(page, PATH);

      const today = page.getByRole("region", { name: "Today" });
      await expect(today).toBeVisible();
      await expect(rowTitles(page)).toHaveText([A, B]);
      await expect(today.getByText("Opened once").first()).toBeVisible();
    }
  );

  test(
    "no history renders the empty state with a catalog link",
    { tag: "@TC-RECENT-002" },
    async ({ page }) => {
      await clearRecentApps();
      await gotoAndWait(page, PATH);

      await expect(page.getByText("No recent apps yet")).toBeVisible();
      await page.getByRole("button", { name: "Browse apps" }).click();
      // First visit compiles /apps on a dev server; allow for it.
      await expect(page).toHaveURL(/\/apps$/, { timeout: 20_000 });
    }
  );

  test(
    "search narrows the list and a miss offers to clear it",
    { tag: "@TC-RECENT-003" },
    async ({ page }) => {
      await clearRecentApps();
      await recordRecentApps([idByName[A]]);
      await gotoAndWait(page, PATH);

      const search = page.getByRole("textbox", { name: "Search" });
      await search.fill(A.slice(0, 4));
      await expect(rowTitles(page)).toHaveText([A]);

      await search.fill("zzz-no-such-app");
      await expect(page.getByText("No results found")).toBeVisible();
      await page.getByRole("button", { name: "Clear filters" }).click();
      await expect(rowTitles(page)).toHaveText([A]);
    }
  );

  test(
    "removing a row hides it and Undo restores it",
    { tag: ["@TC-RECENT-004", "@smoke"] },
    async ({ page }) => {
      await clearRecentApps();
      await recordRecentApps([idByName[A]]);
      await gotoAndWait(page, PATH);

      await page
        .getByRole("button", { name: `Remove from history: ${A}` })
        .click();
      await expect(rowTitle(page, A)).toHaveCount(0);

      await page.getByRole("button", { name: "Undo" }).click();
      await expect(rowTitle(page, A)).toBeVisible();
      expect((await getRecentApps()).map((a) => a.displayName)).toContain(A);
    }
  );

  test(
    "Clear history asks first and the result survives a reload",
    { tag: "@TC-RECENT-005" },
    async ({ page }) => {
      await clearRecentApps();
      await recordRecentApps([idByName[A]]);
      await gotoAndWait(page, PATH);

      await page.getByRole("button", { name: "Clear History" }).click();
      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible();
      await dialog.getByRole("button", { name: "Clear history" }).click();

      await expect(page.getByText("No recent apps yet")).toBeVisible();
      await Promise.all([waitForList(page), page.reload()]);
      await expect(page.getByText("No recent apps yet")).toBeVisible();
    }
  );

  test(
    "opening an app from the catalog records it",
    { tag: "@TC-RECENT-006" },
    async ({ page, context }) => {
      await clearRecentApps();
      context.on("page", (popup) => popup.close());

      await page.goto("/apps");
      const recorded = page.waitForResponse(
        (r) =>
          r.url().includes("/api/v1/users/me/recent-apps/") &&
          r.request().method() === "POST"
      );
      await page.getByRole("button", { name: `Open ${A}` }).click();
      expect((await recorded).status()).toBe(204);

      await gotoAndWait(page, PATH);
      await expect(rowTitle(page, A)).toBeVisible();
    }
  );

  test(
    "the heart on a row toggles the favorite",
    { tag: "@TC-RECENT-007" },
    async ({ page }) => {
      await clearRecentApps();
      await recordRecentApps([idByName[A]]);
      await gotoAndWait(page, PATH);

      const heart = page.getByRole("button", {
        name: new RegExp(`(Add to|Remove from) favorites: ${A}`)
      });
      const before = await heart.getAttribute("aria-pressed");
      await heart.click();
      await expect(heart).not.toHaveAttribute("aria-pressed", before ?? "");
      await heart.click();
      await expect(heart).toHaveAttribute("aria-pressed", before ?? "false");
    }
  );

  test(
    "Load more fetches the next page",
    { tag: "@TC-RECENT-008" },
    async ({ page }) => {
      const item = (i: number) => ({
        _id: `64b7f0c2f1a2b3c4d5e6f7${String(i).padStart(2, "0")}`,
        displayName: `Stub App ${i}`,
        description: null,
        iconUrl: null,
        homeUrl: "https://example.com",
        categories: [],
        isFavorite: false,
        lastUsedAt: new Date().toISOString(),
        useCount: 1
      });
      await page.route(/\/api\/v1\/users\/me\/recent-apps(\?|$)/, (route) => {
        const pageNo = Number(
          new URL(route.request().url()).searchParams.get("page")
        );
        const items = pageNo === 2 ? [item(2)] : [item(1)];
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            timestamp: new Date().toISOString(),
            path: "/api/v1/users/me/recent-apps",
            message: "ok",
            data: {
              items,
              meta: { total: 2, page: pageNo, limit: 1, totalPages: 2 }
            }
          })
        });
      });

      await page.goto(PATH);
      await expect(rowTitle(page, "Stub App 1")).toBeVisible();
      await expect(rowTitle(page, "Stub App 2")).toBeVisible();
      await expect(
        page.getByText("You've reached the end of your history.")
      ).toBeVisible();
    }
  );

  test(
    "renders in Vietnamese at /vi",
    { tag: "@TC-RECENT-009" },
    async ({ page }) => {
      await clearRecentApps();
      await recordRecentApps([idByName[A]]);
      await gotoAndWait(page, `/vi${PATH}`);

      await expect(
        page.getByRole("heading", { name: "Dùng gần đây", level: 1 })
      ).toBeVisible();
      await expect(page.getByRole("region", { name: "Hôm nay" })).toBeVisible();
    }
  );

  test(
    "rows group into Today / Yesterday / This Week / Earlier at the day edges [BVA]",
    { tag: "@TC-RECENT-010" },
    async ({ page }) => {
      // Wednesday 07.10.2026 10:00 in Ho Chi Minh City. Each pair sits on
      // either side of a group boundary (local midnight).
      await page.clock.setFixedTime(new Date("2026-10-07T10:00:00+07:00"));
      const at = (iso: string, i: number) =>
        stubItem(i, { lastUsedAt: new Date(iso).toISOString() });
      const items = [
        at("2026-10-07T00:00:00+07:00", 1), // today, first instant
        at("2026-10-06T23:59:59+07:00", 2), // yesterday, last second
        at("2026-10-06T00:00:00+07:00", 3), // yesterday, first instant
        at("2026-10-05T23:59:59+07:00", 4), // this week
        at("2026-10-01T00:00:00+07:00", 5), // this week, oldest day
        at("2026-09-30T23:59:59+07:00", 6) // earlier
      ];
      await stubList(page, items);
      await page.goto(PATH);

      const group = (name: string) => page.getByRole("region", { name });
      await expect(group("Today").locator("h3")).toHaveText(["Stub App 1"]);
      await expect(group("Yesterday").locator("h3")).toHaveText([
        "Stub App 2",
        "Stub App 3"
      ]);
      await expect(group("This Week").locator("h3")).toHaveText([
        "Stub App 4",
        "Stub App 5"
      ]);
      await expect(group("Earlier").locator("h3")).toHaveText(["Stub App 6"]);
    }
  );

  test(
    "a row shows when it was last opened and how many times",
    { tag: "@TC-RECENT-011" },
    async ({ page }) => {
      await stubList(page, [
        stubItem(1, {
          useCount: 3,
          lastUsedAt: new Date(Date.now() - 2 * 3600_000).toISOString()
        }),
        stubItem(2, { useCount: 1 })
      ]);
      await page.goto(PATH);
      const row = (name: string) =>
        page.getByRole("listitem").filter({ has: rowTitle(page, name) });
      await expect(row("Stub App 1")).toContainText("Opened 3 times");
      await expect(row("Stub App 1")).toContainText(/Last opened:\s*\S.*ago/);
      await expect(row("Stub App 2")).toContainText("Opened once");
    }
  );

  test(
    "Cancel in the clear-history dialog keeps the history [ST]",
    { tag: "@TC-RECENT-012" },
    async ({ page }) => {
      await clearRecentApps();
      await recordRecentApps([idByName[A]]);
      await gotoAndWait(page, PATH);

      await page.getByRole("button", { name: "Clear History" }).click();
      const dialog = page.getByRole("dialog");
      await expect(dialog).toContainText("Clear your recent history?");
      await dialog.getByRole("button", { name: "Cancel" }).click();
      await expect(dialog).toBeHidden();
      await expect(rowTitle(page, A)).toBeVisible();
      expect((await getRecentApps()).map((a) => a.displayName)).toContain(A);
    }
  );

  test(
    "a failing history request shows the error message",
    { tag: "@TC-RECENT-013" },
    async ({ page }) => {
      await page.route(/\/api\/v1\/users\/me\/recent-apps(\?|$)/, (route) =>
        route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({
            code: "INTERNAL_ERROR",
            message: "boom",
            timestamp: new Date().toISOString(),
            path: "/api/v1/users/me/recent-apps"
          })
        })
      );
      await page.goto(PATH);
      await expect(
        page.getByRole("alert").filter({
          hasText: "Could not load your recent apps."
        })
      ).toBeVisible({ timeout: 20_000 });
      await expect(page.getByText("No recent apps yet")).toHaveCount(0);
    }
  );
});
