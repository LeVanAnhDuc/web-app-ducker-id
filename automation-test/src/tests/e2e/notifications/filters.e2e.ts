import { test, expect } from "@/fixtures";
import { copy } from "@/data/copy";
import { SEED_NOTIFICATIONS } from "@/data/test-data";
import { formatIcu } from "@/utils/icu";
import {
  LIST_RE,
  appBody,
  fakeItem,
  fulfillList,
  prepareSeededInbox
} from "./helpers";

// The All / Unread / Read tabs and the "Filter by type" chips of
// /notifications — client/src/views/Notifications. Role: user. The stubbed
// case proves the request the page sends; the real ones prove the seeded rows
// each filter keeps. Combinations of filters are proven at the API layer
// (tests/api/notifications/inbox.api.ts). Test cases:
// test-cases/notifications.md (TC-NOTIFICATIONS-020, 042, 043).

const { announce, tabs, categories, types } = copy.notifications;
const unreadBody = appBody(SEED_NOTIFICATIONS.unreadApp);
const readBody = appBody(SEED_NOTIFICATIONS.readApp);

test.beforeAll(async () => {
  await prepareSeededInbox();
});

test(
  "Tab and type chip combine into one request",
  { tag: "@TC-NOTIFICATIONS-042" },
  async ({ page, notificationsPage: inbox }) => {
    const seen: URLSearchParams[] = [];
    await page.route(LIST_RE, (route) => {
      seen.push(new URL(route.request().url()).searchParams);
      return fulfillList([fakeItem(1)])(route);
    });
    await inbox.goto();
    await expect.poll(() => seen.length).toBeGreaterThan(0);
    expect(seen[0].has("isRead")).toBe(false);
    expect(seen[0].has("category")).toBe(false);

    await inbox.tab("unread").click();
    await inbox.categoryChip("security").click();
    await expect
      .poll(() =>
        seen.some(
          (p) => p.get("isRead") === "false" && p.get("category") === "security"
        )
      )
      .toBe(true);
    await expect(inbox.chip("security", true)).toBeVisible();
    await expect(inbox.announcer()).toHaveText(
      formatIcu(announce.categoryChanged, { category: categories.security })
    );
  }
);

test(
  "The Security and Apps chips filter the real list",
  { tag: "@TC-NOTIFICATIONS-043" },
  async ({ notificationsPage: inbox }) => {
    await inbox.goto();
    await inbox.chip("security").click();
    await expect(inbox.text(types.LOGIN_ANOMALY.title).first()).toBeVisible();
    await expect(inbox.text(unreadBody)).toHaveCount(0);
    await inbox.chip("app").click();
    await expect(inbox.text(unreadBody)).toBeVisible();
    await expect(inbox.text(types.LOGIN_ANOMALY.title)).toHaveCount(0);
  }
);

test(
  "The Read tab holds only read rows",
  { tag: "@TC-NOTIFICATIONS-020" },
  async ({ notificationsPage: inbox }) => {
    await inbox.goto();
    await inbox.tab("read").click();
    await expect(inbox.text(readBody)).toBeVisible();
    await expect(inbox.text(unreadBody)).toHaveCount(0);
    await expect(inbox.announcer()).toHaveText(
      formatIcu(announce.tabChanged, { tab: tabs.read })
    );
  }
);
