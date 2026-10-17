import { test, expect } from "@/fixtures";
import { USER } from "@/config/accounts";
import { copy } from "@/data/copy";
import { SEED_NOTIFICATIONS } from "@/data/test-data";
import { markUnreadByAppName } from "@/utils/notifications";
import {
  LIST_RE,
  MARK_READ_RE,
  READ_ALL_RE,
  UNREAD_COUNT_RE,
  appBody,
  fail500,
  fakeBody,
  fakeItem,
  fetchUnreadCount,
  fulfillCount,
  fulfillJson,
  fulfillList,
  prepareSeededInbox
} from "./helpers";

// Marking read on /notifications: one row, all rows, opening a row, and the
// failure / double-click / no-op edges. Role: user (user@test.com).
// Test cases: test-cases/notifications.md.
//
// Two cases go through the real PATCH: TC-NOTIFICATIONS-010 marks Seed App 12
// and TC-NOTIFICATIONS-014 marks Seed App 14; afterAll puts both back to
// unread in the database (there is no mark-unread API). Every other case
// stubs the endpoints, so the seed stays untouched.

const seed = SEED_NOTIFICATIONS;
const markSingleBody = appBody(seed.markSingleApp);
const persistBody = appBody(seed.persistApp);

test.beforeAll(async () => {
  await prepareSeededInbox();
});

test.afterAll(async () => {
  await markUnreadByAppName(USER.email, [seed.markSingleApp, seed.persistApp]);
});

test.describe("real backend", () => {
  test(
    "Marking one read moves it out of Unread and lowers the count",
    { tag: ["@TC-NOTIFICATIONS-010", "@smoke"] },
    async ({ notificationsPage: inbox }) => {
      const before = await fetchUnreadCount();
      await inbox.goto();
      await inbox.tab("unread").click();
      await inbox.markReadButtonIn(markSingleBody).click();
      await expect
        .poll(() => fetchUnreadCount(), { timeout: 15_000 })
        .toBe(before - 1);
      await expect(inbox.text(markSingleBody)).toHaveCount(0);
    }
  );

  test(
    "A marked notification stays read after reload",
    { tag: "@TC-NOTIFICATIONS-014" },
    async ({ page, notificationsPage: inbox }) => {
      await inbox.goto();
      const row = inbox.row(persistBody);
      await inbox.markReadButtonIn(persistBody).click();
      await expect(row).toHaveAttribute("data-read", "true", {
        timeout: 15_000
      });
      await page.reload();
      await inbox.tab("unread").click();
      await expect(inbox.text(persistBody)).toHaveCount(0);
      await inbox.tab("read").click();
      await expect(inbox.text(persistBody)).toBeVisible();
    }
  );
});

test.describe("stubbed", () => {
  test(
    "Opening an unread row marks it read and follows its link",
    { tag: ["@TC-NOTIFICATIONS-045", "@smoke"] },
    async ({ page, notificationsPage: inbox }) => {
      let patched = false;
      await page.route(LIST_RE, fulfillList([fakeItem(7)]));
      await page.route(MARK_READ_RE, (route) => {
        patched = true;
        return fulfillJson(route, fakeItem(7, { isRead: true }));
      });
      await inbox.goto();
      await inbox.text(fakeBody(7)).click();
      await expect(page).toHaveURL(
        /\/apps\?search=Intercepted(\+|%20)app(\+|%20)7/
      );
      expect(patched).toBe(true);
    }
  );

  test(
    "Opening a read row does not mark it again",
    { tag: "@TC-NOTIFICATIONS-046" },
    async ({ page, notificationsPage: inbox }) => {
      let patches = 0;
      await page.route(LIST_RE, fulfillList([fakeItem(8, { isRead: true })]));
      await page.route(MARK_READ_RE, (route) => {
        patches += 1;
        return route.abort();
      });
      await inbox.goto();
      await inbox.text(fakeBody(8)).click();
      await expect(page).toHaveURL(/\/apps\?search=/);
      expect(patches).toBe(0);
    }
  );

  test(
    '"Not you?" on an unusual sign-in leads to the password form',
    { tag: "@TC-NOTIFICATIONS-047" },
    async ({ page, notificationsPage: inbox }) => {
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
        fulfillJson(route, fakeItem(9, { isRead: true }))
      );
      await inbox.goto();
      await inbox.notMeLink().click();
      await expect(page).toHaveURL(/\/profile$/);
    }
  );

  test(
    "Mark all empties the Unread tab",
    { tag: "@TC-NOTIFICATIONS-011" },
    async ({ page, notificationsPage: inbox }) => {
      let markedAll = false;
      await page.route(LIST_RE, (route) =>
        fulfillList(markedAll ? [] : [fakeItem(101), fakeItem(102)])(route)
      );
      await page.route(UNREAD_COUNT_RE, (route) =>
        fulfillCount(markedAll ? 0 : 2)(route)
      );
      await page.route(READ_ALL_RE, (route) => {
        markedAll = true;
        return fulfillJson(route, { updated: 2 });
      });
      await inbox.goto();
      await expect(inbox.text(fakeBody(101))).toBeVisible();
      await inbox.markAllButton().click();
      await expect(inbox.emptyText()).toBeVisible();
      await expect(inbox.notificationBell.badge(/^-?\d+$/)).toHaveCount(0);
    }
  );

  test(
    "Mark all with nothing unread is a no-op",
    { tag: "@TC-NOTIFICATIONS-012" },
    async ({ page, notificationsPage: inbox }) => {
      await page.route(LIST_RE, fulfillList([]));
      await page.route(UNREAD_COUNT_RE, fulfillCount(0));
      await page.route(READ_ALL_RE, (route) =>
        fulfillJson(route, { updated: 0 })
      );
      await inbox.goto();
      await expect(inbox.emptyText()).toBeVisible();
      await inbox.markAllButton().click();
      await expect(inbox.emptyText()).toBeVisible();
      await expect(inbox.notificationBell.badge(/^-?\d+$/)).toHaveCount(0);
    }
  );

  test(
    "A double click sends one PATCH",
    { tag: "@TC-NOTIFICATIONS-013" },
    async ({ page, notificationsPage: inbox }) => {
      let patchCount = 0;
      await page.route(LIST_RE, fulfillList([fakeItem(401)]));
      await page.route(MARK_READ_RE, async (route) => {
        patchCount += 1;
        // Hold the first PATCH so the button is still pending when the
        // second click lands (a route delay, not a test wait).
        await new Promise((resolve) => setTimeout(resolve, 600));
        await fulfillJson(route, fakeItem(401, { isRead: true }));
      });
      await inbox.goto();
      const button = inbox.markReadButtons().first();
      const firstPatchDone = page.waitForResponse(MARK_READ_RE);
      await button.click();
      await expect(button).toBeDisabled();
      await button.dispatchEvent("click");
      await expect.poll(() => patchCount, { timeout: 400 }).toBe(1);
      // A second PATCH could only come from the click dispatched while the
      // first was still pending (held 600ms by the route), so it would have
      // reached the route before the first one's response.
      await firstPatchDone;
      expect(patchCount).toBe(1);
    }
  );

  test(
    "A failed mark-read gets its own toast and leaves the item unread",
    { tag: "@TC-NOTIFICATIONS-022" },
    async ({ page, notificationsPage: inbox }) => {
      await page.route(LIST_RE, fulfillList([fakeItem(301)]));
      await page.route(MARK_READ_RE, fail500);
      await inbox.goto();
      await inbox.markReadButtons().first().click();
      await expect(
        inbox.toast.withText(copy.notifications.toast.markReadError)
      ).toBeVisible();
      // The generic 5xx toast (client/src/libs/query-client.ts) is suppressed.
      await expect(
        inbox.toast.withText("Server error. Please try again later.")
      ).toHaveCount(0);
      await expect(inbox.markReadButtons()).toHaveCount(1);
    }
  );
});
