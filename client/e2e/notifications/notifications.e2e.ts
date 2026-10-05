import { test, expect } from "@playwright/test";
import type { Page, Route } from "@playwright/test";
import {
  ANOMALY_USER_AGENTS,
  SEED_MARK_SINGLE_BODY,
  SEED_PERSIST_BODY,
  SEED_READ_BODY,
  SEED_UNREAD_BODY,
  SEED_UNREAD_N,
  apiLogin,
  fetchNotifications,
  fetchUnreadCount,
  warmUpHelperDevice,
  withApi
} from "../helpers/notifications";

// E2E for the notification panel + /notifications page after
// `notification-events` (docs/specs/notification-events/e2e.md). Runs as
// user@test.com via the global storageState (auth.setup).
//
// Notifications carry no text: the API returns `type + params + link` and the
// client renders `notifications.types.<TYPE>` in the page locale. Assertions
// therefore target rendered sentences, never stored strings.
//
// Real backend vs intercepts:
//   - Real (needs worktree BE + FE running and a fresh seed): seed rendering,
//     real category filter, vi templates, mark single, persistence, and the
//     real LOGIN_ANOMALY event.
//   - page.route intercepts: empty / error / pagination / link safety /
//     unknown type / request params — deterministic regardless of seed.
//
// Mutation safety: "mark single" consumes Seed App 12 and "persists after
// reload" consumes Seed App 14; the real-event test adds one LOGIN_ANOMALY.
// There is no mark-unread API — restore with `cd server && pnpm seed:clear`.

const LIST_RE = /\/api\/v1\/notifications(\?|$)/;
const UNREAD_COUNT_RE = /\/api\/v1\/notifications\/unread-count/;
const READ_ALL_RE = /\/api\/v1\/notifications\/read-all/;
const MARK_READ_RE = /\/api\/v1\/notifications\/[^/]+\/read(\?|$)/;

const EN = {
  all: "All",
  unread: "Unread",
  read: "Read",
  markAll: "Mark all as read",
  markRead: "Mark as read",
  loadMore: "Load more notifications",
  emptyTitle: "You're all caught up",
  empty: "No notifications here.",
  error: "Couldn't load notifications.",
  retry: "Try again",
  notMe: "Not you? Change your password",
  categoryLabel: "Filter by type",
  security: "Security",
  apps: "Apps",
  allTypes: "All types",
  announceTabChangedRead: "Showing Read notifications.",
  announceCategorySecurity: "Showing Security notifications.",
  announceLoadingMore: "Loading more notifications...",
  toastMarkReadError: "Could not mark as read.",
  bellLabel: "Notifications",
  viewAll: "View all notifications",
  anomalyTitle: "New sign-in to your account",
  adminResetTitle: "Your password was reset by an administrator",
  selfChangedTitle: "Your password was changed",
  lockedBody: "Too many wrong passwords. Sign-in was blocked for 30 minutes."
};
const VI = {
  all: "Tất cả",
  unread: "Chưa đọc",
  read: "Đã đọc",
  markAll: "Đánh dấu tất cả đã đọc",
  newApp: "Có ứng dụng mới",
  anomalyTitle: "Có lượt đăng nhập mới vào tài khoản",
  seedAppBody: `Seed App ${SEED_UNREAD_N} đã có trong launcher của bạn.`
};

const gotoNotifications = (page: Page, prefix = "") =>
  page.goto(`${prefix}/notifications`);

const markReadButtons = (page: Page) =>
  page.getByRole("button", { name: EN.markRead });

const tab = (page: Page, name: string) =>
  page.getByRole("tab", { name, exact: true });

const responseEnvelope = <T>(data: T) => ({
  timestamp: new Date().toISOString(),
  path: "/api/v1/notifications",
  message: "OK",
  data
});

interface FakeNotification {
  id: string;
  type: string;
  category: string;
  params: Record<string, string | number>;
  link: string | null;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
}

const fakeBody = (i: number) => `Intercepted app ${i} is now in your launcher.`;

const fakeItem = (
  i: number,
  over: Partial<FakeNotification> = {}
): FakeNotification => ({
  id: `fake-${i}`,
  type: "APP_AVAILABLE",
  category: "app",
  params: { appName: `Intercepted app ${i}` },
  link: `/apps?search=Intercepted%20app%20${i}`,
  isRead: false,
  readAt: null,
  createdAt: new Date(Date.now() - i * 60 * 1000).toISOString(),
  ...over
});

const fulfillList =
  (items: FakeNotification[], totalPages = items.length ? 1 : 0) =>
  (route: Route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(
        responseEnvelope({
          items,
          meta: { total: items.length, page: 1, limit: 20, totalPages }
        })
      )
    });

const fail500 = (route: Route) =>
  route.fulfill({
    status: 500,
    contentType: "application/json",
    body: JSON.stringify({
      code: "INTERNAL",
      message: "boom",
      timestamp: new Date().toISOString(),
      path: "/api/v1/notifications"
    })
  });

// ─── 1. Happy path + 8. Data rendering (real backend) ──────────────────────
test.describe("Notifications page — rendering", () => {
  test("defaults to All and renders seeded templates with relative time", async ({
    page
  }) => {
    await gotoNotifications(page);
    await expect(tab(page, EN.all)).toHaveAttribute("data-state", "active");
    await expect(
      page.getByText(SEED_UNREAD_BODY, { exact: true })
    ).toBeVisible();
    await expect(page.getByText(SEED_READ_BODY, { exact: true })).toBeVisible();
    await expect(
      page.getByText(/^(Today|Yesterday|Earlier)$/).first()
    ).toBeVisible();
    await expect(page.getByText(/\dT\d\d:\d\d/)).toHaveCount(0);
  });

  test("[DT] fills each template from its params", async ({ page }) => {
    await gotoNotifications(page);
    // LOGIN_ANOMALY reason=device: browser + os, country code → no raw "VN".
    await expect(page.getByText(EN.anomalyTitle).first()).toBeVisible();
    await expect(
      page.getByText(
        "Chrome on Windows — a device we haven't seen on your account before."
      )
    ).toBeVisible();
    // PASSWORD_CHANGED: actor=admin and actor=self pick different sentences.
    await expect(page.getByText(EN.adminResetTitle)).toBeVisible();
    await expect(page.getByText(EN.selfChangedTitle).first()).toBeVisible();
    // ACCOUNT_LOCKED interpolates the number.
    await expect(page.getByText(EN.lockedBody)).toBeVisible();
    // No raw enum or key leaked.
    await expect(page.getByText(/LOGIN_ANOMALY|types\.|actor/)).toHaveCount(0);
  });

  test("[DT] reason=both renders the country name, not the ISO code", async ({
    page
  }) => {
    await page.route(
      LIST_RE,
      fulfillList([
        fakeItem(1, {
          type: "LOGIN_ANOMALY",
          category: "security",
          params: {
            reason: "both",
            browser: "Firefox",
            os: "Linux",
            country: "JP"
          },
          link: "/login-history"
        })
      ])
    );
    await gotoNotifications(page);
    await expect(
      page.getByText(
        "Firefox on Linux, from Japan — a device and a country we haven't seen before."
      )
    ).toBeVisible();
  });

  test("unread rows carry a mark-read button, read rows do not", async ({
    page
  }) => {
    await page.route(
      LIST_RE,
      fulfillList([fakeItem(1), fakeItem(2, { isRead: true })])
    );
    await gotoNotifications(page);
    await expect(page.locator("article[data-read='false']")).toHaveCount(1);
    await expect(page.locator("article[data-read='true']")).toHaveCount(1);
    await expect(markReadButtons(page)).toHaveCount(1);
  });

  test("an unknown type falls back to its name instead of crashing", async ({
    page
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.route(
      LIST_RE,
      fulfillList([
        fakeItem(1, { type: "FUTURE_TYPE", category: "system", params: {} })
      ])
    );
    await gotoNotifications(page);
    await expect(page.getByText("FUTURE_TYPE")).toBeVisible();
    expect(errors).toEqual([]);
  });
});

// ─── 2. AuthN ──────────────────────────────────────────────────────────────
test("unauthenticated visit is gated to the login screen", async ({
  browser
}) => {
  const ctx = await browser.newContext({ storageState: undefined });
  await ctx.clearCookies();
  try {
    const freshPage = await ctx.newPage();
    await freshPage.goto("/notifications");
    await expect(
      freshPage.getByRole("button", { name: /continue with email/i })
    ).toBeVisible({ timeout: 20_000 });
    await expect(freshPage.getByRole("tab", { name: EN.all })).toHaveCount(0);
  } finally {
    await ctx.close();
  }
});

// ─── 4. Validation ─────────────────────────────────────────────────────────
test.describe("Notifications — validation", () => {
  test("[EP] the API rejects an unknown category with 400", async () => {
    await withApi(async (ctx) => {
      const token = await apiLogin(ctx);
      const res = await ctx.get("/api/v1/notifications?category=bogus", {
        headers: { Authorization: `Bearer ${token}` }
      });
      expect(res.status()).toBe(400);
    });
  });

  for (const [label, link] of [
    ["absolute URL", "https://evil.example/phish"],
    ["protocol-relative", "//evil.example"],
    ["backslash", "/\\evil.example"]
  ] as const) {
    test(`[EP] a ${label} link renders no anchor`, async ({ page }) => {
      await page.route(LIST_RE, fulfillList([fakeItem(1, { link })]));
      await gotoNotifications(page);
      const article = page.locator("article").first();
      await expect(article.getByText(fakeBody(1))).toBeVisible();
      await expect(article.locator("a")).toHaveCount(0);
    });
  }

  test("[EP] an internal link renders an anchor to that path", async ({
    page
  }) => {
    await page.route(LIST_RE, fulfillList([fakeItem(1)]));
    await gotoNotifications(page);
    await expect(
      page.locator("article a").filter({ hasText: fakeBody(1) })
    ).toHaveAttribute("href", "/apps?search=Intercepted%20app%201");
  });
});

// ─── 5. Empty states ───────────────────────────────────────────────────────
test.describe("Notifications — empty", () => {
  test("empty list renders the empty state", async ({ page }) => {
    await page.route(LIST_RE, fulfillList([]));
    await gotoNotifications(page);
    await expect(page.getByText(EN.emptyTitle)).toBeVisible();
    await expect(page.getByText(EN.empty)).toBeVisible();
  });

  test("Read tab shows its own empty state", async ({ page }) => {
    await page.route(LIST_RE, (route) => {
      const isRead = new URL(route.request().url()).searchParams.get("isRead");
      return fulfillList(isRead === "true" ? [] : [fakeItem(1)])(route);
    });
    await gotoNotifications(page);
    await tab(page, EN.read).click();
    await expect(tab(page, EN.read)).toHaveAttribute("data-state", "active");
    await expect(page.getByText(EN.empty)).toBeVisible();
  });
});

// ─── 6. Boundary / pagination ──────────────────────────────────────────────
test.describe("Notifications — pagination", () => {
  test("[BVA] load more appends page 2 and disappears on the last page", async ({
    page
  }) => {
    const page1 = Array.from({ length: 20 }, (_, i) => fakeItem(i + 1));
    const page2 = Array.from({ length: 5 }, (_, i) => fakeItem(i + 21));
    await page.route(LIST_RE, (route) => {
      const isPage2 =
        new URL(route.request().url()).searchParams.get("page") === "2";
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(
          responseEnvelope({
            items: isPage2 ? page2 : page1,
            meta: { total: 25, page: isPage2 ? 2 : 1, limit: 20, totalPages: 2 }
          })
        )
      });
    });
    await gotoNotifications(page);
    const loadMore = page.getByRole("button", { name: EN.loadMore });
    await expect(page.getByText(fakeBody(21))).toHaveCount(0);
    await loadMore.click();
    await expect(page.getByText(fakeBody(21))).toBeVisible();
    await expect(loadMore).toHaveCount(0);
    await expect(page.locator("#announcer")).toHaveText(EN.announceLoadingMore);
  });

  test("[BVA] exactly one full page shows no load more", async ({ page }) => {
    await page.route(
      LIST_RE,
      fulfillList(Array.from({ length: 20 }, (_, i) => fakeItem(i + 1)))
    );
    await gotoNotifications(page);
    await expect(page.getByText(fakeBody(20))).toBeVisible();
    await expect(page.getByRole("button", { name: EN.loadMore })).toHaveCount(
      0
    );
  });
});

// ─── 7. Filters ────────────────────────────────────────────────────────────
test.describe("Notifications — filters", () => {
  test("[DT] status tab × category chip combine into one request", async ({
    page
  }) => {
    const seen: URLSearchParams[] = [];
    await page.route(LIST_RE, (route) => {
      seen.push(new URL(route.request().url()).searchParams);
      return fulfillList([fakeItem(1)])(route);
    });
    await gotoNotifications(page);
    await expect.poll(() => seen.length).toBeGreaterThan(0);
    expect(seen[0].has("isRead")).toBe(false);
    expect(seen[0].has("category")).toBe(false);

    await tab(page, EN.unread).click();
    await page
      .getByRole("group", { name: EN.categoryLabel })
      .getByRole("button", { name: EN.security })
      .click();
    await expect
      .poll(() =>
        seen.some(
          (p) => p.get("isRead") === "false" && p.get("category") === "security"
        )
      )
      .toBe(true);
    await expect(
      page.getByRole("button", { name: EN.security, pressed: true })
    ).toBeVisible();
    await expect(page.locator("#announcer")).toHaveText(
      EN.announceCategorySecurity
    );
  });

  test("[EP] the Security chip shows only security notifications (real)", async ({
    page
  }) => {
    await gotoNotifications(page);
    await page.getByRole("button", { name: EN.security }).click();
    await expect(page.getByText(EN.anomalyTitle).first()).toBeVisible();
    await expect(page.getByText(SEED_UNREAD_BODY)).toHaveCount(0);
    await page.getByRole("button", { name: EN.apps }).click();
    await expect(page.getByText(SEED_UNREAD_BODY)).toBeVisible();
    await expect(page.getByText(EN.anomalyTitle)).toHaveCount(0);
  });

  test("Read tab keeps read rows and drops unread ones (real)", async ({
    page
  }) => {
    await gotoNotifications(page);
    await tab(page, EN.read).click();
    await expect(page.getByText(SEED_READ_BODY)).toBeVisible();
    await expect(page.getByText(SEED_UNREAD_BODY)).toHaveCount(0);
    await expect(page.locator("#announcer")).toHaveText(
      EN.announceTabChangedRead
    );
  });
});

// ─── 9. i18n ───────────────────────────────────────────────────────────────
test.describe("Notifications — i18n", () => {
  test("vi renders tabs and templates in Vietnamese", async ({ page }) => {
    await gotoNotifications(page, "/vi");
    await expect(tab(page, VI.all)).toBeVisible();
    await expect(tab(page, VI.unread)).toBeVisible();
    await expect(tab(page, VI.read)).toBeVisible();
    await expect(page.getByRole("button", { name: VI.markAll })).toBeVisible();
    await expect(page.getByText(VI.seedAppBody)).toBeVisible();
    await expect(page.getByText(VI.anomalyTitle).first()).toBeVisible();
    await expect(page.getByText(/trước/).first()).toBeVisible();
    await expect(page.getByText(/\bago\b|is now in your launcher/)).toHaveCount(
      0
    );
  });

  test("vi names the country in Vietnamese", async ({ page }) => {
    await page.route(
      LIST_RE,
      fulfillList([
        fakeItem(1, {
          type: "LOGIN_ANOMALY",
          category: "security",
          params: { reason: "country", browser: "", os: "", country: "VN" }
        })
      ])
    );
    await gotoNotifications(page, "/vi");
    await expect(page.getByText(/Việt Nam/)).toBeVisible();
  });
});

// ─── 10. Error / loading ───────────────────────────────────────────────────
test.describe("Notifications — errors", () => {
  test("a failing list shows the error state and Try again refetches", async ({
    page
  }) => {
    let fail = true;
    await page.route(LIST_RE, (route) =>
      fail ? fail500(route) : fulfillList([fakeItem(1)])(route)
    );
    await gotoNotifications(page);
    await expect(page.getByText(EN.error)).toBeVisible({ timeout: 20_000 });
    fail = false;
    await page.getByRole("button", { name: EN.retry }).click();
    await expect(page.getByText(fakeBody(1))).toBeVisible();
  });

  test("mark-read failure shows its own toast and keeps the row unread", async ({
    page
  }) => {
    await page.route(LIST_RE, fulfillList([fakeItem(301)]));
    await page.route(MARK_READ_RE, fail500);
    await gotoNotifications(page);
    await markReadButtons(page).first().click();
    await expect(page.getByText(EN.toastMarkReadError)).toBeVisible();
    await expect(
      page.getByText("Server error. Please try again later.")
    ).toHaveCount(0);
    await expect(markReadButtons(page)).toHaveCount(1);
  });
});

// ─── 11. Mutations (A only) ────────────────────────────────────────────────
test.describe.serial("Notifications — mutations", () => {
  test.beforeAll(async () => {
    await warmUpHelperDevice();
  });

  test("[ST] mark single moves the row out of Unread and drops the count by one", async ({
    page
  }) => {
    const before = await fetchUnreadCount();
    await gotoNotifications(page);
    await tab(page, EN.unread).click();
    const row = page
      .locator("article")
      .filter({ hasText: SEED_MARK_SINGLE_BODY });
    await row.getByRole("button", { name: EN.markRead }).click();
    await expect
      .poll(() => fetchUnreadCount(), { timeout: 15_000 })
      .toBe(before - 1);
    await expect(page.getByText(SEED_MARK_SINGLE_BODY)).toHaveCount(0);
  });

  test("[ST] a marked row stays read after reload", async ({ page }) => {
    await gotoNotifications(page);
    const row = page.locator("article").filter({ hasText: SEED_PERSIST_BODY });
    await row.getByRole("button", { name: EN.markRead }).click();
    await expect(row).toHaveAttribute("data-read", "true", { timeout: 15_000 });
    await page.reload();
    await tab(page, EN.unread).click();
    await expect(page.getByText(SEED_PERSIST_BODY)).toHaveCount(0);
    await tab(page, EN.read).click();
    await expect(page.getByText(SEED_PERSIST_BODY)).toBeVisible();
  });

  test("[ST] opening a row marks it read and follows its link", async ({
    page
  }) => {
    let patched = false;
    await page.route(LIST_RE, fulfillList([fakeItem(7)]));
    await page.route(MARK_READ_RE, (route) => {
      patched = true;
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(responseEnvelope(fakeItem(7, { isRead: true })))
      });
    });
    await gotoNotifications(page);
    await page.getByText(fakeBody(7)).click();
    await expect(page).toHaveURL(
      /\/apps\?search=Intercepted(\+|%20)app(\+|%20)7/
    );
    expect(patched).toBe(true);
  });

  test("[ST] opening an already read row does not PATCH again", async ({
    page
  }) => {
    let patches = 0;
    await page.route(LIST_RE, fulfillList([fakeItem(8, { isRead: true })]));
    await page.route(MARK_READ_RE, (route) => {
      patches += 1;
      return route.abort();
    });
    await gotoNotifications(page);
    await page.getByText(fakeBody(8)).click();
    await expect(page).toHaveURL(/\/apps\?search=/);
    expect(patches).toBe(0);
  });

  test("'Not you?' on an unusual sign-in leads to the password form", async ({
    page
  }) => {
    await page.route(
      LIST_RE,
      fulfillList([
        fakeItem(9, {
          type: "LOGIN_ANOMALY",
          category: "security",
          params: {
            reason: "device",
            browser: "Chrome",
            os: "Linux",
            country: "VN"
          },
          link: "/login-history"
        })
      ])
    );
    await page.route(MARK_READ_RE, (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(responseEnvelope(fakeItem(9, { isRead: true })))
      })
    );
    await gotoNotifications(page);
    await page.getByRole("link", { name: EN.notMe }).click();
    await expect(page).toHaveURL(/\/profile$/);
  });

  test("mark all empties Unread (intercepted, seed untouched)", async ({
    page
  }) => {
    let markedAll = false;
    await page.route(LIST_RE, (route) =>
      fulfillList(markedAll ? [] : [fakeItem(101), fakeItem(102)])(route)
    );
    await page.route(UNREAD_COUNT_RE, (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(responseEnvelope({ count: markedAll ? 0 : 2 }))
      })
    );
    await page.route(READ_ALL_RE, (route) => {
      markedAll = true;
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(responseEnvelope({ updated: 2 }))
      });
    });
    await gotoNotifications(page);
    await expect(page.getByText(fakeBody(101))).toBeVisible();
    await page.getByRole("button", { name: EN.markAll }).click();
    await expect(page.getByText(EN.empty)).toBeVisible();
    const bell = page.getByRole("button", { name: EN.bellLabel });
    await expect(bell.getByText(/^-?\d+$/)).toHaveCount(0);
  });

  test("[Error Guessing] double-clicking mark-read sends one PATCH", async ({
    page
  }) => {
    let patchCount = 0;
    await page.route(LIST_RE, fulfillList([fakeItem(401)]));
    await page.route(MARK_READ_RE, async (route) => {
      patchCount += 1;
      await new Promise((resolve) => setTimeout(resolve, 600));
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(responseEnvelope(fakeItem(401, { isRead: true })))
      });
    });
    await gotoNotifications(page);
    const button = markReadButtons(page).first();
    await button.click();
    await expect(button).toBeDisabled();
    await button.dispatchEvent("click");
    await expect.poll(() => patchCount, { timeout: 400 }).toBe(1);
    await page.waitForTimeout(700);
    expect(patchCount).toBe(1);
  });

  test("[ST] a sign-in from an unseen device produces a real notification", async ({
    page
  }) => {
    const anomalies = async () =>
      (await fetchNotifications("?category=security&limit=50")).filter(
        (n) => n.type === "LOGIN_ANOMALY"
      ).length;
    const before = await anomalies();

    let produced: string | null = null;
    for (const candidate of ANOMALY_USER_AGENTS) {
      await withApi((ctx) => apiLogin(ctx, candidate.ua));
      await page.waitForTimeout(1_500);
      if ((await anomalies()) > before) {
        produced = candidate.browser;
        break;
      }
    }
    expect(produced, "every candidate device was already known").not.toBeNull();

    const newest = (await fetchNotifications("?category=security&limit=1"))[0];
    expect(newest.type).toBe("LOGIN_ANOMALY");
    expect(newest.params.browser).toBe(produced);

    await gotoNotifications(page);
    await expect(
      page.getByText(new RegExp(`^${produced} on `)).first()
    ).toBeVisible();
  });
});

// ─── 13. Header panel ──────────────────────────────────────────────────────
test.describe("Notifications — header panel", () => {
  test("[BVA] the panel asks for 8 items and lists them with a badge", async ({
    page
  }) => {
    const limits: string[] = [];
    await page.route(UNREAD_COUNT_RE, (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(responseEnvelope({ count: 3 }))
      })
    );
    await page.route(LIST_RE, (route) => {
      limits.push(
        new URL(route.request().url()).searchParams.get("limit") ?? ""
      );
      return fulfillList([fakeItem(201), fakeItem(202)])(route);
    });
    await page.goto("/");
    const bell = page.getByRole("button", { name: EN.bellLabel });
    await expect(bell.getByText("3", { exact: true })).toBeVisible();
    await bell.click();
    const panel = page.getByRole("dialog");
    await expect(panel.getByText(fakeBody(201))).toBeVisible();
    await expect(panel.getByRole("button", { name: EN.markAll })).toBeVisible();
    expect(limits).toContain("8");
  });

  test("the badge is hidden at zero and the panel shows its empty state", async ({
    page
  }) => {
    await page.route(UNREAD_COUNT_RE, (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(responseEnvelope({ count: 0 }))
      })
    );
    await page.route(LIST_RE, fulfillList([]));
    await page.goto("/");
    const bell = page.getByRole("button", { name: EN.bellLabel });
    await expect(bell.getByText(/^\d+$/)).toHaveCount(0);
    await bell.click();
    await expect(
      page.getByRole("dialog").getByText(EN.emptyTitle)
    ).toBeVisible();
  });

  test("the panel shows the error state when the list fails", async ({
    page
  }) => {
    await page.route(LIST_RE, fail500);
    await page.goto("/");
    await page.getByRole("button", { name: EN.bellLabel }).click();
    await expect(page.getByRole("dialog").getByText(EN.error)).toBeVisible({
      timeout: 20_000
    });
  });

  test("opening an item in the panel closes it and navigates", async ({
    page
  }) => {
    await page.route(LIST_RE, fulfillList([fakeItem(203, { isRead: true })]));
    await page.goto("/");
    await page.getByRole("button", { name: EN.bellLabel }).click();
    await page.getByRole("dialog").getByText(fakeBody(203)).click();
    await expect(page).toHaveURL(/\/apps\?search=/);
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });

  test("View all goes to the notifications page", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: EN.bellLabel }).click();
    await page.getByRole("button", { name: EN.viewAll }).click();
    await expect(page).toHaveURL(/\/notifications$/);
  });
});

// ─── 12. Accessibility ─────────────────────────────────────────────────────
test.describe("Notifications — accessibility", () => {
  for (const key of ["Enter", "Space"] as const) {
    test(`pressing ${key} on a focused mark-read button fires the mutation`, async ({
      page
    }) => {
      let patchFired = false;
      await page.route(LIST_RE, fulfillList([fakeItem(501)]));
      await page.route(MARK_READ_RE, (route) => {
        patchFired = true;
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(
            responseEnvelope(fakeItem(501, { isRead: true }))
          )
        });
      });
      await gotoNotifications(page);
      const button = markReadButtons(page).first();
      await button.focus();
      await expect(button).toBeFocused();
      await page.keyboard.press(key);
      await expect.poll(() => patchFired, { timeout: 5_000 }).toBe(true);
    });
  }

  test("each row is an article named by its title, its link is focusable", async ({
    page
  }) => {
    await page.route(LIST_RE, fulfillList([fakeItem(601)]));
    await gotoNotifications(page);
    await expect(
      page.getByRole("article", { name: "New app available" })
    ).toBeVisible();
    const link = page.locator("article a").first();
    await link.focus();
    await expect(link).toBeFocused();
  });

  test("category chips expose their pressed state", async ({ page }) => {
    await page.route(LIST_RE, fulfillList([fakeItem(1)]));
    await gotoNotifications(page);
    const group = page.getByRole("group", { name: EN.categoryLabel });
    await expect(
      group.getByRole("button", { name: EN.allTypes, pressed: true })
    ).toBeVisible();
    await expect(
      group.getByRole("button", { name: EN.security, pressed: false })
    ).toBeVisible();
  });
});
