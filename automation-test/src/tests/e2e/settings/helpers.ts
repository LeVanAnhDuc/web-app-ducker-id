import type { BrowserContext, Page } from "@playwright/test";
import {
  loginHistoryRoutes,
  type MyLoginHistoryItem
} from "@/api/login-history.client";
import { escapeRegExp } from "@/utils/regex";

// Stubbed list responses for the settings specs. FormatTime is a pure
// renderer, so each spec serves rows whose timestamps it knows instead of
// reading whatever the seed holds. The envelope mirrors the server's
// ResponsePattern ({ timestamp, path, message, data }); `data.meta` is what
// toPageMeta builds.

/** Sidebar labels of the removed Team page — no catalogue holds them anymore. */
export const REMOVED_TEAM_LABEL = { en: "Team", vi: "Nhóm" } as const;

/** One instant whose rendering every locale/time-zone case below pins down. */
export const FIXED_INSTANT = "2026-06-29T08:04:00.000Z";

const envelope = <T>(path: string, data: T) => ({
  timestamp: new Date().toISOString(),
  path,
  message: "OK",
  data
});

const page1 = (total: number, limit = 20) => ({
  total,
  page: 1,
  limit,
  totalPages: total === 0 ? 0 : 1
});

/** A synthetic login-history row created `hoursAgo` hours before now. */
export function fakeLoginHistoryItem(
  hoursAgo: number,
  overrides: Partial<Record<keyof MyLoginHistoryItem, unknown>> = {}
): Record<string, unknown> {
  return {
    _id: `fake-lh-${hoursAgo}`,
    createdAt: new Date(Date.now() - hoursAgo * 3600 * 1000).toISOString(),
    method: "EMAIL_PASSWORD",
    status: "success",
    deviceType: "Desktop",
    browser: "Chrome",
    ip: "1.2.3.4",
    city: "Hanoi",
    country: "VN",
    ...overrides
  };
}

/** Serves `items` for every GET /login-history the page makes (never /stats). */
export async function serveLoginHistory(
  page: Page,
  items: Record<string, unknown>[],
  limit = 20
): Promise<void> {
  await page.route(loginHistoryRoutes.list, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(
        envelope(loginHistoryRoutes.listPath, {
          items,
          meta: page1(items.length, limit)
        })
      )
    })
  );
}

/** A PASSWORD_CHANGED notification created `secondsAgo` seconds before now. */
export function fakeNotification(
  id: string,
  secondsAgo: number
): Record<string, unknown> {
  return {
    id,
    type: "PASSWORD_CHANGED",
    category: "security",
    params: { actor: "self" },
    link: null,
    isRead: true,
    readAt: null,
    createdAt: new Date(Date.now() - secondsAgo * 1000).toISOString()
  };
}

/**
 * Serves `items` for every GET /notifications (page and header panel alike);
 * `apiPrefix` is the client's (fixture `urls.apiPrefix`).
 */
export async function serveNotifications(
  page: Page,
  apiPrefix: string,
  items: Record<string, unknown>[]
): Promise<void> {
  const path = `${apiPrefix}/notifications`;
  await page.route(new RegExp(`${escapeRegExp(path)}(\\?|$)`), (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(envelope(path, { items, meta: page1(items.length) }))
    })
  );
}

/** Serves one support request created at `createdAt` for GET /contacts (My Requests). */
export async function serveMyContacts(
  page: Page,
  apiPrefix: string,
  createdAt: string
): Promise<void> {
  const path = `${apiPrefix}/contacts`;
  const item = {
    _id: "0123456789abcdef01234567",
    subject: "Locale date check",
    priority: "medium",
    status: "new",
    createdAt
  };
  await page.route(new RegExp(`${escapeRegExp(path)}(\\?|$)`), (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(
        envelope(path, { items: [item], meta: page1(1, 10) })
      )
    })
  );
}

/**
 * Pins next-intl's locale cookie, which its middleware reads before
 * Accept-Language, so a browser whose `locale` differs from the page under
 * test is not redirected to its own language's prefix.
 */
export async function pinAppLocale(
  context: BrowserContext,
  baseURL: string,
  locale: "en" | "vi"
): Promise<void> {
  await context.addCookies([
    { name: "NEXT_LOCALE", value: locale, url: baseURL }
  ]);
}

/** Collects console messages of the given types from now on. */
export function collectConsole(
  page: Page,
  types: string[] = ["error"]
): string[] {
  const messages: string[] = [];
  page.on("console", (m) => {
    if (types.includes(m.type())) messages.push(m.text());
  });
  return messages;
}
