import { test, expect } from "@/fixtures";
import { copy, copyVi } from "@/data/copy";
import { SEED_NOTIFICATIONS } from "@/data/test-data";
import { LoginPage } from "@/pages/auth/login.page";
import { NotificationsPage } from "@/pages/dashboard/notifications.page";
import { formatIcu } from "@/utils/icu";
import {
  LIST_RE,
  MARK_READ_RE,
  appBody,
  fakeBody,
  fakeItem,
  fail500,
  fulfillJson,
  fulfillList,
  fulfillTwoPages,
  prepareSeededInbox
} from "./helpers";

// The /notifications page: rendering of the seeded rows and of each template,
// link safety, empty / error / paging states, Vietnamese, day grouping and
// keyboard / screen-reader behaviour. Role: user (user@test.com).
// Test cases: test-cases/notifications.md. Filters: filters.e2e.ts; marking
// read: mark-read.e2e.ts; the header bell: header-panel.e2e.ts.
//
// Notifications carry no text: the API returns `type + params + link` and the
// client renders `notifications.types.<TYPE>` in the page locale, so the
// expected sentences are built from that catalogue (formatIcu).
//
// Real backend for the seeded rows; page.route stubs for every state the seed
// cannot produce (empty, error, two pages, unsafe link, unknown type,
// other countries, fixed dates).

const types = copy.notifications.types;
const seed = SEED_NOTIFICATIONS;

test.beforeAll(async () => {
  await prepareSeededInbox();
});

test.describe("seeded rows", () => {
  test(
    "All tab by default, seeded templates, grouped, relative times",
    { tag: ["@TC-NOTIFICATIONS-001", "@smoke"] },
    async ({ notificationsPage: inbox }) => {
      await inbox.goto();
      await expect(inbox.tab("all")).toHaveAttribute("data-state", "active");
      await expect(
        inbox.text(appBody(seed.unreadApp), { exact: true })
      ).toBeVisible();
      await expect(
        inbox.text(appBody(seed.readApp), { exact: true })
      ).toBeVisible();
      await expect(inbox.dayHeadings().first()).toBeVisible();
      await expect(inbox.isoTimestamps()).toHaveCount(0);
    }
  );

  test(
    "Each template is filled from its params",
    { tag: "@TC-NOTIFICATIONS-006" },
    async ({ notificationsPage: inbox }) => {
      await inbox.goto();
      // LOGIN_ANOMALY reason=device: browser + os, no country in the sentence.
      // A run-produced Chrome-on-Windows alert may render the same sentence.
      await expect(inbox.text(types.LOGIN_ANOMALY.title).first()).toBeVisible();
      await expect(
        inbox.text(formatIcu(types.LOGIN_ANOMALY.body, seed.anomaly)).first()
      ).toBeVisible();
      // PASSWORD_CHANGED: actor=admin and actor=self pick different sentences.
      await expect(
        inbox.text(formatIcu(types.PASSWORD_CHANGED.title, { actor: "admin" }))
      ).toBeVisible();
      await expect(
        inbox
          .text(formatIcu(types.PASSWORD_CHANGED.title, { actor: "self" }))
          .first()
      ).toBeVisible();
      // ACCOUNT_LOCKED interpolates the number.
      await expect(
        inbox.text(
          formatIcu(types.ACCOUNT_LOCKED.body, { minutes: seed.lockedMinutes })
        )
      ).toBeVisible();
      // No raw enum or key leaked.
      await expect(inbox.text(/LOGIN_ANOMALY|types\.|actor/)).toHaveCount(0);
    }
  );
});

test.describe("rendering", () => {
  test(
    "A new device and country names the country",
    { tag: "@TC-NOTIFICATIONS-039" },
    async ({ page, notificationsPage: inbox }) => {
      const params = {
        reason: "both",
        browser: "Firefox",
        os: "Linux",
        country: "JP"
      };
      await page.route(
        LIST_RE,
        fulfillList([
          fakeItem(1, {
            type: "LOGIN_ANOMALY",
            category: "security",
            params,
            link: "/login-history"
          })
        ])
      );
      await inbox.goto();
      await expect(
        inbox.text(
          formatIcu(types.LOGIN_ANOMALY.body, { ...params, country: "Japan" })
        )
      ).toBeVisible();
    }
  );

  test(
    "Unread rows can be marked; read rows cannot",
    { tag: "@TC-NOTIFICATIONS-005" },
    async ({ page, notificationsPage: inbox }) => {
      await page.route(
        LIST_RE,
        fulfillList([fakeItem(1), fakeItem(2, { isRead: true })])
      );
      await inbox.goto();
      await expect(inbox.rowsRead(false)).toHaveCount(1);
      await expect(inbox.rowsRead(true)).toHaveCount(1);
      await expect(inbox.markReadButtons()).toHaveCount(1);
    }
  );

  test(
    "An unknown type renders its name instead of crashing",
    { tag: "@TC-NOTIFICATIONS-018" },
    async ({ page, notificationsPage: inbox }) => {
      const errors: string[] = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await page.route(
        LIST_RE,
        fulfillList([
          fakeItem(1, { type: "FUTURE_TYPE", category: "system", params: {} })
        ])
      );
      await inbox.goto();
      await expect(inbox.text("FUTURE_TYPE")).toBeVisible();
      expect(errors).toEqual([]);
    }
  );

  test(
    "A guest is gated to the login screen",
    { tag: ["@TC-NOTIFICATIONS-002", "@smoke"] },
    async ({ guestPage }) => {
      const inbox = new NotificationsPage(guestPage);
      await inbox.goto();
      await expect(new LoginPage(guestPage).continueButton()).toBeVisible({
        timeout: 20_000
      });
      await expect(inbox.tab("all", { exact: false })).toHaveCount(0);
    }
  );
});

// Link safety: client/src/utils/notifications.ts isInternalLink — only a path
// inside this app becomes an anchor. `category=bogus` → 400 is proven at the
// API layer (TC-NOTIFICATIONS-038).
test.describe(
  "A link that is not an internal path renders no anchor",
  { tag: ["@TC-NOTIFICATIONS-040", "@smoke"] },
  () => {
    for (const [label, link] of [
      ["absolute URL", "https://evil.example/phish"],
      ["protocol-relative", "//evil.example"],
      ["backslash", "/\\evil.example"],
      ["javascript: URL", "javascript:alert(1)"]
    ] as const) {
      test(`${label} link`, async ({ page, notificationsPage: inbox }) => {
        await page.route(LIST_RE, fulfillList([fakeItem(1, { link })]));
        await inbox.goto();
        const article = inbox.rows().first();
        await expect(article.getByText(fakeBody(1))).toBeVisible();
        await expect(article.locator("a")).toHaveCount(0);
      });
    }
  }
);

test(
  "An internal link renders an anchor to that path",
  { tag: "@TC-NOTIFICATIONS-041" },
  async ({ page, notificationsPage: inbox }) => {
    await page.route(LIST_RE, fulfillList([fakeItem(1)]));
    await inbox.goto();
    await expect(
      inbox.rowLinks().filter({ hasText: fakeBody(1) })
    ).toHaveAttribute("href", "/apps?search=Intercepted%20app%201");
  }
);

test.describe("empty and paging", () => {
  test(
    "Empty state",
    { tag: "@TC-NOTIFICATIONS-003" },
    async ({ page, notificationsPage: inbox }) => {
      await page.route(LIST_RE, fulfillList([]));
      await inbox.goto();
      await expect(inbox.emptyTitle()).toBeVisible();
      await expect(inbox.emptyText()).toBeVisible();
    }
  );

  test(
    "Per-tab empty state on Read",
    { tag: "@TC-NOTIFICATIONS-017" },
    async ({ page, notificationsPage: inbox }) => {
      await page.route(LIST_RE, (route) => {
        const isRead = new URL(route.request().url()).searchParams.get(
          "isRead"
        );
        return fulfillList(isRead === "true" ? [] : [fakeItem(1)])(route);
      });
      await inbox.goto();
      await inbox.tab("read").click();
      await expect(inbox.tab("read")).toHaveAttribute("data-state", "active");
      await expect(inbox.emptyText()).toBeVisible();
    }
  );

  test(
    "Load more appends page 2 and disappears on the last page",
    { tag: "@TC-NOTIFICATIONS-004" },
    async ({ page, notificationsPage: inbox }) => {
      await page.route(LIST_RE, fulfillTwoPages);
      await inbox.goto();
      await expect(inbox.text(fakeBody(21))).toHaveCount(0);
      await inbox.loadMoreButton().click();
      await expect(inbox.text(fakeBody(21))).toBeVisible();
      await expect(inbox.loadMoreButton()).toHaveCount(0);
      await expect(inbox.announcer()).toHaveText(
        copy.notifications.announce.loadingMore
      );
    }
  );

  test(
    "Exactly one full page shows no Load more",
    { tag: "@TC-NOTIFICATIONS-019" },
    async ({ page, notificationsPage: inbox }) => {
      await page.route(
        LIST_RE,
        fulfillList(Array.from({ length: 20 }, (_, i) => fakeItem(i + 1)))
      );
      await inbox.goto();
      await expect(inbox.text(fakeBody(20))).toBeVisible();
      await expect(inbox.loadMoreButton()).toHaveCount(0);
    }
  );

  test(
    "A failing list shows the error state and Try again recovers",
    { tag: "@TC-NOTIFICATIONS-009" },
    async ({ page, notificationsPage: inbox }) => {
      let fail = true;
      await page.route(LIST_RE, (route) =>
        fail ? fail500(route) : fulfillList([fakeItem(1)])(route)
      );
      await inbox.goto();
      await expect(inbox.errorText()).toBeVisible({ timeout: 20_000 });
      fail = false;
      await inbox.retryButton().click();
      await expect(inbox.text(fakeBody(1))).toBeVisible();
    }
  );
});

test.describe("language", () => {
  test(
    "English chrome",
    { tag: "@TC-NOTIFICATIONS-007" },
    async ({ notificationsPage: inbox }) => {
      await inbox.goto();
      await expect(inbox.tab("all")).toBeVisible();
      await expect(inbox.tab("unread")).toBeVisible();
      await expect(inbox.tab("read")).toBeVisible();
      await expect(inbox.markAllButton()).toBeVisible();
      await expect(inbox.categoryGroup()).toBeVisible();
    }
  );

  test(
    "Vietnamese chrome and templates",
    { tag: "@TC-NOTIFICATIONS-008" },
    async ({ page }) => {
      const inbox = new NotificationsPage(page, "vi");
      await inbox.goto();
      await expect(inbox.tab("all")).toBeVisible();
      await expect(inbox.tab("unread")).toBeVisible();
      await expect(inbox.tab("read")).toBeVisible();
      await expect(inbox.markAllButton()).toBeVisible();
      await expect(inbox.text(appBody(seed.unreadApp, copyVi))).toBeVisible();
      await expect(
        inbox.text(copyVi.notifications.types.LOGIN_ANOMALY.title).first()
      ).toBeVisible();
      await expect(inbox.text(/is now in your launcher/)).toHaveCount(0);
    }
  );

  test(
    "Vietnamese relative times",
    { tag: "@TC-NOTIFICATIONS-021" },
    async ({ page }) => {
      const inbox = new NotificationsPage(page, "vi");
      await inbox.goto();
      await expect(inbox.text(appBody(seed.unreadApp, copyVi))).toBeVisible();
      // Relative times come from Intl in the page locale: "… trước", never "ago".
      await expect(inbox.text(/trước/).first()).toBeVisible();
      await expect(inbox.text(/\bago\b|is now in your launcher/)).toHaveCount(
        0
      );
    }
  );

  test(
    "Country names follow the reader's language",
    { tag: "@TC-NOTIFICATIONS-044" },
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
      const inbox = new NotificationsPage(page, "vi");
      await inbox.goto();
      await expect(inbox.text(/Việt Nam/)).toBeVisible();
    }
  );
});

test.describe("day groups", () => {
  test.use({ timezoneId: "Asia/Ho_Chi_Minh" });

  test(
    "Day groups switch at local midnight",
    { tag: "@TC-NOTIFICATIONS-027" },
    async ({ page, notificationsPage: inbox }) => {
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
      await inbox.goto();
      await expect(inbox.dayGroup("today")).toHaveCount(1);
      await expect(inbox.dayGroup("today")).toContainText(fakeBody(1));
      await expect(inbox.dayGroup("yesterday")).toHaveCount(2);
      await expect(inbox.dayGroup("earlier")).toHaveCount(1);
      await expect(inbox.dayGroup("earlier")).toContainText(fakeBody(4));
    }
  );
});

test.describe("accessibility", () => {
  test(
    "Tab, type filter and Load more are announced",
    { tag: "@TC-NOTIFICATIONS-023" },
    async ({ page, notificationsPage: inbox }) => {
      const { announce, tabs, categories } = copy.notifications;
      await page.route(LIST_RE, fulfillTwoPages);
      await inbox.goto();
      await inbox.tab("read").click();
      await expect(inbox.announcer()).toHaveText(
        formatIcu(announce.tabChanged, { tab: tabs.read })
      );
      await inbox.categoryChip("security").click();
      await expect(inbox.announcer()).toHaveText(
        formatIcu(announce.categoryChanged, { category: categories.security })
      );
      await inbox.loadMoreButton().click();
      await expect(inbox.announcer()).toHaveText(announce.loadingMore);
    }
  );

  test.describe(
    "Enter and Space activate Mark as read",
    { tag: "@TC-NOTIFICATIONS-024" },
    () => {
      for (const key of ["Enter", "Space"] as const) {
        test(`${key} on the focused button`, async ({
          page,
          notificationsPage: inbox
        }) => {
          let patchFired = false;
          await page.route(LIST_RE, fulfillList([fakeItem(501)]));
          await page.route(MARK_READ_RE, (route) => {
            patchFired = true;
            return fulfillJson(route, fakeItem(501, { isRead: true }));
          });
          await inbox.goto();
          const button = inbox.markReadButtons().first();
          await button.focus();
          await expect(button).toBeFocused();
          await page.keyboard.press(key);
          await expect.poll(() => patchFired, { timeout: 5_000 }).toBe(true);
        });
      }
    }
  );

  test(
    "Each row is an article named by its title; its link takes focus",
    { tag: "@TC-NOTIFICATIONS-025" },
    async ({ page, notificationsPage: inbox }) => {
      await page.route(LIST_RE, fulfillList([fakeItem(601)]));
      await inbox.goto();
      await expect(inbox.rowNamed(types.APP_AVAILABLE.title)).toBeVisible();
      const link = inbox.rowLinks().first();
      await link.focus();
      await expect(link).toBeFocused();
    }
  );

  test(
    "Type chips expose their pressed state",
    { tag: "@TC-NOTIFICATIONS-051" },
    async ({ page, notificationsPage: inbox }) => {
      await page.route(LIST_RE, fulfillList([fakeItem(1)]));
      await inbox.goto();
      await expect(inbox.categoryChip("all", true)).toBeVisible();
      await expect(inbox.categoryChip("security", false)).toBeVisible();
    }
  );
});
