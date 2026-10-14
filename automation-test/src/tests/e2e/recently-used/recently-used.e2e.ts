import { test, expect } from "@/fixtures";
import { copy, copyVi, fill } from "@/data/copy";
import { RecentlyUsedPage } from "@/pages/dashboard/recently-used.page";
import { getCatalogIdsByName } from "@/utils/favorites";
import { formatIcu } from "@/utils/icu";
import {
  RECENT_APPS_LIST_URL,
  RECENT_APPS_PATH,
  clearRecentApps,
  getRecentApps,
  recentAppsBody,
  recentStubItem,
  recordRecentApps,
  restoreRecentApps
} from "@/utils/recent-apps";
import { escapeRegExp } from "@/utils/regex";

// Recently used (/recently-used) — real data from /users/me/recent-apps.
// Role: user (user@test.com). History is set up through the API
// (utils/recent-apps.ts) and the original snapshot is replayed in afterAll.
// States that need dates or volumes the live data cannot produce (day
// groups, paging, failure) stub the list endpoint.
// Test cases: test-cases/recently-used.md (TC-RECENTLYUSED-001 … 013, 030 … 034).

const t = copy.recentlyUsed;
const openedCount = (count: number) => formatIcu(t.card.openedCount, { count });

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
    "Opened apps are listed under Today, newest first",
    { tag: ["@TC-RECENTLYUSED-001", "@smoke"] },
    async ({ recentlyUsedPage: recent }) => {
      test.skip(!B, "needs two user-visible catalog apps");
      await clearRecentApps();
      await recordRecentApps([idByName[B], idByName[A]]);

      await recent.gotoAndWait();

      const today = recent.group(t.groups.today);
      await expect(today).toBeVisible();
      await expect(recent.rowTitles()).toHaveText([A, B]);
      await expect(today.getByText(openedCount(1)).first()).toBeVisible();
    }
  );

  test(
    "No history shows the empty state with a catalogue link",
    { tag: "@TC-RECENTLYUSED-002" },
    async ({ recentlyUsedPage: recent, page }) => {
      await clearRecentApps();
      await recent.gotoAndWait();

      await expect(recent.emptyState()).toBeVisible();
      await recent.browseButton().click();
      // First visit compiles /apps on a dev server; allow for it.
      await expect(page).toHaveURL(/\/apps$/, { timeout: 20_000 });
    }
  );

  test(
    "Search narrows the history, a miss offers to clear",
    { tag: "@TC-RECENTLYUSED-003" },
    async ({ recentlyUsedPage: recent }) => {
      await clearRecentApps();
      await recordRecentApps([idByName[A]]);
      await recent.gotoAndWait();

      await recent.search(A.slice(0, 4));
      await expect(recent.rowTitles()).toHaveText([A]);

      await recent.search("zzz-no-such-app");
      await expect(recent.noResults()).toBeVisible();
      await recent.clearFiltersButton().click();
      await expect(recent.rowTitles()).toHaveText([A]);
    }
  );

  test(
    "Remove one app, then Undo",
    { tag: ["@TC-RECENTLYUSED-004", "@smoke"] },
    async ({ recentlyUsedPage: recent }) => {
      await clearRecentApps();
      await recordRecentApps([idByName[A]]);
      await recent.gotoAndWait();

      await recent.remove(A);
      await expect(recent.rowTitle(A)).toHaveCount(0);

      await recent.undoButton().click();
      await expect(recent.rowTitle(A)).toBeVisible();
      expect((await getRecentApps()).map((a) => a.displayName)).toContain(A);
    }
  );

  test(
    "Clear history asks first and the result survives a reload",
    { tag: "@TC-RECENTLYUSED-005" },
    async ({ recentlyUsedPage: recent }) => {
      await clearRecentApps();
      await recordRecentApps([idByName[A]]);
      await recent.gotoAndWait();

      await recent.openClearDialog();
      await expect(recent.clearDialog.root()).toBeVisible();
      await recent.clearDialog.confirm();

      await expect(recent.emptyState()).toBeVisible();
      await recent.reloadAndWait();
      await expect(recent.emptyState()).toBeVisible();
    }
  );

  test(
    "Opening an app from the catalogue lands it in the history",
    { tag: ["@TC-RECENTLYUSED-006", "@smoke"] },
    async ({ recentlyUsedPage: recent, appsPage, page, context }) => {
      await clearRecentApps();
      context.on("page", (popup) => popup.close());

      await appsPage.goto();
      const recorded = page.waitForResponse(
        (r) =>
          r.url().includes(`${RECENT_APPS_PATH}/`) &&
          r.request().method() === "POST"
      );
      await appsPage.cards.open(A);
      expect((await recorded).status()).toBe(204);

      await recent.gotoAndWait();
      await expect(recent.rowTitle(A)).toBeVisible();
    }
  );

  test(
    "The heart on a row toggles the favourite",
    { tag: "@TC-RECENTLYUSED-007" },
    async ({ recentlyUsedPage: recent }) => {
      await clearRecentApps();
      await recordRecentApps([idByName[A]]);
      await recent.gotoAndWait();

      const heart = recent.hearts.forApp(A);
      const before = await heart.getAttribute("aria-pressed");
      await heart.click();
      await expect(heart).not.toHaveAttribute("aria-pressed", before ?? "");
      await heart.click();
      await expect(heart).toHaveAttribute("aria-pressed", before ?? "false");
    }
  );

  test(
    "Infinite scroll loads the next page and says when it ends",
    { tag: "@TC-RECENTLYUSED-008" },
    async ({ recentlyUsedPage: recent, page }) => {
      await page.route(RECENT_APPS_LIST_URL, (route) => {
        const pageNo = Number(
          new URL(route.request().url()).searchParams.get("page")
        );
        const items = pageNo === 2 ? [recentStubItem(2)] : [recentStubItem(1)];
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: recentAppsBody(items, {
            total: 2,
            page: pageNo,
            limit: 1,
            totalPages: 2
          })
        });
      });

      await recent.goto();
      await expect(recent.rowTitle("Stub App 1")).toBeVisible();
      await expect(recent.rowTitle("Stub App 2")).toBeVisible();
      await expect(recent.allLoaded()).toBeVisible();
    }
  );

  test("Vietnamese page", { tag: "@TC-RECENTLYUSED-009" }, async ({ page }) => {
    const recent = new RecentlyUsedPage(page, "vi");
    await clearRecentApps();
    await recordRecentApps([idByName[A]]);
    await recent.gotoAndWait();

    await expect(recent.heading()).toBeVisible();
    await expect(recent.group(copyVi.recentlyUsed.groups.today)).toBeVisible();
  });

  test(
    "Day groups switch exactly at local midnight",
    { tag: "@TC-RECENTLYUSED-010" },
    async ({ recentlyUsedPage: recent, page }) => {
      // Wednesday 07.10.2026 10:00 in Ho Chi Minh City. Each pair sits on
      // either side of a group boundary (local midnight).
      await page.clock.setFixedTime(new Date("2026-10-07T10:00:00+07:00"));
      const at = (iso: string, i: number) =>
        recentStubItem(i, { lastUsedAt: new Date(iso).toISOString() });
      const items = [
        at("2026-10-07T00:00:00+07:00", 1), // today, first instant
        at("2026-10-06T23:59:59+07:00", 2), // yesterday, last second
        at("2026-10-06T00:00:00+07:00", 3), // yesterday, first instant
        at("2026-10-05T23:59:59+07:00", 4), // this week
        at("2026-10-01T00:00:00+07:00", 5), // this week, oldest day
        at("2026-09-30T23:59:59+07:00", 6) // earlier
      ];
      await page.route(RECENT_APPS_LIST_URL, (route) =>
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: recentAppsBody(items)
        })
      );
      await recent.goto();

      await expect(recent.groupRowTitles(t.groups.today)).toHaveText([
        "Stub App 1"
      ]);
      await expect(recent.groupRowTitles(t.groups.yesterday)).toHaveText([
        "Stub App 2",
        "Stub App 3"
      ]);
      await expect(recent.groupRowTitles(t.groups.thisWeek)).toHaveText([
        "Stub App 4",
        "Stub App 5"
      ]);
      await expect(recent.groupRowTitles(t.groups.earlier)).toHaveText([
        "Stub App 6"
      ]);
    }
  );

  test(
    "A row shows its last-opened time and open count",
    { tag: "@TC-RECENTLYUSED-011" },
    async ({ recentlyUsedPage: recent, page }) => {
      const items = [
        recentStubItem(1, {
          useCount: 3,
          lastUsedAt: new Date(Date.now() - 2 * 3600_000).toISOString()
        }),
        recentStubItem(2, { useCount: 1 })
      ];
      await page.route(RECENT_APPS_LIST_URL, (route) =>
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: recentAppsBody(items)
        })
      );
      await recent.goto();
      await expect(recent.row("Stub App 1")).toContainText(openedCount(3));
      // "ago" comes from Intl relative time (useFormatTime), not a catalogue.
      await expect(recent.row("Stub App 1")).toContainText(
        new RegExp(`${escapeRegExp(t.card.lastOpened)}:\\s*\\S.*ago`)
      );
      await expect(recent.row("Stub App 2")).toContainText(openedCount(1));
    }
  );

  test(
    "Cancelling the clear dialog keeps the history",
    { tag: "@TC-RECENTLYUSED-012" },
    async ({ recentlyUsedPage: recent }) => {
      await clearRecentApps();
      await recordRecentApps([idByName[A]]);
      await recent.gotoAndWait();

      await recent.openClearDialog();
      const dialog = recent.clearDialog.root();
      await expect(dialog).toContainText(t.clearDialog.title);
      await recent.clearDialog.cancel();
      await expect(dialog).toBeHidden();
      await expect(recent.rowTitle(A)).toBeVisible();
      expect((await getRecentApps()).map((a) => a.displayName)).toContain(A);
    }
  );

  test(
    "A failing history request shows an error, not the empty state",
    { tag: "@TC-RECENTLYUSED-013" },
    async ({ recentlyUsedPage: recent, page }) => {
      await page.route(RECENT_APPS_LIST_URL, (route) =>
        route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({
            code: "INTERNAL_ERROR",
            message: "boom",
            timestamp: new Date().toISOString(),
            path: RECENT_APPS_PATH
          })
        })
      );
      await recent.goto();
      await expect(recent.errorAlert()).toBeVisible({ timeout: 20_000 });
      await expect(recent.emptyState()).toHaveCount(0);
    }
  );

  test(
    "Opening an app from its row records another launch",
    { tag: "@TC-RECENTLYUSED-030" },
    async ({ recentlyUsedPage: recent, page, context }) => {
      test.skip(!B, "needs two user-visible catalog apps");
      await clearRecentApps();
      // A first, then B: B is newest.
      await recordRecentApps([idByName[A], idByName[B]]);
      context.on("page", (popup) => popup.close());
      await recent.gotoAndWait();
      await expect(recent.rowTitles()).toHaveText([B, A]);

      const recorded = page.waitForResponse(
        (r) =>
          r.url().includes(`${RECENT_APPS_PATH}/${idByName[A]}`) &&
          r.request().method() === "POST"
      );
      await recent.openButton(A).click();
      expect((await recorded).status()).toBe(204);

      await recent.reloadAndWait();
      await expect(recent.rowTitles()).toHaveText([A, B]);
    }
  );

  test(
    "Clear History is disabled while there is nothing to clear",
    { tag: "@TC-RECENTLYUSED-031" },
    async ({ recentlyUsedPage: recent }) => {
      await clearRecentApps();
      await recent.gotoAndWait();

      await expect(recent.emptyState()).toBeVisible();
      await expect(recent.clearHistoryButton()).toBeDisabled();
    }
  );

  test(
    "A search in the URL opens the history already filtered",
    { tag: "@TC-RECENTLYUSED-032" },
    async ({ recentlyUsedPage: recent }) => {
      await clearRecentApps();
      await recordRecentApps([idByName[A]]);

      await recent.gotoAndWait("?search=zzz-no-such-app");
      await expect(recent.searchInput()).toHaveValue("zzz-no-such-app");
      await expect(recent.noResults()).toBeVisible();
      await expect(recent.rowTitle(A)).toHaveCount(0);

      await recent.clearFiltersButton().click();
      await expect(recent.rowTitles()).toHaveText([A]);
    }
  );

  test(
    "Each day group shows how many apps it holds",
    { tag: "@TC-RECENTLYUSED-033" },
    async ({ recentlyUsedPage: recent, page }) => {
      await page.clock.setFixedTime(new Date("2026-10-07T10:00:00+07:00"));
      const at = (iso: string, i: number) =>
        recentStubItem(i, { lastUsedAt: new Date(iso).toISOString() });
      const items = [
        at("2026-10-07T09:00:00+07:00", 1), // today
        at("2026-10-06T12:00:00+07:00", 2), // yesterday
        at("2026-10-06T08:00:00+07:00", 3) // yesterday
      ];
      await page.route(RECENT_APPS_LIST_URL, (route) =>
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: recentAppsBody(items)
        })
      );
      await recent.goto();

      await expect(recent.group(t.groups.today)).toContainText(
        formatIcu(t.groupCount, { count: 1 })
      );
      await expect(recent.group(t.groups.yesterday)).toContainText(
        formatIcu(t.groupCount, { count: 2 })
      );
    }
  );

  test(
    "Removing and clearing confirm with a toast",
    { tag: "@TC-RECENTLYUSED-034" },
    async ({ recentlyUsedPage: recent }) => {
      test.skip(!B, "needs two user-visible catalog apps");
      await clearRecentApps();
      await recordRecentApps([idByName[A], idByName[B]]);
      await recent.gotoAndWait();

      // exact: the screen-reader announcement says the same with a full stop.
      await recent.remove(A);
      await expect(
        recent.toast.withText(fill(t.toast.removed, { name: A }), {
          exact: true
        })
      ).toBeVisible();

      await recent.openClearDialog();
      await recent.clearDialog.confirm();
      await expect(
        recent.toast.withText(t.toast.cleared, { exact: true })
      ).toBeVisible();
    }
  );
});
