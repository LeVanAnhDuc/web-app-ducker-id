import { test, expect } from "@playwright/test";
import type { Response } from "@playwright/test";

// Home dashboard at /vi (dashboard index — ROUTES.HOME = "/"). QuickAccess +
// Recommended now consume the real GET /apps API; the "total apps" stat reflects
// meta.total. Read-only, nothing to revert. Auth from global auth.setup.ts.

const HOME_PATH = "/vi";

const isAppsList = (r: Response) =>
  r.url().includes("/api/v1/apps") &&
  !r.url().includes("/apps/categories") &&
  r.status() === 200;

test.describe("Home dashboard (/vi)", () => {
  test("QuickAccess renders real apps from the API", async ({ page }) => {
    const listResponse = page.waitForResponse(isAppsList);
    await page.goto(HOME_PATH);
    await listResponse;

    // QuickAccess renders the first user-visible apps (items[0..4]) as card
    // buttons (aria-label `${name}, ${category}`). Blog is a seeded user app.
    // NOTE: the Recommended section consumes items[4..8]; with the current seed
    // (3 user-visible apps) it shows its empty state — see e2e.md (seed dep).
    await expect(
      page.getByRole("button", { name: /Blog/ }).first()
    ).toBeVisible();
  });

  test("the total-apps stat reflects the API total", async ({ page }) => {
    const listResponse = page.waitForResponse(isAppsList);
    await page.goto(HOME_PATH);
    const res = await listResponse;
    const body = await res.json();
    const total: number = body.data.meta.total;

    // StatCard exposes role="group" with aria-label `${label}: ${value}`.
    await expect(
      page.getByRole("group", { name: `Tổng ứng dụng đã dùng: ${total}` })
    ).toBeVisible();
  });

  test("renders in English at /", async ({ page }) => {
    await page.goto("/");
    await page.waitForResponse(isAppsList);
    await expect(
      page.getByRole("heading", { name: "Quick Access" })
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Recommended for You" })
    ).toBeVisible();
  });
});

// GET /api/v1/login-history/stats — stubbed so the counts are deterministic.
const STATS_RE = /\/api\/v1\/login-history\/stats(\?|$)/;

test.describe("Home dashboard — sign-in activity", () => {
  test.beforeEach(async ({ page }) => {
    await page.route(STATS_RE, (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          timestamp: new Date().toISOString(),
          path: "/api/v1/login-history/stats",
          message: "ok",
          data: { total: 7, successful: 5, failed: 2 }
        })
      })
    );
  });

  test("shows the login stat cards from the API (vi)", async ({ page }) => {
    await page.goto(HOME_PATH);
    await expect(
      page.getByRole("heading", { name: "Hoạt động đăng nhập" })
    ).toBeVisible();
    await expect(
      page.getByRole("group", { name: "Tổng lượt đăng nhập: 7" })
    ).toBeVisible();
    await expect(
      page.getByRole("group", { name: "Thành công: 5" })
    ).toBeVisible();
    await expect(
      page.getByRole("group", { name: "Thất bại: 2" })
    ).toBeVisible();
  });

  test("links through to the full login history (en)", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("group", { name: "Total Logins: 7" })
    ).toBeVisible();
    await page.getByRole("button", { name: "View login history" }).click();
    await expect(page).toHaveURL(/\/login-history$/);
  });
});
