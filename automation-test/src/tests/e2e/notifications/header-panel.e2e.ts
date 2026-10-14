import { test, expect } from "@/fixtures";
import { NotificationBell } from "@/components/notification-bell.component";
import { copy } from "@/data/copy";
import {
  LIST_RE,
  READ_ALL_RE,
  UNREAD_COUNT_RE,
  fail500,
  fakeBody,
  fakeItem,
  fulfillCount,
  fulfillJson,
  fulfillList
} from "./helpers";

// The bell in the header and the panel it opens —
// client/src/layouts/AppHeader + components/NotificationPanel. Role: user.
// The bell is on every signed-in screen; the cases open it on home. Every
// case stubs the endpoints, so the seeded inbox is never touched.
// Test cases: test-cases/notifications.md (TC-NOTIFICATIONS-015, 016, 028,
// 049, 050, 060, 061).

test(
  "The bell shows the unread badge and the panel asks for 8 rows",
  { tag: ["@TC-NOTIFICATIONS-015", "@smoke"] },
  async ({ page }) => {
    const bell = new NotificationBell(page);
    const limits: string[] = [];
    await page.route(UNREAD_COUNT_RE, fulfillCount(3));
    await page.route(LIST_RE, (route) => {
      limits.push(
        new URL(route.request().url()).searchParams.get("limit") ?? ""
      );
      return fulfillList([fakeItem(201), fakeItem(202)])(route);
    });
    await page.goto("/");
    await expect(bell.badge("3")).toBeVisible();
    await bell.open();
    await expect(bell.panelText(fakeBody(201))).toBeVisible();
    await expect(bell.markAllButton()).toBeVisible();
    expect(limits).toContain("8");
  }
);

test(
  "No badge at zero unread; the panel shows its empty state",
  { tag: "@TC-NOTIFICATIONS-016" },
  async ({ page }) => {
    const bell = new NotificationBell(page);
    await page.route(UNREAD_COUNT_RE, fulfillCount(0));
    await page.route(LIST_RE, fulfillList([]));
    await page.goto("/");
    await expect(bell.badge(/^\d+$/)).toHaveCount(0);
    await bell.open();
    await expect(
      bell.panelText(copy.notifications.states.emptyTitle)
    ).toBeVisible();
  }
);

test(
  "The panel shows its error state",
  { tag: "@TC-NOTIFICATIONS-049" },
  async ({ page }) => {
    const bell = new NotificationBell(page);
    await page.route(LIST_RE, fail500);
    await page.goto("/");
    await bell.open();
    await expect(bell.panelText(copy.notifications.states.error)).toBeVisible({
      timeout: 20_000
    });
  }
);

test(
  "Opening an item in the panel closes it and navigates",
  { tag: "@TC-NOTIFICATIONS-050" },
  async ({ page }) => {
    const bell = new NotificationBell(page);
    await page.route(LIST_RE, fulfillList([fakeItem(203, { isRead: true })]));
    await page.goto("/");
    await bell.open();
    await bell.panelText(fakeBody(203)).click();
    await expect(page).toHaveURL(/\/apps\?search=/);
    await expect(bell.panel()).toHaveCount(0);
  }
);

test(
  "The panel's Mark all and View all",
  { tag: "@TC-NOTIFICATIONS-028" },
  async ({ page }) => {
    const bell = new NotificationBell(page);
    let markedAll = false;
    await page.route(UNREAD_COUNT_RE, (route) =>
      fulfillCount(markedAll ? 0 : 2)(route)
    );
    await page.route(LIST_RE, (route) =>
      fulfillList(markedAll ? [] : [fakeItem(601), fakeItem(602)])(route)
    );
    await page.route(READ_ALL_RE, (route) => {
      markedAll = true;
      return fulfillJson(route, { updated: 2 });
    });

    await page.goto("/");
    await expect(bell.badge("2")).toBeVisible();
    await bell.open();
    await bell.markAllButton().click();
    await expect(bell.badge(/^\d+$/)).toHaveCount(0);

    await bell.viewAllButton().click();
    await expect(page).toHaveURL(/\/notifications$/);
  }
);

test(
  "The panel's Unread tab asks for unread rows only",
  { tag: "@TC-NOTIFICATIONS-060" },
  async ({ page }) => {
    const bell = new NotificationBell(page);
    const seen: URLSearchParams[] = [];
    await page.route(LIST_RE, (route) => {
      const query = new URL(route.request().url()).searchParams;
      seen.push(query);
      const unreadOnly = query.get("isRead") === "false";
      return fulfillList(
        unreadOnly
          ? [fakeItem(701)]
          : [fakeItem(701), fakeItem(702, { isRead: true })]
      )(route);
    });
    await page.goto("/");
    await bell.open();
    await expect(bell.tab("all", true)).toBeVisible();
    await expect(bell.panelText(fakeBody(702))).toBeVisible();

    await bell.tab("unread").click();
    await expect(bell.tab("unread", true)).toBeVisible();
    await expect
      .poll(() =>
        seen.some((q) => q.get("isRead") === "false" && q.get("limit") === "8")
      )
      .toBe(true);
    await expect(bell.panelText(fakeBody(701))).toBeVisible();
    await expect(bell.panelText(fakeBody(702))).toHaveCount(0);
  }
);

test(
  "The panel's Mark all is disabled with nothing unread",
  { tag: "@TC-NOTIFICATIONS-061" },
  async ({ page }) => {
    const bell = new NotificationBell(page);
    let readAllCalls = 0;
    await page.route(UNREAD_COUNT_RE, fulfillCount(0));
    await page.route(LIST_RE, fulfillList([fakeItem(801, { isRead: true })]));
    await page.route(READ_ALL_RE, (route) => {
      readAllCalls += 1;
      return fulfillJson(route, { updated: 0 });
    });
    await page.goto("/");
    await bell.open();
    await expect(bell.panelText(fakeBody(801))).toBeVisible();
    await expect(bell.markAllButton()).toBeDisabled();
    expect(readAllCalls).toBe(0);
  }
);
