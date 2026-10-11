import { test, expect } from "@fixtures";
import type { Page, Route } from "@playwright/test";
import { createAccount } from "@helpers/accounts";
import { loginViaUi } from "@helpers/auth";
import {
  ANOMALY_USER_AGENTS,
  SEED_CONSUMED_APPS,
  SEED_MARK_SINGLE_BODY,
  SEED_PERSIST_BODY,
  SEED_READ_BODY,
  SEED_UNREAD_BODY,
  SEED_UNREAD_N,
  USER_EMAIL,
  fetchUnreadCount,
  markUnreadByAppName,
  warmUpHelperDevice,
  withApi
} from "@helpers/notifications";

// The notification panel (header bell) and the /notifications page.
// Role: user (user@test.com); the real-event case signs in a throwaway
// account of its own. Test cases: test-cases/notifications.md
// (TC-NOTIF-001 … 028, 039 … 051). The API layer — list contract, filters,
// paging, validation, isolation — is tests/api/notifications/notifications.api.ts.
//
// Notifications carry no text: the API returns `type + params + link` and the
// client renders `notifications.types.<TYPE>` in the page locale. Assertions
// therefore target rendered sentences, never stored strings.
//
// Real backend vs intercepts:
//   - Real (seeded DB): seed rendering, real category filter, vi templates,
//     mark single, persistence, and the real LOGIN_ANOMALY event.
//   - page.route intercepts: empty / error / pagination / link safety /
//     unknown type / request params / grouping — deterministic regardless of
//     seed.
//
// Mutation safety: "mark single" consumes Seed App 12 and "persists after
// reload" consumes Seed App 14 through the real PATCH; afterAll puts both back
// to unread in the database (there is no mark-unread API). The real-event case
// runs on a throwaway account, so the seeded user gains no rows.

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
  test(
    "defaults to All and renders seeded templates with relative time",
    { tag: ["@TC-NOTIF-001", "@smoke"] },
    async ({ page }) => {
      await gotoNotifications(page);
      await expect(tab(page, EN.all)).toHaveAttribute("data-state", "active");
      await expect(
        page.getByText(SEED_UNREAD_BODY, { exact: true })
      ).toBeVisible();
      await expect(
        page.getByText(SEED_READ_BODY, { exact: true })
      ).toBeVisible();
      await expect(
        page.getByText(/^(Today|Yesterday|Earlier)$/).first()
      ).toBeVisible();
      await expect(page.getByText(/\dT\d\d:\d\d/)).toHaveCount(0);
    }
  );

  test(
    "[DT] fills each template from its params",
    { tag: "@TC-NOTIF-006" },
    async ({ page }) => {
      await gotoNotifications(page);
      // LOGIN_ANOMALY reason=device: browser + os, country code → no raw "VN".
      // On a freshly seeded DB the suite's own Chrome-on-Windows sign-in is a
      // new device too, so the seeded sentence may appear twice.
      await expect(page.getByText(EN.anomalyTitle).first()).toBeVisible();
      await expect(
        page
          .getByText(
            "Chrome on Windows — a device we haven't seen on your account before."
          )
          .first()
      ).toBeVisible();
      // PASSWORD_CHANGED: actor=admin and actor=self pick different sentences.
      await expect(page.getByText(EN.adminResetTitle)).toBeVisible();
      await expect(page.getByText(EN.selfChangedTitle).first()).toBeVisible();
      // ACCOUNT_LOCKED interpolates the number.
      await expect(page.getByText(EN.lockedBody)).toBeVisible();
      // No raw enum or key leaked.
      await expect(page.getByText(/LOGIN_ANOMALY|types\.|actor/)).toHaveCount(
        0
      );
    }
  );

  test(
    "[DT] reason=both renders the country name, not the ISO code",
    { tag: "@TC-NOTIF-039" },
    async ({ page }) => {
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
    }
  );

  test(
    "unread rows carry a mark-read button, read rows do not",
    { tag: "@TC-NOTIF-005" },
    async ({ page }) => {
      await page.route(
        LIST_RE,
        fulfillList([fakeItem(1), fakeItem(2, { isRead: true })])
      );
      await gotoNotifications(page);
      await expect(page.locator("article[data-read='false']")).toHaveCount(1);
      await expect(page.locator("article[data-read='true']")).toHaveCount(1);
      await expect(markReadButtons(page)).toHaveCount(1);
    }
  );

  test(
    "an unknown type falls back to its name instead of crashing",
    { tag: "@TC-NOTIF-018" },
    async ({ page }) => {
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
    }
  );
});

// ─── 2. AuthN ──────────────────────────────────────────────────────────────
test(
  "unauthenticated visit is gated to the login screen",
  { tag: "@TC-NOTIF-002" },
  async ({ guestPage }) => {
    await guestPage.goto("/notifications");
    await expect(
      guestPage.getByRole("button", { name: /continue with email/i })
    ).toBeVisible({ timeout: 20_000 });
    await expect(guestPage.getByRole("tab", { name: EN.all })).toHaveCount(0);
  }
);

// ─── 4. Validation (link safety) ─────────────────────────────────────────────────────────
test.describe("Notifications — validation", () => {
  // `category=bogus` → 400 is proven at the API layer (TC-NOTIF-038).

  for (const [label, link] of [
    ["absolute URL", "https://evil.example/phish"],
    ["protocol-relative", "//evil.example"],
    ["backslash", "/\\evil.example"]
  ] as const) {
    test(
      `[EP] a ${label} link renders no anchor`,
      { tag: "@TC-NOTIF-040" },
      async ({ page }) => {
        await page.route(LIST_RE, fulfillList([fakeItem(1, { link })]));
        await gotoNotifications(page);
        const article = page.locator("article").first();
        await expect(article.getByText(fakeBody(1))).toBeVisible();
        await expect(article.locator("a")).toHaveCount(0);
      }
    );
  }

  test(
    "[EP] an internal link renders an anchor to that path",
    { tag: "@TC-NOTIF-041" },
    async ({ page }) => {
      await page.route(LIST_RE, fulfillList([fakeItem(1)]));
      await gotoNotifications(page);
      await expect(
        page.locator("article a").filter({ hasText: fakeBody(1) })
      ).toHaveAttribute("href", "/apps?search=Intercepted%20app%201");
    }
  );
});

// ─── 5. Empty states ───────────────────────────────────────────────────────
test.describe("Notifications — empty", () => {
  test(
    "empty list renders the empty state",
    { tag: "@TC-NOTIF-003" },
    async ({ page }) => {
      await page.route(LIST_RE, fulfillList([]));
      await gotoNotifications(page);
      await expect(page.getByText(EN.emptyTitle)).toBeVisible();
      await expect(page.getByText(EN.empty)).toBeVisible();
    }
  );

  test(
    "Read tab shows its own empty state",
    { tag: "@TC-NOTIF-017" },
    async ({ page }) => {
      await page.route(LIST_RE, (route) => {
        const isRead = new URL(route.request().url()).searchParams.get(
          "isRead"
        );
        return fulfillList(isRead === "true" ? [] : [fakeItem(1)])(route);
      });
      await gotoNotifications(page);
      await tab(page, EN.read).click();
      await expect(tab(page, EN.read)).toHaveAttribute("data-state", "active");
      await expect(page.getByText(EN.empty)).toBeVisible();
    }
  );
});

// ─── 6. Boundary / pagination ──────────────────────────────────────────────
test.describe("Notifications — pagination", () => {
  test(
    "[BVA] load more appends page 2 and disappears on the last page",
    { tag: ["@TC-NOTIF-004", "@TC-NOTIF-023"] },
    async ({ page }) => {
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
      await expect(page.getByText(fakeBody(21))).toHaveCount(0);
      await loadMore.click();
      await expect(page.getByText(fakeBody(21))).toBeVisible();
      await expect(loadMore).toHaveCount(0);
      await expect(page.locator("#announcer")).toHaveText(
        EN.announceLoadingMore
      );
    }
  );

  test(
    "[BVA] exactly one full page shows no load more",
    { tag: "@TC-NOTIF-019" },
    async ({ page }) => {
      await page.route(
        LIST_RE,
        fulfillList(Array.from({ length: 20 }, (_, i) => fakeItem(i + 1)))
      );
      await gotoNotifications(page);
      await expect(page.getByText(fakeBody(20))).toBeVisible();
      await expect(page.getByRole("button", { name: EN.loadMore })).toHaveCount(
        0
      );
    }
  );
});

// ─── 7. Filters ────────────────────────────────────────────────────────────
test.describe("Notifications — filters", () => {
  test(
    "[DT] status tab × category chip combine into one request",
    { tag: ["@TC-NOTIF-042", "@TC-NOTIF-023"] },
    async ({ page }) => {
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
            (p) =>
              p.get("isRead") === "false" && p.get("category") === "security"
          )
        )
        .toBe(true);
      await expect(
        page.getByRole("button", { name: EN.security, pressed: true })
      ).toBeVisible();
      await expect(page.locator("#announcer")).toHaveText(
        EN.announceCategorySecurity
      );
    }
  );

  test(
    "[EP] the Security chip shows only security notifications (real)",
    { tag: "@TC-NOTIF-043" },
    async ({ page }) => {
      await gotoNotifications(page);
      await page.getByRole("button", { name: EN.security }).click();
      await expect(page.getByText(EN.anomalyTitle).first()).toBeVisible();
      await expect(page.getByText(SEED_UNREAD_BODY)).toHaveCount(0);
      await page.getByRole("button", { name: EN.apps }).click();
      await expect(page.getByText(SEED_UNREAD_BODY)).toBeVisible();
      await expect(page.getByText(EN.anomalyTitle)).toHaveCount(0);
    }
  );

  test(
    "Read tab keeps read rows and drops unread ones (real)",
    { tag: ["@TC-NOTIF-020", "@TC-NOTIF-023"] },
    async ({ page }) => {
      await gotoNotifications(page);
      await tab(page, EN.read).click();
      await expect(page.getByText(SEED_READ_BODY)).toBeVisible();
      await expect(page.getByText(SEED_UNREAD_BODY)).toHaveCount(0);
      await expect(page.locator("#announcer")).toHaveText(
        EN.announceTabChangedRead
      );
    }
  );
});

// ─── 9. i18n ───────────────────────────────────────────────────────────────
test.describe("Notifications — i18n", () => {
  test(
    "vi renders tabs and templates in Vietnamese",
    { tag: ["@TC-NOTIF-008", "@TC-NOTIF-021"] },
    async ({ page }) => {
      await gotoNotifications(page, "/vi");
      await expect(tab(page, VI.all)).toBeVisible();
      await expect(tab(page, VI.unread)).toBeVisible();
      await expect(tab(page, VI.read)).toBeVisible();
      await expect(
        page.getByRole("button", { name: VI.markAll })
      ).toBeVisible();
      await expect(page.getByText(VI.seedAppBody)).toBeVisible();
      await expect(page.getByText(VI.anomalyTitle).first()).toBeVisible();
      await expect(page.getByText(/trước/).first()).toBeVisible();
      await expect(
        page.getByText(/\bago\b|is now in your launcher/)
      ).toHaveCount(0);
    }
  );

  test(
    "vi names the country in Vietnamese",
    { tag: "@TC-NOTIF-044" },
    async ({ page }) => {
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
    }
  );
});

// ─── 10. Error / loading ───────────────────────────────────────────────────
test.describe("Notifications — errors", () => {
  test(
    "a failing list shows the error state and Try again refetches",
    { tag: "@TC-NOTIF-009" },
    async ({ page }) => {
      let fail = true;
      await page.route(LIST_RE, (route) =>
        fail ? fail500(route) : fulfillList([fakeItem(1)])(route)
      );
      await gotoNotifications(page);
      await expect(page.getByText(EN.error)).toBeVisible({ timeout: 20_000 });
      fail = false;
      await page.getByRole("button", { name: EN.retry }).click();
      await expect(page.getByText(fakeBody(1))).toBeVisible();
    }
  );

  test(
    "mark-read failure shows its own toast and keeps the row unread",
    { tag: "@TC-NOTIF-022" },
    async ({ page }) => {
      await page.route(LIST_RE, fulfillList([fakeItem(301)]));
      await page.route(MARK_READ_RE, fail500);
      await gotoNotifications(page);
      await markReadButtons(page).first().click();
      await expect(page.getByText(EN.toastMarkReadError)).toBeVisible();
      await expect(
        page.getByText("Server error. Please try again later.")
      ).toHaveCount(0);
      await expect(markReadButtons(page)).toHaveCount(1);
    }
  );
});

// ─── 11. Mutations (A only) ────────────────────────────────────────────────
test.describe.serial("Notifications — mutations", () => {
  test.beforeAll(async () => {
    await warmUpHelperDevice();
  });

  test.afterAll(async () => {
    // Seed App 12 / 14 were marked read through the real PATCH.
    await markUnreadByAppName(USER_EMAIL, SEED_CONSUMED_APPS);
  });

  test(
    "[ST] mark single moves the row out of Unread and drops the count by one",
    { tag: ["@TC-NOTIF-010", "@smoke"] },
    async ({ page }) => {
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
    }
  );

  test(
    "[ST] a marked row stays read after reload",
    { tag: "@TC-NOTIF-014" },
    async ({ page }) => {
      await gotoNotifications(page);
      const row = page
        .locator("article")
        .filter({ hasText: SEED_PERSIST_BODY });
      await row.getByRole("button", { name: EN.markRead }).click();
      await expect(row).toHaveAttribute("data-read", "true", {
        timeout: 15_000
      });
      await page.reload();
      await tab(page, EN.unread).click();
      await expect(page.getByText(SEED_PERSIST_BODY)).toHaveCount(0);
      await tab(page, EN.read).click();
      await expect(page.getByText(SEED_PERSIST_BODY)).toBeVisible();
    }
  );

  test(
    "[ST] opening a row marks it read and follows its link",
    { tag: "@TC-NOTIF-045" },
    async ({ page }) => {
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
    }
  );

  test(
    "[ST] opening an already read row does not PATCH again",
    { tag: "@TC-NOTIF-046" },
    async ({ page }) => {
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
    }
  );

  test(
    "'Not you?' on an unusual sign-in leads to the password form",
    { tag: "@TC-NOTIF-047" },
    async ({ page }) => {
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
    }
  );

  test(
    "mark all empties Unread (intercepted, seed untouched)",
    { tag: "@TC-NOTIF-011" },
    async ({ page }) => {
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
    }
  );

  test(
    "[Error Guessing] double-clicking mark-read sends one PATCH",
    { tag: "@TC-NOTIF-013" },
    async ({ page }) => {
      let patchCount = 0;
      await page.route(LIST_RE, fulfillList([fakeItem(401)]));
      await page.route(MARK_READ_RE, async (route) => {
        patchCount += 1;
        await new Promise((resolve) => setTimeout(resolve, 600));
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(
            responseEnvelope(fakeItem(401, { isRead: true }))
          )
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
    }
  );

  test(
    "[ST] a sign-in from an unseen device produces a real notification",
    { tag: "@TC-NOTIF-048" },
    async ({ guestPage }) => {
      // A throwaway account: its first sign-in has no history (never an
      // anomaly), the second from another browser/OS is a new device.
      const account = await createAccount({ tag: "notif-anomaly" });
      const [known, unseen] = ANOMALY_USER_AGENTS;
      const signIn = (ua: string) =>
        withApi(async (ctx) => {
          const res = await ctx.post("/api/v1/auth/login", {
            data: { email: account.email, password: account.password },
            headers: { "User-Agent": ua }
          });
          expect(res.ok(), `login → ${res.status()}`).toBeTruthy();
          return ((await res.json()) as { data: { accessToken: string } }).data
            .accessToken;
        });
      const anomalies = (token: string) =>
        withApi(async (ctx) => {
          const res = await ctx.get(
            "/api/v1/notifications?category=security&limit=50",
            { headers: { Authorization: `Bearer ${token}` } }
          );
          const body = (await res.json()) as {
            data: {
              items: { type: string; params: Record<string, string> }[];
            };
          };
          return body.data.items.filter((n) => n.type === "LOGIN_ANOMALY");
        });

      const first = await signIn(known.ua);
      // Login history is written fire-and-forget; give it a moment to land
      // before the second sign-in reads it.
      await guestPage.waitForTimeout(1_500);
      expect(await anomalies(first)).toHaveLength(0);

      const second = await signIn(unseen.ua);
      await expect
        .poll(async () => (await anomalies(second)).length, {
          timeout: 15_000
        })
        .toBe(1);
      const [newest] = await anomalies(second);
      expect(newest.params.browser).toBe(unseen.browser);

      await loginViaUi(guestPage, account.email, account.password);
      await gotoNotifications(guestPage);
      await expect(
        guestPage.getByText(new RegExp(`^${unseen.browser} on `)).first()
      ).toBeVisible();
    }
  );
});

// ─── 13. Header panel ──────────────────────────────────────────────────────
test.describe("Notifications — header panel", () => {
  test(
    "[BVA] the panel asks for 8 items and lists them with a badge",
    { tag: ["@TC-NOTIF-015", "@smoke"] },
    async ({ page }) => {
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
      await expect(
        panel.getByRole("button", { name: EN.markAll })
      ).toBeVisible();
      expect(limits).toContain("8");
    }
  );

  test(
    "the badge is hidden at zero and the panel shows its empty state",
    { tag: "@TC-NOTIF-016" },
    async ({ page }) => {
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
    }
  );

  test(
    "the panel shows the error state when the list fails",
    { tag: "@TC-NOTIF-049" },
    async ({ page }) => {
      await page.route(LIST_RE, fail500);
      await page.goto("/");
      await page.getByRole("button", { name: EN.bellLabel }).click();
      await expect(page.getByRole("dialog").getByText(EN.error)).toBeVisible({
        timeout: 20_000
      });
    }
  );

  test(
    "opening an item in the panel closes it and navigates",
    { tag: "@TC-NOTIF-050" },
    async ({ page }) => {
      await page.route(LIST_RE, fulfillList([fakeItem(203, { isRead: true })]));
      await page.goto("/");
      await page.getByRole("button", { name: EN.bellLabel }).click();
      await page.getByRole("dialog").getByText(fakeBody(203)).click();
      await expect(page).toHaveURL(/\/apps\?search=/);
      await expect(page.getByRole("dialog")).toHaveCount(0);
    }
  );

  test(
    "the panel's Mark all clears the badge and View all opens the page",
    { tag: "@TC-NOTIF-028" },
    async ({ page }) => {
      let markedAll = false;
      await page.route(UNREAD_COUNT_RE, (route) =>
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(responseEnvelope({ count: markedAll ? 0 : 2 }))
        })
      );
      await page.route(LIST_RE, (route) =>
        fulfillList(markedAll ? [] : [fakeItem(601), fakeItem(602)])(route)
      );
      await page.route(READ_ALL_RE, (route) => {
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
      await panel.getByRole("button", { name: EN.markAll }).click();
      await expect(bell.getByText(/^\d+$/)).toHaveCount(0);

      await panel.getByRole("button", { name: EN.viewAll }).click();
      await expect(page).toHaveURL(/\/notifications$/);
    }
  );
});

// ─── 12. Accessibility ─────────────────────────────────────────────────────
test.describe("Notifications — accessibility", () => {
  for (const key of ["Enter", "Space"] as const) {
    test(
      `pressing ${key} on a focused mark-read button fires the mutation`,
      { tag: "@TC-NOTIF-024" },
      async ({ page }) => {
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
      }
    );
  }

  test(
    "each row is an article named by its title, its link is focusable",
    { tag: "@TC-NOTIF-025" },
    async ({ page }) => {
      await page.route(LIST_RE, fulfillList([fakeItem(601)]));
      await gotoNotifications(page);
      await expect(
        page.getByRole("article", { name: "New app available" })
      ).toBeVisible();
      const link = page.locator("article a").first();
      await link.focus();
      await expect(link).toBeFocused();
    }
  );

  test(
    "category chips expose their pressed state",
    { tag: "@TC-NOTIF-051" },
    async ({ page }) => {
      await page.route(LIST_RE, fulfillList([fakeItem(1)]));
      await gotoNotifications(page);
      const group = page.getByRole("group", { name: EN.categoryLabel });
      await expect(
        group.getByRole("button", { name: EN.allTypes, pressed: true })
      ).toBeVisible();
      await expect(
        group.getByRole("button", { name: EN.security, pressed: false })
      ).toBeVisible();
    }
  );
});

// ─── Chrome, no-op mark all, day grouping ──────────────────────────────────
test(
  "renders English chrome on the default locale",
  { tag: "@TC-NOTIF-007" },
  async ({ page }) => {
    await gotoNotifications(page);
    await expect(tab(page, EN.all)).toBeVisible();
    await expect(tab(page, EN.unread)).toBeVisible();
    await expect(tab(page, EN.read)).toBeVisible();
    await expect(page.getByRole("button", { name: EN.markAll })).toBeVisible();
    await expect(
      page.getByRole("group", { name: EN.categoryLabel })
    ).toBeVisible();
  }
);

test(
  "mark all on an already-empty list is a no-op (no negative badge) [BVA]",
  { tag: "@TC-NOTIF-012" },
  async ({ page }) => {
    await page.route(LIST_RE, fulfillList([]));
    await page.route(UNREAD_COUNT_RE, (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(responseEnvelope({ count: 0 }))
      })
    );
    await page.route(READ_ALL_RE, (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(responseEnvelope({ updated: 0 }))
      })
    );
    await gotoNotifications(page);
    await expect(page.getByText(EN.empty)).toBeVisible();
    await page.getByRole("button", { name: EN.markAll }).click();
    await expect(page.getByText(EN.empty)).toBeVisible();
    const bell = page.getByRole("button", { name: EN.bellLabel });
    await expect(bell.getByText(/^-?\d+$/)).toHaveCount(0);
  }
);

test.describe("Notifications — grouping", () => {
  test.use({ timezoneId: "Asia/Ho_Chi_Minh" });

  test(
    "items group into Today / Yesterday / Earlier at local midnight [BVA]",
    { tag: "@TC-NOTIF-027" },
    async ({ page }) => {
      await page.clock.setFixedTime(new Date("2026-10-07T10:00:00+07:00"));
      const at = (i: number, iso: string) =>
        fakeItem(i, { createdAt: new Date(iso).toISOString() });
      await page.route(
        LIST_RE,
        fulfillList([
          at(1, "2026-10-07T00:00:00+07:00"), // today, first instant
          at(2, "2026-10-06T23:59:59+07:00"), // yesterday, last second
          at(3, "2026-10-06T00:00:00+07:00"), // yesterday, first instant
          at(4, "2026-10-05T23:59:59+07:00") // earlier
        ])
      );
      await gotoNotifications(page);
      const group = (label: string) =>
        page.locator(`section[aria-label="${label}"] article`);
      await expect(group("Today")).toHaveCount(1);
      await expect(group("Today")).toContainText(fakeBody(1));
      await expect(group("Yesterday")).toHaveCount(2);
      await expect(group("Earlier")).toHaveCount(1);
      await expect(group("Earlier")).toContainText(fakeBody(4));
    }
  );
});
