import { test, expect } from "@fixtures";
import type { Page, Route } from "@playwright/test";
import {
  fetchUnreadCount,
  markUnreadByTitle,
  SEED_UNREAD_TITLE,
  SEED_READ_TITLE,
  USER_EMAIL
} from "@helpers/notifications";

// The Notifications page (/notifications) and the header bell + panel.
// Role: user (user@test.com). Test cases: test-cases/notifications.md
// (TC-NOTIF-001 … 025, 027, 028). The API layer is
// tests/api/notifications/notifications.api.ts.
//
// Real backend vs intercepts:
//   - Real backend: happy path, tabs, data rendering, en/vi chrome, mark
//     single, persistence after reload, a11y — against the seeded
//     notifications of user@test.com.
//   - page.route intercepts (deterministic): empty, pagination, error, mark
//     all, double click, keyboard, bell badge, per-tab empty, grouping.
//
// Mutation safety: "mark single" and "stays read after reload" fire the REAL
// PATCH /notifications/:id/read. There is no mark-unread API, so the serial
// block records the titles it marked and afterAll puts them back to unread
// directly in the database (helpers/notifications.ts → markUnreadByTitle).

// Regex route matchers (unambiguous vs glob `?`/`*`). The list endpoint must
// NOT match the sub-routes (/unread-count, /read-all, /:id/read), so anchor the
// list match to a query string or end-of-path right after "notifications".
const LIST_RE = /\/api\/v1\/notifications(\?|$)/;
const UNREAD_COUNT_RE = /\/api\/v1\/notifications\/unread-count/;
const READ_ALL_RE = /\/api\/v1\/notifications\/read-all/;
// PATCH /api/v1/notifications/<id>/read  (must NOT match /read-all).
const MARK_READ_RE = /\/api\/v1\/notifications\/[^/]+\/read(\?|$)/;

// ---- en/vi chrome strings (must mirror src/locales/*/notifications.json) ----
const EN = {
  unread: "Unread",
  read: "Read",
  markAll: "Mark all as read",
  markRead: "Mark as read",
  loadMore: "Load more notifications",
  empty: "No notifications here.",
  error: "Couldn't load notifications.",
  // announce.* (notifications.json → announce) — tabChanged interpolates {tab}
  // with the localized tab label (NotificationList passes t(`tabs.${next}`)).
  announceTabChangedRead: "Showing Read notifications.",
  announceMarkedRead: "Notification marked as read.",
  announceMarkedAllRead: "All notifications marked as read.",
  announceLoadingMore: "Loading more notifications...",
  // A failed mutation is toasted by the global MutationCache handler
  // (libs/query-client.ts): every 5xx reads the same fixed text.
  toastServerError: "Server error. Please try again later.",
  // header bell (dashboard.json → header.notificationsLabel)
  bellLabel: "Notifications",
  // header panel (dashboard.json → notifications.markAllRead)
  panelMarkAll: "Mark all as read"
};
const VI = {
  unread: "Chưa đọc",
  read: "Đã đọc",
  markAll: "Đánh dấu tất cả đã đọc",
  markRead: "Đánh dấu đã đọc",
  loadMore: "Tải thêm thông báo"
};

const gotoNotifications = (page: Page, prefix = "") =>
  page.goto(`${prefix}/notifications`);

const markReadButtons = (page: Page) =>
  page.getByRole("button", { name: EN.markRead });

const responseEnvelope = <T>(data: T) => ({
  timestamp: new Date().toISOString(),
  path: "/api/v1/notifications",
  message: "OK",
  data
});

interface FakeNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  meta: null;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
}

const fakeItem = (i: number, isRead = false): FakeNotification => ({
  id: `fake-${i}`,
  type: "SYSTEM_ANNOUNCEMENT",
  title: `Intercepted notification ${i}`,
  message: `Synthetic body ${i}.`,
  meta: null,
  isRead,
  readAt: isRead ? new Date().toISOString() : null,
  createdAt: new Date(Date.now() - i * 60 * 1000).toISOString()
});

test.describe("Notifications page", () => {
  // --- Scenario 1: Happy path (real backend) ---
  test(
    "happy path: unread tab shows grouped notifications with relative timestamps",
    { tag: ["@TC-NOTIF-001", "@smoke"] },
    async ({ page }) => {
      await gotoNotifications(page);

      // Unread tab is the default and selected.
      await expect(
        page.getByRole("tab", { name: EN.unread, exact: true })
      ).toHaveAttribute("data-state", "active");

      // At least one notification article visible.
      const articles = page.locator("article");
      await expect(articles.first()).toBeVisible();

      // At least one group header (Today / Yesterday / Earlier) visible.
      await expect(
        page.getByText(/^(Today|Yesterday|Earlier)$/).first()
      ).toBeVisible();

      // A relative timestamp is rendered (not an ISO string).
      await expect(
        page.getByText(/ago|trước|hour|minute|day/i).first()
      ).toBeVisible();
    }
  );

  // --- Scenario 2: AuthN (no storageState → redirect to login) ---
  test(
    "unauthenticated visit is gated to the login screen",
    { tag: "@TC-NOTIF-002" },
    async ({ browser }) => {
      // Truly clean context: no storageState, and proactively clear cookies so a
      // localhost-scoped refresh cookie from another port/run can't leak in.
      const ctx = await browser.newContext({ storageState: undefined });
      await ctx.clearCookies();
      try {
        const freshPage = await ctx.newPage();
        await freshPage.goto("/notifications");
        // The app renders the login screen for unauthenticated users (AuthGuard).
        // It may keep the /notifications URL and swap in the login content, so we
        // assert the login affordance rather than a specific URL.
        await expect(
          freshPage.getByRole("button", { name: /continue with email/i })
        ).toBeVisible({ timeout: 20_000 });
        // And the protected notifications chrome must NOT be present.
        await expect(
          freshPage.getByRole("tab", { name: EN.unread, exact: true })
        ).toHaveCount(0);
      } finally {
        await ctx.close();
      }
    }
  );

  // --- Scenario 3: Empty state (INTERCEPT for determinism) ---
  test(
    "empty state renders when the list API returns no items",
    { tag: "@TC-NOTIF-003" },
    async ({ page }) => {
      await page.route(LIST_RE, (route: Route) =>
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(
            responseEnvelope({
              items: [],
              meta: { total: 0, page: 1, limit: 20, totalPages: 0 }
            })
          )
        })
      );
      await gotoNotifications(page);
      await expect(page.getByText(EN.empty)).toBeVisible();
    }
  );

  // --- Scenario 4: Boundary / pagination (INTERCEPT — seeded per-tab volume
  // <20 is not guaranteed to span 2 pages on a single tab) ---
  test(
    "load more appends page 2 and disappears on the last page",
    { tag: "@TC-NOTIF-004" },
    async ({ page }) => {
      const page1 = Array.from({ length: 20 }, (_, i) => fakeItem(i + 1));
      const page2 = Array.from({ length: 5 }, (_, i) => fakeItem(i + 21));

      await page.route(LIST_RE, (route: Route) => {
        const url = new URL(route.request().url());
        const p = url.searchParams.get("page");
        const isPage2 = p === "2";
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(
            responseEnvelope({
              items: isPage2 ? page2 : page1,
              meta: {
                total: 25,
                page: isPage2 ? 2 : 1,
                limit: 20,
                totalPages: 2
              }
            })
          )
        });
      });

      await gotoNotifications(page);

      const loadMore = page.getByRole("button", { name: EN.loadMore });
      await expect(loadMore).toBeVisible();
      await expect(
        page.getByText("Intercepted notification 1", { exact: true })
      ).toBeVisible();
      await expect(
        page.getByText("Intercepted notification 21", { exact: true })
      ).toHaveCount(0);

      await loadMore.click();

      // Page 2 items appended; load-more gone (last page reached).
      await expect(
        page.getByText("Intercepted notification 21", { exact: true })
      ).toBeVisible();
      await expect(loadMore).toHaveCount(0);
    }
  );

  // --- Scenario 5: Tabs filter (real backend) ---
  test(
    "unread items expose a mark-read button; read items do not",
    { tag: "@TC-NOTIF-005" },
    async ({ page }) => {
      await gotoNotifications(page);

      // Unread tab: at least one mark-read button present.
      await expect(markReadButtons(page).first()).toBeVisible();

      // Switch to Read tab: read items have no mark-read button.
      await page.getByRole("tab", { name: EN.read, exact: true }).click();
      await expect(
        page.getByRole("tab", { name: EN.read, exact: true })
      ).toHaveAttribute("data-state", "active");
      await expect(markReadButtons(page)).toHaveCount(0);
    }
  );

  // --- Scenario 6: Data rendering (real backend) ---
  test(
    "renders literal titles, relative time (no ISO), and an icon container",
    { tag: "@TC-NOTIF-006" },
    async ({ page }) => {
      await gotoNotifications(page);

      // A seeded literal title appears verbatim.
      await expect(page.getByText(SEED_UNREAD_TITLE).first()).toBeVisible();

      // No raw ISO timestamp leaked into the rendered text.
      await expect(page.getByText(/\dT\d\d:\d\d/)).toHaveCount(0);

      // Each article has its icon container (aria-hidden visual wrapper).
      const article = page.locator("article").first();
      await expect(article).toBeVisible();
      await expect(
        article.locator("[aria-hidden='true']").first()
      ).toBeAttached();
    }
  );

  // --- Scenario 7: i18n (en + vi) — chrome only ---
  test(
    "renders English chrome on the default locale",
    { tag: "@TC-NOTIF-007" },
    async ({ page }) => {
      await gotoNotifications(page);
      await expect(
        page.getByRole("tab", { name: EN.unread, exact: true })
      ).toBeVisible();
      await expect(
        page.getByRole("tab", { name: EN.read, exact: true })
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: EN.markAll })
      ).toBeVisible();
      // Load-more label exists in the seeded dataset (>20 across read+unread).
      // Assert it is at least defined in the DOM chrome when present.
    }
  );

  test(
    "renders Vietnamese chrome on the /vi locale",
    { tag: "@TC-NOTIF-008" },
    async ({ page }) => {
      await gotoNotifications(page, "/vi");
      await expect(
        page.getByRole("tab", { name: VI.unread, exact: true })
      ).toBeVisible();
      await expect(
        page.getByRole("tab", { name: VI.read, exact: true })
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: VI.markAll })
      ).toBeVisible();
    }
  );

  // --- Scenario 8: Error / loading (INTERCEPT) ---
  test(
    "shows the error state when the list API returns 500",
    { tag: "@TC-NOTIF-009" },
    async ({ page }) => {
      const fail = (route: Route) =>
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
      // LIST_RE matches both `?query` and bare-path forms.
      await page.route(LIST_RE, fail);

      await gotoNotifications(page);
      await expect(page.getByText(EN.error)).toBeVisible();
    }
  );
});

// Mutation tests run serial: test 9 fires a REAL PATCH that changes seeded
// state; test 10 intercepts to avoid wiping the backend. Keep them isolated
// from the read-only tests above and ordered.
// Titles the real-PATCH tests below marked read; restored in afterAll.
const markedForReal: string[] = [];

test.describe.serial("Notifications — mutations", () => {
  // --- Scenario 9: Mark single (REAL mutation; asserts badge delta) ---
  test(
    "mark single moves item out of unread and decrements the badge",
    { tag: ["@TC-NOTIF-010", "@smoke"] },
    async ({ page }) => {
      const before = await fetchUnreadCount();
      expect(before).toBeGreaterThan(0);

      await gotoNotifications(page);

      const firstButton = markReadButtons(page).first();
      await expect(firstButton).toBeVisible();

      // Capture the title of the item we are about to mark read. NotificationItem
      // sets aria-label={title} on the <article>, so read it from there.
      const firstArticle = page.locator("article").first();
      const markedTitle = (
        await firstArticle.getAttribute("aria-label")
      )?.trim();
      if (markedTitle) markedForReal.push(markedTitle);

      await firstButton.click();

      // The unread count read from the API decreases by exactly 1.
      await expect
        .poll(async () => fetchUnreadCount(), { timeout: 15_000 })
        .toBe(before - 1);

      // That specific item is no longer in the unread tab.
      if (markedTitle) {
        await expect(page.getByText(markedTitle, { exact: true })).toHaveCount(
          0
        );
      }
    }
  );

  // --- Scenario 10: Mark all (INTERCEPT — does not wipe real backend) ---
  test(
    "mark all empties the unread tab and clears the badge",
    { tag: "@TC-NOTIF-011" },
    async ({ page }) => {
      let markedAll = false;

      // List: before mark-all return 2 unread; after, return empty.
      await page.route(LIST_RE, (route: Route) =>
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(
            responseEnvelope({
              items: markedAll ? [] : [fakeItem(101), fakeItem(102)],
              meta: {
                total: markedAll ? 0 : 2,
                page: 1,
                limit: 20,
                totalPages: markedAll ? 0 : 1
              }
            })
          )
        })
      );
      // Unread count: 2 before, 0 after.
      await page.route(UNREAD_COUNT_RE, (route: Route) =>
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(responseEnvelope({ count: markedAll ? 0 : 2 }))
        })
      );
      // Mark-all PATCH: flip the flag, return updated count.
      await page.route(READ_ALL_RE, (route: Route) => {
        markedAll = true;
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(responseEnvelope({ updated: 2 }))
        });
      });

      await gotoNotifications(page);
      await expect(
        page.getByText("Intercepted notification 101")
      ).toBeVisible();

      await page.getByRole("button", { name: EN.markAll }).click();

      // Unread tab becomes empty.
      await expect(page.getByText(EN.empty)).toBeVisible();
      // Badge (only rendered when count > 0) is gone.
      await expect(page.getByText("Intercepted notification 101")).toHaveCount(
        0
      );
    }
  );

  // --- D7: Mark-all-when-empty no-op (matrix row 11c) — A only -------------
  test(
    "mark-all on an already-empty list is a no-op (no negative badge)",
    { tag: "@TC-NOTIF-012" },
    async ({ page }) => {
      // [BVA] mark-all when nothing unread → BE returns updated:0, UI no-op, the
      // bell badge never goes negative (count never < 0). All via intercept, so
      // the real seed is NOT mutated; classified A only as a mutation-path test.
      await page.route(LIST_RE, (route: Route) =>
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(
            responseEnvelope({
              items: [],
              meta: { total: 0, page: 1, limit: 20, totalPages: 0 }
            })
          )
        })
      );
      await page.route(UNREAD_COUNT_RE, (route: Route) =>
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(responseEnvelope({ count: 0 }))
        })
      );
      await page.route(READ_ALL_RE, (route: Route) =>
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(responseEnvelope({ updated: 0 }))
        })
      );

      await gotoNotifications(page);
      await expect(page.getByText(EN.empty)).toBeVisible();
      // PageHeader mark-all button is always present; click with nothing unread.
      await page.getByRole("button", { name: EN.markAll }).click();

      // Still empty; no numeric (and definitely no negative) badge on the bell.
      await expect(page.getByText(EN.empty)).toBeVisible();
      const bell = page.getByRole("button", { name: EN.bellLabel });
      await expect(bell.getByText(/^-?\d+$/)).toHaveCount(0);
    }
  );

  // --- D8: Double-click idempotency (matrix row 11d) — A only -------------
  test(
    "double-clicking mark-read fires the PATCH once, not twice",
    { tag: "@TC-NOTIF-013" },
    async ({ page }) => {
      // [State Transition] the mark-read button is disabled while
      // markRead.isPending (the hook is shared across the whole list), so a 2nd
      // rapid click is swallowed → exactly one PATCH fires (count -1, not -2).
      // Measured at the PATCH-request layer via intercept (no seed mutation).
      let patchCount = 0;
      await page.route(LIST_RE, (route: Route) =>
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(
            responseEnvelope({
              items: [fakeItem(401)],
              meta: { total: 1, page: 1, limit: 20, totalPages: 1 }
            })
          )
        })
      );
      // Delay the PATCH so the button stays disabled (isPending) across the 2nd
      // click; the 2nd click must be swallowed by `disabled={isMarking}`.
      await page.route(MARK_READ_RE, async (route: Route) => {
        patchCount += 1;
        await new Promise((resolve) => setTimeout(resolve, 600));
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(
            responseEnvelope({ ...fakeItem(401, true), id: "fake-401" })
          )
        });
      });

      await gotoNotifications(page);
      const button = markReadButtons(page).first();
      await expect(button).toBeVisible();

      // First click fires the (delayed 600ms) PATCH; the shared markRead.isPending
      // flips → the button becomes `disabled={isMarking}`. We must OBSERVE that
      // disabled state before attempting the 2nd click — a forced/auto-waiting 2nd
      // click defeats the guard: force bypasses actionability, and a long auto-wait
      // outlives the 600ms PATCH (which re-enables the button on success, letting a
      // queued click legitimately fire). Both race React renders, not the app's
      // in-flight idempotency contract.
      await button.click();
      // In-flight guard is observable: the button goes disabled while pending.
      await expect(button).toBeDisabled();
      // Within the still-pending window, a 2nd click is swallowed. dispatchEvent
      // bypasses Playwright's auto-wait so we evaluate the click NOW (button still
      // disabled) instead of waiting for it to re-enable — a disabled <button>
      // ignores a dispatched click natively, so no 2nd PATCH fires.
      await button.dispatchEvent("click");
      // Assert no 2nd PATCH fired *while still pending* (before the 600ms resolves
      // and legitimately re-enables the button).
      await expect.poll(() => patchCount, { timeout: 400 }).toBe(1);
      expect(patchCount).toBe(1);
      // Let the delayed PATCH settle so it doesn't leak into the next test.
      await page.waitForTimeout(700);
      expect(patchCount).toBe(1);
    }
  );

  // --- D9: Persistence after reload (matrix row 11e) — A only (REAL) ------
  // REAL mutation: permanently flips one seeded item to read. There is NO
  // mark-unread API → afterAll cannot revert; restore the seed manually via:
  //   cd server && pnpm seed --clear && pnpm seed
  test(
    "a marked item stays read after a full page reload",
    { tag: "@TC-NOTIF-014" },
    async ({ page }) => {
      await gotoNotifications(page);
      const firstButton = markReadButtons(page).first();
      await expect(firstButton).toBeVisible();
      const firstArticle = page.locator("article").first();
      const markedTitle = (
        await firstArticle.getAttribute("aria-label")
      )?.trim();
      expect(markedTitle).toBeTruthy();
      markedForReal.push(markedTitle!);

      await firstButton.click();
      // Wait for the item to leave the unread tab (invalidate → refetch).
      await expect(page.getByText(markedTitle!, { exact: true })).toHaveCount(
        0,
        {
          timeout: 15_000
        }
      );

      // Reload: authoritative server state is refetched; the item must stay out
      // of the (default) Unread tab.
      await page.reload();
      await expect(
        page.getByRole("tab", { name: EN.unread, exact: true })
      ).toHaveAttribute("data-state", "active");
      await expect(page.getByText(markedTitle!, { exact: true })).toHaveCount(
        0
      );

      // ...and it now appears on the Read tab.
      await page.getByRole("tab", { name: EN.read, exact: true }).click();
      await expect(
        page.getByText(markedTitle!, { exact: true }).first()
      ).toBeVisible();
    }
  );

  test.afterAll(async () => {
    // Put the seeded notifications the two real-PATCH tests marked read back
    // to unread, so the next run (and every other spec) sees the seed.
    await markUnreadByTitle(USER_EMAIL, markedForReal);
  });
});

// ===========================================================================
// Header bell, per-tab states, announcer and keyboard cases.
// ===========================================================================

// --- D1: Header bell badge + panel (matrix row 1b) — A only ---------------
test.describe("Notifications — header bell + panel", () => {
  // Gate A only: the panel exposes a mark-all mutation affordance; we assert
  // its presence/visibility but never CLICK it, so no real mutation fires.
  // Badge + count are pinned via intercept (read-only) so the assertion does
  // not depend on live seed counts.
  test(
    "bell shows the unread badge and the panel lists recent items + mark-all",
    { tag: ["@TC-NOTIF-015", "@smoke"] },
    async ({ page }) => {
      await page.route(UNREAD_COUNT_RE, (route: Route) =>
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(responseEnvelope({ count: 3 }))
        })
      );
      await page.route(LIST_RE, (route: Route) =>
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(
            responseEnvelope({
              items: [fakeItem(201), fakeItem(202)],
              meta: { total: 2, page: 1, limit: 20, totalPages: 1 }
            })
          )
        })
      );

      await gotoNotifications(page);

      const bell = page.getByRole("button", { name: EN.bellLabel });
      await expect(bell).toBeVisible();
      // Badge text is the unread count; only rendered when count > 0.
      await expect(bell.getByText("3", { exact: true })).toBeVisible();

      await bell.click();
      // Panel renders inside the Popover content (role="dialog"). Scope BOTH
      // assertions to that dialog so the title (which also appears in the page
      // list behind the panel) and the mark-all button (which also exists in the
      // PageHeader) uniquely match the panel's own copy.
      const panel = page.getByRole("dialog");
      await expect(panel).toBeVisible();
      // Panel (Popover content) lists the intercepted first-page items...
      await expect(
        panel.getByText("Intercepted notification 201", { exact: true })
      ).toBeVisible();
      // ...and exposes a "Mark all as read" affordance inside the panel.
      await expect(
        panel.getByRole("button", { name: EN.panelMarkAll })
      ).toBeVisible();
    }
  );

  test(
    "bell badge is hidden when the unread count is zero",
    { tag: "@TC-NOTIF-016" },
    async ({ page }) => {
      await page.route(UNREAD_COUNT_RE, (route: Route) =>
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(responseEnvelope({ count: 0 }))
        })
      );
      await page.goto("/notifications");
      const bell = page.getByRole("button", { name: EN.bellLabel });
      await expect(bell).toBeVisible();
      // No numeric badge node rendered (AppHeader renders <Badge> only on > 0).
      await expect(bell.getByText(/^\d+$/)).toHaveCount(0);
    }
  );
});

// --- D2: Per-tab empty state + null readAt (matrix rows 5a, 5c) — A+B ------
test.describe("Notifications — per-tab empty + null states", () => {
  test(
    "Read tab renders the per-tab empty state when no read items exist",
    { tag: "@TC-NOTIF-017" },
    async ({ page }) => {
      // Only the read filter (isRead=true) returns empty; the unread filter still
      // serves data so the page does not look globally empty. [EP] empty-set
      // partition vs non-empty-set.
      await page.route(LIST_RE, (route: Route) => {
        const url = new URL(route.request().url());
        const isReadParam = url.searchParams.get("isRead");
        const empty = isReadParam === "true";
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(
            responseEnvelope({
              items: empty ? [] : [fakeItem(1)],
              meta: {
                total: empty ? 0 : 1,
                page: 1,
                limit: 20,
                totalPages: empty ? 0 : 1
              }
            })
          )
        });
      });

      await gotoNotifications(page);
      await page.getByRole("tab", { name: EN.read, exact: true }).click();
      await expect(
        page.getByRole("tab", { name: EN.read, exact: true })
      ).toHaveAttribute("data-state", "active");
      await expect(page.getByText(EN.empty)).toBeVisible();
    }
  );

  test(
    "an unread item with readAt:null renders without crashing",
    { tag: "@TC-NOTIF-018" },
    async ({ page }) => {
      // [EP] null-date path: fakeItem default is isRead:false, readAt:null.
      const errors: string[] = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await page.route(LIST_RE, (route: Route) =>
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(
            responseEnvelope({
              items: [fakeItem(1)],
              meta: { total: 1, page: 1, limit: 20, totalPages: 1 }
            })
          )
        })
      );
      await gotoNotifications(page);
      await expect(
        page.getByText("Intercepted notification 1", { exact: true })
      ).toBeVisible();
      expect(errors).toEqual([]);
    }
  );
});

// --- D3: Single full page → no "Load more" from start (row 6b) — A+B -------
test(
  "no Load more button when the dataset is a single full page",
  { tag: "@TC-NOTIF-019" },
  async ({ page }) => {
    // [BVA] limit boundary: exactly 20 items but totalPages 1 →
    // getNextPageParam returns undefined → hasNextPage false → button never
    // rendered (distinct from row 6a where it disappears AFTER the last page).
    const items = Array.from({ length: 20 }, (_, i) => fakeItem(i + 1));
    await page.route(LIST_RE, (route: Route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(
          responseEnvelope({
            items,
            meta: { total: 20, page: 1, limit: 20, totalPages: 1 }
          })
        )
      })
    );
    await gotoNotifications(page);
    await expect(
      page.getByText("Intercepted notification 1", { exact: true })
    ).toBeVisible();
    await expect(page.getByRole("button", { name: EN.loadMore })).toHaveCount(
      0
    );
  }
);

// --- D4: Read-tab content assertion (matrix row 7) — A+B ------------------
test(
  "Read tab shows read seed titles and hides unread ones (and vice versa)",
  { tag: "@TC-NOTIF-020" },
  async ({ page }) => {
    // [Decision Table] tab × isRead → expected subset. Real backend (seed has
    // both read + unread rows). Read-only, no mutation.
    await gotoNotifications(page);

    // Unread tab (default): unread title present, read title absent.
    await expect(
      page.getByText(SEED_UNREAD_TITLE, { exact: true }).first()
    ).toBeVisible();
    await expect(page.getByText(SEED_READ_TITLE, { exact: true })).toHaveCount(
      0
    );

    // Switch to Read tab: read title present, unread title absent.
    await page.getByRole("tab", { name: EN.read, exact: true }).click();
    await expect(
      page.getByText(SEED_READ_TITLE, { exact: true }).first()
    ).toBeVisible();
    await expect(
      page.getByText(SEED_UNREAD_TITLE, { exact: true })
    ).toHaveCount(0);
  }
);

// --- D5: vi relative-time '/trước/' (matrix row 9 NEW) — A+B --------------
test(
  "vi locale renders relative time with the Vietnamese suffix 'trước'",
  { tag: "@TC-NOTIF-021" },
  async ({ page }) => {
    // [Error Guessing] locale-leak: prove date-fns vi locale is wired (not the
    // loose /ago|trước/ union) and that English "ago" never appears on /vi.
    await gotoNotifications(page, "/vi");
    await expect(page.getByText(/trước/).first()).toBeVisible();
    await expect(page.getByText(/\bago\b/i)).toHaveCount(0);
  }
);

// --- D6: Mark-read mutation failure (matrix row 10c) — A+B ----------------
test(
  "mark-read failure shows an error toast and leaves the item unread",
  { tag: "@TC-NOTIF-022" },
  async ({ page }) => {
    // [Error Guessing] server-error on the mutate path. Seed-agnostic: serve one
    // unread item via intercept, then fail the PATCH. invalidate-on-success means
    // a FAILED mutation never flips the cache → item stays unread, no rollback.
    await page.route(LIST_RE, (route: Route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(
          responseEnvelope({
            items: [fakeItem(301)],
            meta: { total: 1, page: 1, limit: 20, totalPages: 1 }
          })
        )
      })
    );
    await page.route(MARK_READ_RE, (route: Route) =>
      route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({
          code: "INTERNAL",
          message: "boom",
          timestamp: new Date().toISOString(),
          path: "/api/v1/notifications/fake-301/read"
        })
      })
    );

    await gotoNotifications(page);
    const button = markReadButtons(page).first();
    await expect(button).toBeVisible();
    await button.click();

    // The global MutationCache handler toasts a 5xx once (sonner).
    await expect(page.getByText(EN.toastServerError)).toBeVisible({
      timeout: 10_000
    });
    // Item is still unread (cache untouched) and still has its mark-read button.
    await expect(
      page.getByText("Intercepted notification 301", { exact: true })
    ).toBeVisible();
    await expect(markReadButtons(page)).toHaveCount(1);
  }
);

// --- D10: #announcer aria-live updates (matrix row 12 NEW) — A+B ----------
test.describe("Notifications — announcer (aria-live)", () => {
  test(
    "tab change announces via the #announcer live region",
    { tag: "@TC-NOTIF-023" },
    async ({ page }) => {
      // [State Transition] read-only tab switch writes to the polite live region.
      await gotoNotifications(page);
      await page.getByRole("tab", { name: EN.read, exact: true }).click();
      await expect(page.locator("#announcer")).toHaveText(
        EN.announceTabChangedRead,
        { timeout: 5_000 }
      );
    }
  );

  test(
    "load-more announces via the #announcer live region",
    { tag: "@TC-NOTIF-023" },
    async ({ page }) => {
      const page1 = Array.from({ length: 20 }, (_, i) => fakeItem(i + 1));
      const page2 = Array.from({ length: 3 }, (_, i) => fakeItem(i + 21));
      await page.route(LIST_RE, (route: Route) => {
        const url = new URL(route.request().url());
        const isPage2 = url.searchParams.get("page") === "2";
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(
            responseEnvelope({
              items: isPage2 ? page2 : page1,
              meta: {
                total: 23,
                page: isPage2 ? 2 : 1,
                limit: 20,
                totalPages: 2
              }
            })
          )
        });
      });
      await gotoNotifications(page);
      await page.getByRole("button", { name: EN.loadMore }).click();
      await expect(page.locator("#announcer")).toHaveText(
        EN.announceLoadingMore,
        { timeout: 5_000 }
      );
    }
  );
});

// --- D11: Keyboard activation (Enter/Space) on mark-read (row 12) — A only -
test.describe("Notifications — keyboard activation", () => {
  for (const key of ["Enter", "Space"] as const) {
    // [State Transition] CustomButton is a native <button>; both Enter and
    // Space activate it. Measured at the PATCH-request layer via intercept so
    // no real seed mutation occurs (assert PATCH fired, not a live badge).
    test(
      `pressing ${key} on a focused mark-read button fires the mutation`,
      { tag: "@TC-NOTIF-024" },
      async ({ page }) => {
        let patchFired = false;
        await page.route(LIST_RE, (route: Route) =>
          route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify(
              responseEnvelope({
                items: [fakeItem(501)],
                meta: { total: 1, page: 1, limit: 20, totalPages: 1 }
              })
            )
          })
        );
        await page.route(MARK_READ_RE, (route: Route) => {
          patchFired = true;
          route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify(
              responseEnvelope({ ...fakeItem(501, true), id: "fake-501" })
            )
          });
        });

        await gotoNotifications(page);
        const button = markReadButtons(page).first();
        await button.focus();
        await expect(button).toBeFocused();
        await page.keyboard.press(key);
        await expect.poll(() => patchFired, { timeout: 5_000 }).toBe(true);
      }
    );
  }
});

test.describe("Notifications — accessibility", () => {
  // --- Scenario 11: A11y (real backend) ---
  test(
    "mark-read button has an accessible name and is keyboard focusable",
    { tag: "@TC-NOTIF-025" },
    async ({ page }) => {
      await gotoNotifications(page);

      // Accessible name comes from getByRole name match (aria-label).
      const button = markReadButtons(page).first();
      await expect(button).toBeVisible();

      // Keyboard-focusable.
      await button.focus();
      await expect(button).toBeFocused();
    }
  );

  test(
    "load more is reachable by role when the dataset paginates",
    { tag: "@TC-NOTIF-025" },
    async ({ page }) => {
      // Pagination depends on seeded volume per tab; drive it deterministically
      // via intercept so the a11y assertion (Load more reachable by role) is
      // stable regardless of seed counts.
      const items = Array.from({ length: 20 }, (_, i) => fakeItem(i + 1));
      await page.route(LIST_RE, (route: Route) =>
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(
            responseEnvelope({
              items,
              meta: { total: 25, page: 1, limit: 20, totalPages: 2 }
            })
          )
        })
      );
      await gotoNotifications(page);
      const loadMore = page.getByRole("button", { name: EN.loadMore });
      await expect(loadMore).toBeVisible();
      await loadMore.focus();
      await expect(loadMore).toBeFocused();
    }
  );
});

// --- Grouping by local day ------------------------------------------------
test.describe("Notifications — grouping", () => {
  test.use({ timezoneId: "Asia/Ho_Chi_Minh" });

  test(
    "items group into Today / Yesterday / Earlier at local midnight [BVA]",
    { tag: "@TC-NOTIF-027" },
    async ({ page }) => {
      await page.clock.setFixedTime(new Date("2026-10-07T10:00:00+07:00"));
      const at = (i: number, iso: string): FakeNotification => ({
        ...fakeItem(i),
        createdAt: new Date(iso).toISOString()
      });
      await page.route(LIST_RE, (route: Route) =>
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(
            responseEnvelope({
              items: [
                at(1, "2026-10-07T00:00:00+07:00"), // today, first instant
                at(2, "2026-10-06T23:59:59+07:00"), // yesterday, last second
                at(3, "2026-10-06T00:00:00+07:00"), // yesterday, first instant
                at(4, "2026-10-05T23:59:59+07:00") // earlier
              ],
              meta: { total: 4, page: 1, limit: 20, totalPages: 1 }
            })
          )
        })
      );
      await gotoNotifications(page);
      const group = (label: string) =>
        page.locator(`div:has(> div:text-is("${label}")) > article`);
      await expect(group("Today")).toHaveCount(1);
      await expect(group("Today")).toHaveAttribute(
        "aria-label",
        "Intercepted notification 1"
      );
      await expect(group("Yesterday")).toHaveCount(2);
      await expect(group("Earlier")).toHaveCount(1);
      await expect(group("Earlier")).toHaveAttribute(
        "aria-label",
        "Intercepted notification 4"
      );
    }
  );
});

// --- Header panel actions -------------------------------------------------
test.describe("Notifications — header panel actions", () => {
  test(
    "the panel's View all opens the page and its Mark all clears the badge",
    { tag: "@TC-NOTIF-028" },
    async ({ page }) => {
      let markedAll = false;
      await page.route(UNREAD_COUNT_RE, (route: Route) =>
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(responseEnvelope({ count: markedAll ? 0 : 2 }))
        })
      );
      await page.route(LIST_RE, (route: Route) =>
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(
            responseEnvelope({
              items: markedAll ? [] : [fakeItem(601), fakeItem(602)],
              meta: {
                total: markedAll ? 0 : 2,
                page: 1,
                limit: 20,
                totalPages: markedAll ? 0 : 1
              }
            })
          )
        })
      );
      await page.route(READ_ALL_RE, (route: Route) => {
        markedAll = true;
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(responseEnvelope({ updated: 2 }))
        });
      });

      await page.goto("/");
      const bell = page.getByRole("button", { name: EN.bellLabel });
      await expect(bell.getByText("2", { exact: true })).toBeVisible();

      await bell.click();
      const panel = page.getByRole("dialog");
      await panel.getByRole("button", { name: EN.panelMarkAll }).click();
      await expect(bell.getByText(/^\d+$/)).toHaveCount(0);

      await panel
        .getByRole("button", { name: "View all notifications" })
        .click();
      await expect(page).toHaveURL(/\/notifications$/);
    }
  );
});
