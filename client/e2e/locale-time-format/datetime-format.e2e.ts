import { test, expect } from "@playwright/test";
import type { Route } from "@playwright/test";

// ---------------------------------------------------------------------------
// Locale-aware time rendering — datetime-format.e2e.ts
//
// This suite runs under the `chromium` project (regular logged-in USER auth,
// storageState = e2e/.auth/user.json). It covers user-accessible pages only:
//
//   • /login-history  — FormatTime variant="datetime" → <time datetime="ISO">
//   • /notifications  — useFormatTime hook, relative variant → plain <span>
//
// The FormatTime COMPONENT (used in LoginHistoryTableRow) is the primary
// subject for <time datetime> / ISO / i18n assertions because it is the
// single call-site that wraps rendered text in a <time> element. Admin-side
// call-sites (admin app/user tables, admin-login-history, entitlements, and
// contact pages) share the same component and are verified via the gate-B
// MCP walk under admin auth (see docs/specs/locale-time-format/e2e.md).
//
// The null-lastLoginAt → "—" path in the user profile header is also a
// gate-B MCP check (requires an account that has never logged in — not
// reproducible with the seeded user without resetting the seed).
// ---------------------------------------------------------------------------

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
  test("en: login-history timestamp cell is a <time> element with a valid ISO datetime attribute [Happy]", async ({
    page
  }) => {
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
  });

  // ── Scenario 2 (i18n, vi): same page under /vi prefix; datetime text
  // differs from en — specifically it contains "thg" (Vietnamese month
  // abbreviation produced by Intl.DateTimeFormat("vi", {dateStyle:"medium"})).
  // ────────────────────────────────────────────────────────────────────────
  test("vi: login-history timestamp uses Vietnamese date convention (contains 'thg') [i18n]", async ({
    page
  }) => {
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
  });

  // ── Scenario 2b (i18n, en vs vi text differs): load both locales with the
  // SAME createdAt ISO value and assert the rendered texts are NOT identical.
  // ──────────────────────────────────────────────────────────────────────────
  test("en and vi datetime texts differ for the same timestamp [i18n Decision Table]", async ({
    page
  }) => {
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
  });

  // ── Scenario 3 (relative timestamps, en): notifications page shows
  // relative-time text (e.g. "X minutes ago"). Note: the Notifications view
  // uses the useFormatTime hook — not the <FormatTime> component — so the
  // relative text renders in a plain <span>, NOT a <time> element. The
  // <time datetime> assertion applies to the login-history page (scenario 1).
  // ──────────────────────────────────────────────────────────────────────────
  test("en: notifications show relative-time text (no raw ISO) [data-render]", async ({
    page
  }) => {
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
  });

  // ── Scenario 3b (relative, vi): /vi/notifications renders Vietnamese
  // relative-time ("trước", "giờ trước", "phút trước", etc.) and does NOT
  // display the English "ago" suffix.
  // ──────────────────────────────────────────────────────────────────────────
  test("vi: notifications show Vietnamese relative-time ('trước') [i18n]", async ({
    page
  }) => {
    await page.goto("/vi/notifications");

    const articles = page.locator("article");
    await expect(articles.first()).toBeVisible({ timeout: 15_000 });

    // Vietnamese relative time uses "trước" suffix (date-fns vi locale).
    await expect(page.getByText(/trước/).first()).toBeVisible();

    // English "ago" must not bleed into vi locale rendering.
    await expect(page.getByText(/\bago\b/i)).toHaveCount(0);
  });

  // ── Scenario 4 (data-render guard): no "Invalid Date" string visible
  // anywhere on the login-history page. FormatTime returns "—" for
  // null/invalid, not "Invalid Date". ────────────────────────────────────────
  test("login-history page shows no 'Invalid Date' text [data-render guard]", async ({
    page
  }) => {
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
  });

  // ── Scenario 5 (a11y / semantic): FormatTime produces <time> elements with
  // a non-empty datetime attribute (ISO string). Verifies the semantic HTML
  // contract that lets AT announce the machine-readable date.
  // ──────────────────────────────────────────────────────────────────────────
  test("login-history: all datetime cells are <time> elements with a datetime attribute [a11y]", async ({
    page
  }) => {
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
  });

  // ── Scenario 5b (a11y / semantic, vi): same assertion in vi locale to
  // confirm the datetime attribute is language-agnostic (always ISO).
  // ──────────────────────────────────────────────────────────────────────────
  test("vi login-history: <time datetime> attribute is still an ISO string [a11y]", async ({
    page
  }) => {
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
  });
});
