import { test, expect } from "@/fixtures";
import type { Route } from "@playwright/test";
import { LIST_RE, appBody, fulfillJson } from "./helpers";

// The list's loading skeleton — client/src/components/NotificationListSkeleton,
// rendered inside <div aria-hidden="true"> while the notifications query is
// pending, replaced by the day groups once it resolves. Role: user.
// Test case: test-cases/notifications.md (TC-NOTIFICATIONS-026).

const item = (i: number) => ({
  id: `fake-loading-${i}`,
  type: "APP_AVAILABLE",
  category: "app",
  params: { appName: `Loading test app ${i}` },
  link: null,
  isRead: false,
  readAt: null,
  createdAt: new Date(Date.now() - i * 60_000).toISOString()
});

const twoItems = (a: number, b: number) => ({
  items: [item(a), item(b)],
  meta: { total: 2, page: 1, limit: 20, totalPages: 1 }
});

test.describe(
  "Skeleton while loading, gone once loaded",
  { tag: "@TC-NOTIFICATIONS-026" },
  () => {
    // [State Transition] loading → loaded: the response is held until the
    // skeleton has been seen.
    test("the skeleton shows while the query is pending, then the rows", async ({
      page,
      notificationsPage: inbox
    }) => {
      let resolveHold!: () => void;
      const hold = new Promise<void>((resolve) => {
        resolveHold = resolve;
      });
      await page.route(LIST_RE, async (route: Route) => {
        await hold;
        await fulfillJson(route, twoItems(1, 2));
      });

      await inbox.goto();
      // aria-hidden nodes are attached but not "visible" to Playwright's
      // accessibility-aware checks inside the tab panel: toBeAttached.
      await expect(inbox.skeleton()).toBeAttached({ timeout: 10_000 });

      resolveHold();
      await expect(
        inbox.text(appBody("Loading test app 1"), { exact: true })
      ).toBeVisible({ timeout: 10_000 });
    });

    // [Error Guessing] the skeleton must be unmounted once data renders, not
    // left in the DOM beside the real groups.
    test("the skeleton is gone once the rows render", async ({
      page,
      notificationsPage: inbox
    }) => {
      await page.route(LIST_RE, (route: Route) =>
        fulfillJson(route, twoItems(10, 11))
      );
      await inbox.goto();
      await expect(
        inbox.text(appBody("Loading test app 10"), { exact: true })
      ).toBeVisible({ timeout: 10_000 });
      await expect(inbox.skeletonTitleBars()).toHaveCount(0, {
        timeout: 5_000
      });
    });
  }
);
