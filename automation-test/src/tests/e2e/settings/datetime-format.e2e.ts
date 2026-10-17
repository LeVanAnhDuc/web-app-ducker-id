import { test, expect } from "@/fixtures";
import type { Page } from "@playwright/test";
import { FormattedTime } from "@/components/formatted-time.component";
import { AdminUsersPage } from "@/pages/admin/admin-users.page";
import { LoginHistoryPage } from "@/pages/dashboard/login-history.page";
import { NotificationsPage } from "@/pages/dashboard/notifications.page";
import {
  FIXED_INSTANT,
  collectConsole,
  fakeLoginHistoryItem,
  fakeNotification,
  pinAppLocale,
  serveLoginHistory,
  serveMyContacts,
  serveNotifications
} from "./helpers";

// Locale-aware time rendering. Test cases: test-cases/settings.md (Định dạng
// ngày giờ). Runs as the seeded `user` (default role) except the admin-table
// case, which takes `adminPage`.
//
//   • /login-history  — FormatTime variant="datetime" → <time datetime="ISO">
//   • /contacts/me    — FormatTime variant="dateLong"
//   • /notifications  — useFormatTime hook, relative variant → plain <span>
//   • /admin/users    — the same FormatTime component under admin auth
//
// Rows are served from page.route stubs (helpers.ts) so the rendering
// contract is asserted on known timestamps, not on whatever the seed holds.

/** Waits: the dev server compiles a route on its first hit. */
const LOAD = { timeout: 15_000 };
/** /login-history ("" = en) or /vi/login-history. */
const loginHistory = (page: Page, prefix = "") =>
  new LoginHistoryPage(page, undefined, prefix);
const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;

test(
  "A timestamp is a <time> element with ISO datetime and readable text",
  { tag: ["@TC-SETTINGS-001"] },
  async ({ formattedTime, page }) => {
    await serveLoginHistory(page, [fakeLoginHistoryItem(1)]);
    await loginHistory(page).goto();

    const timeEl = formattedTime.first();
    await expect(timeEl).toBeVisible(LOAD);

    // The datetime attribute is a valid ISO string.
    const datetimeAttr = await timeEl.getAttribute("datetime");
    expect(datetimeAttr).not.toBeNull();
    expect(datetimeAttr).toMatch(ISO);

    // The visible text is readable: not raw ISO, not "Invalid Date", not "—".
    const visibleText = (await timeEl.innerText()).trim();
    expect(visibleText).not.toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(visibleText).not.toBe("Invalid Date");
    expect(visibleText).not.toBe("—");
    expect(visibleText.length).toBeGreaterThan(0);
  }
);

test(
  "Vietnamese dates use the Vietnamese month form",
  { tag: ["@TC-SETTINGS-002"] },
  async ({ formattedTime, page }) => {
    await serveLoginHistory(page, [fakeLoginHistoryItem(2)]);
    await loginHistory(page, "/vi").goto();

    const timeEl = formattedTime.first();
    await expect(timeEl).toBeVisible(LOAD);

    // Vietnamese medium dateStyle abbreviates the month as "thg" (tháng).
    expect((await timeEl.innerText()).trim()).toContain("thg");
    expect(await timeEl.getAttribute("datetime")).toMatch(ISO);
  }
);

test(
  "The same instant renders differently per locale",
  { tag: ["@TC-SETTINGS-003"] },
  async ({ formattedTime, page }) => {
    // One stub for both navigations: only the locale changes.
    await serveLoginHistory(page, [fakeLoginHistoryItem(3)]);

    await loginHistory(page).goto();
    await expect(formattedTime.first()).toBeVisible(LOAD);
    const enText = (await formattedTime.first().innerText()).trim();

    await loginHistory(page, "/vi").goto();
    await expect(formattedTime.first()).toBeVisible(LOAD);
    const viText = (await formattedTime.first().innerText()).trim();

    expect(enText).not.toBe(viText);
  }
);

test(
  "Notifications show relative English times",
  { tag: ["@TC-SETTINGS-004"] },
  async ({ notificationsPage }) => {
    await notificationsPage.goto();
    await expect(notificationsPage.rows().first()).toBeVisible(LOAD);

    // The relative time is plain text inside the row (not a <time>).
    await expect(
      notificationsPage.text(/\b(ago|now|hour|minute|day|second)\b/i).first()
    ).toBeVisible();
    await expect(notificationsPage.isoTimestamps()).toHaveCount(0);
  }
);

test(
  "Notifications show relative Vietnamese times",
  { tag: ["@TC-SETTINGS-005"] },
  async ({ page }) => {
    const vi = new NotificationsPage(page, "vi");
    await vi.goto();
    await expect(vi.rows().first()).toBeVisible(LOAD);

    // date-fns vi locale suffixes relative times with "trước".
    await expect(vi.text(/trước/).first()).toBeVisible();
    // English "ago" must not bleed into the vi rendering.
    await expect(vi.text(/\bago\b/i)).toHaveCount(0);
  }
);

test.describe('Invalid values never show "Invalid Date"', () => {
  test(
    "valid rows render no Invalid Date",
    { tag: ["@TC-SETTINGS-006"] },
    async ({ formattedTime, page }) => {
      await serveLoginHistory(page, [
        fakeLoginHistoryItem(1),
        fakeLoginHistoryItem(2)
      ]);
      await loginHistory(page).goto();
      await expect(formattedTime.first()).toBeVisible(LOAD);
      await expect(formattedTime.invalidDate()).toHaveCount(0);
    }
  );

  test(
    "an unparseable createdAt renders the dash fallback",
    { tag: ["@TC-SETTINGS-006"] },
    async ({ formattedTime, page }) => {
      await serveLoginHistory(page, [
        fakeLoginHistoryItem(1, { createdAt: "not-a-date" })
      ]);
      await loginHistory(page).goto();
      await expect(formattedTime.fallbackCell()).toBeVisible(LOAD);
      await expect(formattedTime.invalidDate()).toHaveCount(0);
    }
  );
});

test.describe("Every timestamp cell carries a machine-readable datetime", () => {
  test(
    "en: every <time> has a datetime",
    { tag: ["@TC-SETTINGS-007"] },
    async ({ formattedTime, page }) => {
      const rows = 3;
      await serveLoginHistory(
        page,
        Array.from({ length: rows }, (_, i) => fakeLoginHistoryItem(i + 1)),
        rows
      );
      await loginHistory(page).goto();

      const timeEls = formattedTime.all();
      await expect(timeEls.first()).toBeVisible(LOAD);

      // At least one <time> per row (other components may add more).
      const count = await timeEls.count();
      expect(count).toBeGreaterThanOrEqual(rows);

      // null or empty = missing attribute → a11y failure.
      for (let i = 0; i < count; i++) {
        expect(await timeEls.nth(i).getAttribute("datetime")).toBeTruthy();
      }
    }
  );

  test(
    "vi: the datetime is still ISO",
    { tag: ["@TC-SETTINGS-007"] },
    async ({ formattedTime, page }) => {
      await serveLoginHistory(page, [fakeLoginHistoryItem(5)]);
      await loginHistory(page, "/vi").goto();

      const timeEl = formattedTime.first();
      await expect(timeEl).toBeVisible(LOAD);
      // The datetime is the raw ISO string whatever the locale.
      expect(await timeEl.getAttribute("datetime")).toMatch(ISO);
    }
  );
});

test(
  "First load hydrates without a mismatch warning",
  { tag: ["@TC-SETTINGS-009"] },
  async ({ formattedTime, page }) => {
    const messages = collectConsole(page, ["error", "warning"]);
    await serveLoginHistory(page, [fakeLoginHistoryItem(1)]);
    await loginHistory(page).goto();
    await expect(formattedTime.first()).toBeVisible(LOAD);
    expect(
      messages.filter((e) =>
        /did not match|Hydration failed|hydration/i.test(e)
      )
    ).toHaveLength(0);
  }
);

test(
  "Admin tables use the same format",
  { tag: ["@TC-SETTINGS-008"] },
  async ({ adminPage }) => {
    const times = new FormattedTime(adminPage);
    for (const prefix of ["", "/vi"]) {
      await new AdminUsersPage(adminPage, undefined, prefix).goto();
      const cell = times.inTable().first();
      await expect(cell).toBeVisible(LOAD);
      expect(await cell.getAttribute("datetime")).toMatch(ISO);
      const text = (await cell.innerText()).trim();
      expect(text).not.toMatch(/^\d{4}-\d{2}-\d{2}T/);
      if (prefix === "/vi") expect(text).toContain("thg");
    }
  }
);

test(
  "Notification times are <time> elements",
  { tag: ["@TC-SETTINGS-016"] },
  async ({ notificationsPage, formattedTime }) => {
    // NotificationItem renders useFormatTime output in a plain <span>, so
    // assistive tech gets no machine-readable datetime (follow-up flagged in
    // the locale-time-format feature, never done).
    // BUG: defects/settings.md#bug-settings-01
    test.fail();
    await notificationsPage.goto();
    const article = notificationsPage.rows().first();
    await expect(article).toBeVisible(LOAD);
    await expect(formattedTime.within(article).all()).toHaveCount(1, {
      timeout: 3_000
    });
  }
);

// ── BVA across midnight: one instant, two time zones → two calendar days.
const MIDNIGHT_UTC = "2026-01-01T00:00:00.000Z";
test.describe("Midnight UTC lands on the viewer's calendar day", () => {
  for (const { timezoneId, day } of [
    { timezoneId: "Asia/Ho_Chi_Minh", day: /Jan 1, 2026/ },
    { timezoneId: "America/New_York", day: /Dec 31, 2025/ }
  ]) {
    test.describe(`Time zone ${timezoneId}`, () => {
      test.use({ timezoneId, locale: "en-US" });

      test(
        "midnight UTC renders on the local calendar day",
        { tag: ["@TC-SETTINGS-015"] },
        async ({ formattedTime, page }) => {
          await serveLoginHistory(page, [
            fakeLoginHistoryItem(1, { createdAt: MIDNIGHT_UTC })
          ]);
          await loginHistory(page).goto();
          const cell = formattedTime.first();
          await expect(cell).toBeVisible(LOAD);
          expect(await cell.getAttribute("datetime")).toBe(MIDNIGHT_UTC);
          await expect(cell).toHaveText(day);
        }
      );
    });
  }
});

// ── The app's locale decides, not the browser's (design: hướng A).
test.describe("The app language decides the date format, not the browser's", () => {
  test.describe("browser vi-VN on the English page", () => {
    test.use({ locale: "vi-VN", timezoneId: "Asia/Ho_Chi_Minh" });

    test(
      "renders the English month",
      { tag: ["@TC-SETTINGS-034"] },
      async ({ formattedTime, page, baseURL }) => {
        // A vi-VN browser sends Accept-Language: vi-VN, and next-intl would
        // redirect /login-history to /vi — that detection is out of scope
        // (decisions Q7). Pinning the app locale keeps the English page while
        // navigator.language / the Intl default stay vi-VN.
        await pinAppLocale(page.context(), baseURL!, "en");
        await serveLoginHistory(page, [
          fakeLoginHistoryItem(1, { createdAt: FIXED_INSTANT })
        ]);
        await loginHistory(page).goto();
        await expect(formattedTime.first()).toBeVisible(LOAD);
        await expect(formattedTime.first()).toHaveText(/^Jun 29, 2026/);
      }
    );
  });

  test.describe("browser en-US on the Vietnamese page", () => {
    test.use({ locale: "en-US", timezoneId: "Asia/Ho_Chi_Minh" });

    test(
      "renders the Vietnamese month",
      { tag: ["@TC-SETTINGS-034"] },
      async ({ formattedTime, page }) => {
        await serveLoginHistory(page, [
          fakeLoginHistoryItem(1, { createdAt: FIXED_INSTANT })
        ]);
        await loginHistory(page, "/vi").goto();
        await expect(formattedTime.first()).toBeVisible(LOAD);
        await expect(formattedTime.first()).toContainText("29 thg 6, 2026");
      }
    );
  });
});

// ── Exact datetime style per locale at one known instant (08:04 UTC = 15:04
// in Ho Chi Minh City). ICU decides the order of date and time, so the vi case
// asserts the parts (decision Q4).
test.describe("The datetime format shows the locale's date and clock style", () => {
  test.use({ timezoneId: "Asia/Ho_Chi_Minh" });

  test(
    "en: medium date, 12-hour clock",
    { tag: ["@TC-SETTINGS-035"] },
    async ({ formattedTime, page }) => {
      await serveLoginHistory(page, [
        fakeLoginHistoryItem(1, { createdAt: FIXED_INSTANT })
      ]);
      await loginHistory(page).goto();
      await expect(formattedTime.first()).toBeVisible(LOAD);
      await expect(formattedTime.first()).toHaveText(
        /^Jun 29, 2026, 3:04\sPM$/
      );
    }
  );

  test(
    "vi: thg month, 24-hour clock",
    { tag: ["@TC-SETTINGS-035"] },
    async ({ formattedTime, page }) => {
      await serveLoginHistory(page, [
        fakeLoginHistoryItem(1, { createdAt: FIXED_INSTANT })
      ]);
      await loginHistory(page, "/vi").goto();
      const cell = formattedTime.first();
      await expect(cell).toBeVisible(LOAD);
      await expect(cell).toContainText("29 thg 6, 2026");
      await expect(cell).toContainText("15:04");
      await expect(cell).not.toHaveText(/\b(AM|PM|SA|CH)\b/);
    }
  );
});

test.describe("Relative notification times are localized at known ages", () => {
  for (const { locale, justNow, twoHours } of [
    {
      locale: "en" as const,
      justNow: "less than a minute ago",
      twoHours: "about 2 hours ago"
    },
    {
      locale: "vi" as const,
      justNow: "dưới 1 phút trước",
      twoHours: "khoảng 2 giờ trước"
    }
  ]) {
    test(
      `${locale}: under a minute and two hours`,
      { tag: ["@TC-SETTINGS-036"] },
      async ({ page, urls }) => {
        await serveNotifications(page, urls.apiPrefix, [
          fakeNotification("fake-n-1", 10),
          fakeNotification("fake-n-2", 2 * 3600)
        ]);
        const inbox = new NotificationsPage(page, locale);
        await inbox.goto();
        await expect(inbox.rows()).toHaveCount(2, LOAD);
        await expect(inbox.text(justNow, { exact: true })).toBeVisible();
        await expect(inbox.text(twoHours, { exact: true })).toBeVisible();
      }
    );
  }
});

test.describe("Long dates spell out the month in each locale", () => {
  test.use({ timezoneId: "Asia/Ho_Chi_Minh" });

  for (const { prefix, text } of [
    { prefix: "", text: "June 29, 2026" },
    { prefix: "/vi", text: "29 tháng 6, 2026" }
  ]) {
    test(
      `${prefix || "en"}: My Requests date column`,
      { tag: ["@TC-SETTINGS-037"] },
      async ({ formattedTime, page, urls }) => {
        await serveMyContacts(page, urls.apiPrefix, FIXED_INSTANT);
        await page.goto(`${prefix}/contacts/me`);
        const cell = formattedTime.inTable().first();
        await expect(cell).toBeVisible(LOAD);
        expect(await cell.getAttribute("datetime")).toBe(FIXED_INSTANT);
        await expect(cell).toHaveText(text);
      }
    );
  }
});
