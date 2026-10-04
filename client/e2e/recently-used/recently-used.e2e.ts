import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import { getCatalogIdsByName } from "../helpers/favorites";
import {
  clearRecentApps,
  getRecentApps,
  recordRecentApps,
  restoreRecentApps
} from "../helpers/recentApps";

// Recently used (/recently-used) — real data from /users/me/recent-apps.
// Runs as user@test.com. History is set up through the API helper and the
// original snapshot is replayed in afterAll (see helpers/recentApps.ts).
//
// Covered (docs/specs/recently-used/e2e.md):
//   1 Happy      — recorded apps listed under Today, newest first, open count
//   2 Empty      — no history → empty state with Browse apps CTA
//   3 Search     — match narrows the list, no match → no-results + clear
//   4 Remove     — row leaves at once, toast Undo brings it back
//   5 Clear all  — confirm dialog, empty state survives a reload
//   6 Record     — Open on the /apps catalog lands the app in history
//   7 Favorite   — heart on a row toggles and persists
//   8 Paging     — Load more requests page 2 (stubbed: catalog has 3 apps)
//   9 i18n       — vi heading and group label

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

let snapshot: Awaited<ReturnType<typeof getRecentApps>> = [];
let idByName: Record<string, string> = {};
// The two catalog apps the suite works with, read from the live catalog so the
// suite does not depend on a particular seed. B is optional: tests that need
// two apps skip when the catalog has only one.
let A = "";
let B = "";

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

  test("lists recorded apps under Today, newest first", async ({ page }) => {
    test.skip(!B, "needs two user-visible catalog apps");
    await clearRecentApps();
    await recordRecentApps([idByName[B], idByName[A]]);

    await gotoAndWait(page, PATH);

    const today = page.getByRole("region", { name: "Today" });
    await expect(today).toBeVisible();
    await expect(rowTitles(page)).toHaveText([A, B]);
    await expect(today.getByText("Opened once").first()).toBeVisible();
  });

  test("no history renders the empty state with a catalog link", async ({
    page
  }) => {
    await clearRecentApps();
    await gotoAndWait(page, PATH);

    await expect(page.getByText("No recent apps yet")).toBeVisible();
    await page.getByRole("button", { name: "Browse apps" }).click();
    // First visit compiles /apps on a dev server; allow for it.
    await expect(page).toHaveURL(/\/apps$/, { timeout: 20_000 });
  });

  test("search narrows the list and a miss offers to clear it", async ({
    page
  }) => {
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
  });

  test("removing a row hides it and Undo restores it", async ({ page }) => {
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
  });

  test("Clear history asks first and the result survives a reload", async ({
    page
  }) => {
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
  });

  test("opening an app from the catalog records it", async ({
    page,
    context
  }) => {
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
  });

  test("the heart on a row toggles the favorite", async ({ page }) => {
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
  });

  test("Load more fetches the next page", async ({ page }) => {
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
  });

  test("renders in Vietnamese at /vi", async ({ page }) => {
    await clearRecentApps();
    await recordRecentApps([idByName[A]]);
    await gotoAndWait(page, `/vi${PATH}`);

    await expect(
      page.getByRole("heading", { name: "Dùng gần đây", level: 1 })
    ).toBeVisible();
    await expect(page.getByRole("region", { name: "Hôm nay" })).toBeVisible();
  });
});
