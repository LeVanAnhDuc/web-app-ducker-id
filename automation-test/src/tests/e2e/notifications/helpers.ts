import type { Route } from "@playwright/test";
import { createApiClient } from "@/api";
import { newContext } from "@/api/base.client";
import type { NotificationItem } from "@/api/notifications.client";
import { dataOf, sessionOf } from "@/api/response";
import { USER } from "@/config/accounts";
import { API_PREFIX } from "@/config/urls";
import { copy } from "@/data/copy";
import { NOTIFICATIONS_HELPER_USER_AGENT } from "@/data/test-data";
import { formatIcu } from "@/utils/icu";
import {
  removeNonSeedNotifications,
  waitForSignInRecorded
} from "@/utils/notifications";

// Shared by the notifications e2e specs: request matchers and stubbed
// responses for page.route, the sentences rows render, and the seeded user's
// inbox as the real-data cases need it.

const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");
const N = `${escape(API_PREFIX)}/notifications`;

/** GET /notifications (the list, not its sub-routes). */
export const LIST_RE = new RegExp(`${N}(\\?|$)`);
export const UNREAD_COUNT_RE = new RegExp(`${N}/unread-count`);
export const READ_ALL_RE = new RegExp(`${N}/read-all`);
export const MARK_READ_RE = new RegExp(`${N}/[^/]+/read(\\?|$)`);

// ── rendered sentences ─────────────────────────────────────────────────────

/** The sentence an APP_AVAILABLE row renders, in `t`'s language. */
export const appBody = (
  appName: string,
  t: Pick<typeof copy, "notifications"> = copy
) => formatIcu(t.notifications.types.APP_AVAILABLE.body, { appName });

/** Body of a stubbed row (`fakeItem(i)`). */
export const fakeBody = (i: number) => appBody(`Intercepted app ${i}`);

// ── stubbed responses ──────────────────────────────────────────────────────

export const responseEnvelope = <T>(data: T) => ({
  timestamp: new Date().toISOString(),
  path: `${API_PREFIX}/notifications`,
  message: "OK",
  data
});

/** An APP_AVAILABLE row for "Intercepted app <i>", unread, i minutes old. */
export const fakeItem = (
  i: number,
  over: Partial<NotificationItem> = {}
): NotificationItem => ({
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

export const fulfillJson = (route: Route, data: unknown) =>
  route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify(responseEnvelope(data))
  });

/** Answers the list with `items` as one page (or none when empty). */
export const fulfillList =
  (items: NotificationItem[], totalPages = items.length ? 1 : 0) =>
  (route: Route) =>
    fulfillJson(route, {
      items,
      meta: { total: items.length, page: 1, limit: 20, totalPages }
    });

/** Answers 20 rows on page 1 and 5 on page 2 (25 in all). */
export const fulfillTwoPages = (route: Route) => {
  const isPage2 =
    new URL(route.request().url()).searchParams.get("page") === "2";
  const items = isPage2
    ? Array.from({ length: 5 }, (_, i) => fakeItem(i + 21))
    : Array.from({ length: 20 }, (_, i) => fakeItem(i + 1));
  return fulfillJson(route, {
    items,
    meta: { total: 25, page: isPage2 ? 2 : 1, limit: 20, totalPages: 2 }
  });
};

export const fulfillCount = (count: number) => (route: Route) =>
  fulfillJson(route, { count });

export const fail500 = (route: Route) =>
  route.fulfill({
    status: 500,
    contentType: "application/json",
    body: JSON.stringify({
      code: "INTERNAL",
      message: "boom",
      timestamp: new Date().toISOString(),
      path: `${API_PREFIX}/notifications`
    })
  });

// ── the seeded user's inbox (real backend) ─────────────────────────────────

/**
 * user@test.com's unread count straight from the API. Signs in with the
 * helper User-Agent, a device prepareSeededInbox() has already made known, so
 * the call itself adds no LOGIN_ANOMALY to the count it reads.
 */
export async function fetchUnreadCount(): Promise<number> {
  const ctx = await newContext({
    "Accept-Language": "en",
    "User-Agent": NOTIFICATIONS_HELPER_USER_AGENT
  });
  try {
    const api = createApiClient(ctx);
    const session = await sessionOf(
      await api.auth.login(USER.email, USER.password)
    );
    const res = await api.as(session).notifications.unreadCount();
    if (!res.ok()) throw new Error(`unread-count → ${res.status()}`);
    return (await dataOf<{ count: number }>(res)).count;
  } finally {
    await ctx.dispose();
  }
}

/**
 * Puts user@test.com's inbox back to the seed before a spec reads it: makes
 * the helper device known (and waits out the alert its first sign-in may
 * raise), then deletes every row other specs produced earlier in the run —
 * app announcements, access changes, sign-in alerts — which would otherwise
 * push the seed anchors off the first page (20 rows).
 */
export async function prepareSeededInbox(): Promise<void> {
  const since = new Date(Date.now() - 1_000);
  await fetchUnreadCount();
  await waitForSignInRecorded(
    USER.email,
    NOTIFICATIONS_HELPER_USER_AGENT,
    since
  );
  await removeNonSeedNotifications(USER.email);
}
