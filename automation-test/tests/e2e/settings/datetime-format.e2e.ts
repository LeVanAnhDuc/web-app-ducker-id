import { test, expect } from "@fixtures";
import type { Route } from "@playwright/test";

// Locale-aware time rendering. Test cases: test-cases/settings.md
// (TC-SETTINGS-001 … TC-SETTINGS-016). Runs as the seeded `user` (default
// role) except the admin-table case, which takes `adminPage`.
//
//   • /login-history  — FormatTime variant="datetime" → <time datetime="ISO">
//   • /notifications  — useFormatTime hook, relative variant → plain <span>
//   • /admin/users    — the same FormatTime component under admin auth
//
// Login-history rows are served from a page.route intercept so the rendering
// contract is asserted on known timestamps, not on whatever the seed holds.

const LOGIN_HISTORY_API_RE = /\/api\/v1\/login-history(\?|$)/;

// Synthetic login-history item factory — mirrors the API shape.
// createdAt is a real ISO string so FormatTime renders a valid date.
const fakeLoginHistoryItem = (i: number) => ({
  _id: `fake-lh-${i}`,
  createdAt: new Date(Date.now() - i * 3600 * 1000).toISOString(), // i hours ago
  method: "EMAIL_PASSWORD",
  status: "success",
  deviceType: "Desktop",
  browser: "Chrome",
  ip: "1.2.3.4",
  city: "Hanoi",
  country: "VN"
});

const responseEnvelope = <T>(data: T) => ({
  timestamp: new Date().toISOString(),
  path: "/api/v1/login-history",
  message: "OK",
  data
});

test.describe("Locale-aware time rendering", () => {
  // ── Scenario 1 (Happy / data-render, en): FormatTime renders a <time>
  // element with a valid ISO datetime attribute; text is human-readable
  // (not raw ISO, not "Invalid Date"). ──────────────────────────────────────
  test(
    "en: login-history timestamp cell is a <time> element with a valid ISO datetime attribute [Happy]",
    { tag: ["@TC-SETTINGS-001"] },
    async ({ page }) => {
      // Drive the table with deterministic intercept data (avoids empty-seed
      // risk). One row is enough to assert the rendering contract.
      await page.route(LOGIN_HISTORY_API_RE, (route: Route) =>
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(
            responseEnvelope({
              items: [fakeLoginHistoryItem(1)],
              meta: { total: 1, page: 1, limit: 20, totalPages: 1 }
            })
          )
        })
      );

      await page.goto("/login-history");

      // Wait for at least one <time> element in the table (FormatTime output).
      const timeEl = page.locator("time[datetime]").first();
      await expect(timeEl).toBeVisible({ timeout: 15_000 });

      // 1a. The datetime attribute must be a valid ISO string.
      const datetimeAttr = await timeEl.getAttribute("datetime");
      expect(datetimeAttr).not.toBeNull();
      expect(datetimeAttr).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);

      // 1b. The visible text must NOT be a raw ISO string.
      const visibleText = (await timeEl.innerText()).trim();
      expect(visibleText).not.toMatch(/^\d{4}-\d{2}-\d{2}T/);

      // 1c. The visible text must NOT be "Invalid Date" (or the em-dash fallback "—").
      expect(visibleText).not.toBe("Invalid Date");
      expect(visibleText).not.toBe("—");

      // 1d. Text is non-empty.
      expect(visibleText.length).toBeGreaterThan(0);
    }
  );

  // ── Scenario 2 (i18n, vi): same page under /vi prefix; datetime text
  // differs from en — specifically it contains "thg" (Vietnamese month
  // abbreviation produced by Intl.DateTimeFormat("vi", {dateStyle:"medium"})).
  // ────────────────────────────────────────────────────────────────────────
  test(
    "vi: login-history timestamp uses Vietnamese date convention (contains 'thg') [i18n]",
    { tag: ["@TC-SETTINGS-002"] },
    async ({ page }) => {
      await page.route(LOGIN_HISTORY_API_RE, (route: Route) =>
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(
            responseEnvelope({
              items: [fakeLoginHistoryItem(2)],
              meta: { total: 1, page: 1, limit: 20, totalPages: 1 }
            })
          )
        })
      );

      await page.goto("/vi/login-history");

      const timeEl = page.locator("time[datetime]").first();
      await expect(timeEl).toBeVisible({ timeout: 15_000 });

      const visibleText = (await timeEl.innerText()).trim();

      // Vietnamese medium dateStyle uses "thg" (tháng = month abbreviation).
      // Example output: "1 thg 6, 2026, 15:04" — assert the marker is present.
      expect(visibleText).toContain("thg");

      // Sanity: datetime attribute is still a valid ISO string on the vi locale.
      const datetimeAttr = await timeEl.getAttribute("datetime");
      expect(datetimeAttr).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    }
  );

  // ── Scenario 2b (i18n, en vs vi text differs): load both locales with the
  // SAME createdAt ISO value and assert the rendered texts are NOT identical.
  // ──────────────────────────────────────────────────────────────────────────
  test(
    "en and vi datetime texts differ for the same timestamp [i18n Decision Table]",
    { tag: ["@TC-SETTINGS-003"] },
    async ({ page }) => {
      const sharedItem = fakeLoginHistoryItem(3);

      // Register the intercept once — it persists across navigations within the
      // same page context, so both the en and vi goto calls use the same handler.
      await page.route(LOGIN_HISTORY_API_RE, (route: Route) =>
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(
            responseEnvelope({
              items: [sharedItem],
              meta: { total: 1, page: 1, limit: 20, totalPages: 1 }
            })
          )
        })
      );

      await page.goto("/login-history");
      const enEl = page.locator("time[datetime]").first();
      await expect(enEl).toBeVisible({ timeout: 15_000 });
      const enText = (await enEl.innerText()).trim();

      // Navigate to the vi version — the same persistent route intercept serves
      // the same item so only the locale changes.
      await page.goto("/vi/login-history");
      const viEl = page.locator("time[datetime]").first();
      await expect(viEl).toBeVisible({ timeout: 15_000 });
      const viText = (await viEl.innerText()).trim();

      // The two locale texts must differ (en uses month names/abbreviations
      // different from vi "thg N" convention).
      expect(enText).not.toBe(viText);
    }
  );

  // ── Scenario 3 (relative timestamps, en): notifications page shows
  // relative-time text (e.g. "X minutes ago"). Note: the Notifications view
  // uses the useFormatTime hook — not the <FormatTime> component — so the
  // relative text renders in a plain <span>, NOT a <time> element. The
  // <time datetime> assertion applies to the login-history page (scenario 1).
  // ──────────────────────────────────────────────────────────────────────────
  test(
    "en: notifications show relative-time text (no raw ISO) [data-render]",
    { tag: ["@TC-SETTINGS-004"] },
    async ({ page }) => {
      await page.goto("/notifications");

      // At least one notification article must be visible.
      const articles = page.locator("article");
      await expect(articles.first()).toBeVisible({ timeout: 15_000 });

      // The relative timestamp is rendered as text inside a <span> (not <time>).
      // Assert at least one relative-time string is visible on the page.
      await expect(
        page.getByText(/\b(ago|now|hour|minute|day|second)\b/i).first()
      ).toBeVisible();

      // No raw ISO timestamp must leak into visible text.
      await expect(page.getByText(/\dT\d{2}:\d{2}/)).toHaveCount(0);
    }
  );

  // ── Scenario 3b (relative, vi): /vi/notifications renders Vietnamese
  // relative-time ("trước", "giờ trước", "phút trước", etc.) and does NOT
  // display the English "ago" suffix.
  // ──────────────────────────────────────────────────────────────────────────
  test(
    "vi: notifications show Vietnamese relative-time ('trước') [i18n]",
    { tag: ["@TC-SETTINGS-005"] },
    async ({ page }) => {
      await page.goto("/vi/notifications");

      const articles = page.locator("article");
      await expect(articles.first()).toBeVisible({ timeout: 15_000 });

      // Vietnamese relative time uses "trước" suffix (date-fns vi locale).
      await expect(page.getByText(/trước/).first()).toBeVisible();

      // English "ago" must not bleed into vi locale rendering.
      await expect(page.getByText(/\bago\b/i)).toHaveCount(0);
    }
  );

  // ── Scenario 4 (data-render guard): no "Invalid Date" string visible
  // anywhere on the login-history page. FormatTime returns "—" for
  // null/invalid, not "Invalid Date". ────────────────────────────────────────
  test(
    "login-history page shows no 'Invalid Date' text [data-render guard]",
    { tag: ["@TC-SETTINGS-006"] },
    async ({ page }) => {
      await page.route(LOGIN_HISTORY_API_RE, (route: Route) =>
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(
            responseEnvelope({
              items: [fakeLoginHistoryItem(1), fakeLoginHistoryItem(2)],
              meta: { total: 2, page: 1, limit: 20, totalPages: 1 }
            })
          )
        })
      );

      await page.goto("/login-history");
      await expect(page.locator("time[datetime]").first()).toBeVisible({
        timeout: 15_000
      });

      // "Invalid Date" must never leak into the DOM.
      await expect(page.getByText("Invalid Date")).toHaveCount(0);
    }
  );

  // ── Scenario 5 (a11y / semantic): FormatTime produces <time> elements with
  // a non-empty datetime attribute (ISO string). Verifies the semantic HTML
  // contract that lets AT announce the machine-readable date.
  // ──────────────────────────────────────────────────────────────────────────
  test(
    "login-history: all datetime cells are <time> elements with a datetime attribute [a11y]",
    { tag: ["@TC-SETTINGS-007"] },
    async ({ page }) => {
      const rows = 3;
      await page.route(LOGIN_HISTORY_API_RE, (route: Route) =>
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(
            responseEnvelope({
              items: Array.from({ length: rows }, (_, i) =>
                fakeLoginHistoryItem(i + 1)
              ),
              meta: { total: rows, page: 1, limit: rows, totalPages: 1 }
            })
          )
        })
      );

      await page.goto("/login-history");

      // All rows must render a <time datetime="..."> in the first cell.
      const timeEls = page.locator("time[datetime]");
      await expect(timeEls.first()).toBeVisible({ timeout: 15_000 });

      const count = await timeEls.count();
      // At least one <time> per row (there may be more on the page from other
      // components).
      expect(count).toBeGreaterThanOrEqual(rows);

      // Every <time> element found in the table must have a non-empty datetime.
      for (let i = 0; i < count; i++) {
        const attr = await timeEls.nth(i).getAttribute("datetime");
        // null or empty string = missing attribute → a11y failure.
        expect(attr).toBeTruthy();
      }
    }
  );

  // ── Scenario 5b (a11y / semantic, vi): same assertion in vi locale to
  // confirm the datetime attribute is language-agnostic (always ISO).
  // ──────────────────────────────────────────────────────────────────────────
  test(
    "vi login-history: <time datetime> attribute is still an ISO string [a11y]",
    { tag: ["@TC-SETTINGS-007"] },
    async ({ page }) => {
      await page.route(LOGIN_HISTORY_API_RE, (route: Route) =>
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(
            responseEnvelope({
              items: [fakeLoginHistoryItem(5)],
              meta: { total: 1, page: 1, limit: 20, totalPages: 1 }
            })
          )
        })
      );

      await page.goto("/vi/login-history");

      const timeEl = page.locator("time[datetime]").first();
      await expect(timeEl).toBeVisible({ timeout: 15_000 });

      const attr = await timeEl.getAttribute("datetime");
      // datetime must be the raw ISO string regardless of active locale.
      expect(attr).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    }
  );

  // ── An unparseable timestamp renders the "—" fallback, never "Invalid Date".
  test(
    "an unparseable createdAt renders the dash fallback [EP invalid]",
    { tag: ["@TC-SETTINGS-006"] },
    async ({ page }) => {
      await page.route(LOGIN_HISTORY_API_RE, (route: Route) =>
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(
            responseEnvelope({
              items: [{ ...fakeLoginHistoryItem(1), createdAt: "not-a-date" }],
              meta: { total: 1, page: 1, limit: 20, totalPages: 1 }
            })
          )
        })
      );
      await page.goto("/login-history");
      await expect(page.getByRole("cell", { name: "—" }).first()).toBeVisible({
        timeout: 15_000
      });
      await expect(page.getByText("Invalid Date")).toHaveCount(0);
    }
  );

  // ── First load hydrates without a text-mismatch warning (server renders in
  // UTC, the browser in its own zone; FormatTime suppresses the warning).
  test(
    "first load of /login-history logs no hydration mismatch [error guessing]",
    { tag: ["@TC-SETTINGS-009"] },
    async ({ page }) => {
      const errors: string[] = [];
      page.on("console", (m) => {
        if (m.type() === "error" || m.type() === "warning")
          errors.push(m.text());
      });
      await page.route(LOGIN_HISTORY_API_RE, (route: Route) =>
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(
            responseEnvelope({
              items: [fakeLoginHistoryItem(1)],
              meta: { total: 1, page: 1, limit: 20, totalPages: 1 }
            })
          )
        })
      );
      await page.goto("/login-history");
      await expect(page.locator("time[datetime]").first()).toBeVisible({
        timeout: 15_000
      });
      expect(
        errors.filter((e) =>
          /did not match|Hydration failed|hydration/i.test(e)
        )
      ).toHaveLength(0);
    }
  );

  // ── Admin tables use the same component under admin auth.
  test(
    "admin users table renders <time datetime> cells in both locales",
    { tag: ["@TC-SETTINGS-008"] },
    async ({ adminPage }) => {
      for (const prefix of ["", "/vi"]) {
        await adminPage.goto(`${prefix}/admin/users`);
        const cell = adminPage.locator("table time[datetime]").first();
        await expect(cell).toBeVisible({ timeout: 15_000 });
        expect(await cell.getAttribute("datetime")).toMatch(
          /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/
        );
        const text = (await cell.innerText()).trim();
        expect(text).not.toMatch(/^\d{4}-\d{2}-\d{2}T/);
        if (prefix === "/vi") expect(text).toContain("thg");
      }
    }
  );

  // ── Notifications wrap their relative time in a <time> element.
  test(
    "notification timestamps are machine-readable <time> elements [a11y]",
    { tag: ["@TC-SETTINGS-016"] },
    async ({ page }) => {
      // BUG: BUG-032 — NotificationItem renders useFormatTime output in a plain <span>,
      // so assistive tech gets no machine-readable datetime (follow-up flagged
      // in the locale-time-format feature, never fixed).
      test.fail();
      await page.goto("/notifications");
      const article = page.locator("article").first();
      await expect(article).toBeVisible({ timeout: 15_000 });
      await expect(article.locator("time[datetime]")).toHaveCount(1, {
        timeout: 3_000
      });
    }
  );
});

// ── BVA across midnight: one instant, two time zones → two calendar days.
const MIDNIGHT_UTC = "2026-01-01T00:00:00.000Z";
for (const { timezoneId, day } of [
  { timezoneId: "Asia/Ho_Chi_Minh", day: /Jan 1, 2026/ },
  { timezoneId: "America/New_York", day: /Dec 31, 2025/ }
]) {
  test.describe(`Time zone ${timezoneId}`, () => {
    test.use({ timezoneId, locale: "en-US" });

    test(
      `midnight UTC renders on the local calendar day [BVA]`,
      { tag: ["@TC-SETTINGS-015"] },
      async ({ page }) => {
        await page.route(LOGIN_HISTORY_API_RE, (route: Route) =>
          route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify(
              responseEnvelope({
                items: [
                  { ...fakeLoginHistoryItem(1), createdAt: MIDNIGHT_UTC }
                ],
                meta: { total: 1, page: 1, limit: 20, totalPages: 1 }
              })
            )
          })
        );
        await page.goto("/login-history");
        const cell = page.locator("time[datetime]").first();
        await expect(cell).toBeVisible({ timeout: 15_000 });
        expect(await cell.getAttribute("datetime")).toBe(MIDNIGHT_UTC);
        await expect(cell).toHaveText(day);
      }
    );
  });
}
