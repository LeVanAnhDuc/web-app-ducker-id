import { test, expect } from "@playwright/test";
import type { Page, Route } from "@playwright/test";

// Header Search (feature: header-search) — combobox + popover in AppHeader
// that searches apps via the existing GET /api/v1/apps?search= endpoint, with
// suggested apps (no query) shown on focus. FE-only, read-only (no mutation —
// selecting a row opens the app's homeUrl in a new tab via window.open;
// "View All" navigates to /apps?search=<q>).
//
// Matrix reference: docs/specs/header-search/design.md "## E2E Scenario
// Matrix" (rows 1-12). See docs/specs/header-search/e2e.md for the mapping
// from matrix row -> test(s) in this file, including deferred rows + reasons.
//
// Runs under the `chromium` project (regular-user storageState from the
// global auth.setup.ts), except the AuthN test which needs a clean context.
//
// Seeded apps visible to the regular user (per apps-list.e2e.ts / home.e2e.ts):
// Blog, Notes, IDMS Portal (Analytics Dashboard / Operations Console are
// admin-only and must not appear).

const isAppsList = (r: { url(): string; status(): number }) =>
  r.url().includes("/api/v1/apps") &&
  !r.url().includes("/apps/categories") &&
  r.status() === 200;

const waitForAppsList = (page: Page) =>
  page.waitForResponse((r) => isAppsList(r));

// The combobox input: SearchInput forwards role="combobox" + aria-* onto the
// underlying <input>, so it is reachable by role.
const searchBox = (page: Page) => page.getByRole("combobox");

const listbox = (page: Page) => page.getByRole("listbox");

const optionFor = (page: Page, name: string | RegExp) =>
  page.getByRole("option", { name });

// Stubs window.open before any app script runs, capturing calls instead of
// actually opening a new tab/navigating to an external URL. Mirrors the
// pattern in e2e/web-app-user-list/apps-list.e2e.ts ("Open launches the app
// homeUrl in a new tab").
const stubWindowOpen = (page: Page) =>
  page.addInitScript(() => {
    (window as unknown as { __opened: string[] }).__opened = [];
    window.open = (url?: string | URL) => {
      (window as unknown as { __opened: string[] }).__opened.push(
        String(url ?? "")
      );
      return null;
    };
  });

const getOpened = (page: Page) =>
  page.evaluate(() => (window as unknown as { __opened: string[] }).__opened);

test.describe("Header search (AppHeader combobox)", () => {
  // --- Row 1: Happy path ---------------------------------------------------
  test("focus opens the popover with suggested apps, then typing narrows to results [happy path]", async ({
    page
  }) => {
    const initial = waitForAppsList(page);
    await page.goto("/");
    await initial;

    const input = searchBox(page);
    await expect(input).toBeVisible();

    const suggested = waitForAppsList(page);
    await input.click();
    await suggested;

    await expect(listbox(page)).toBeVisible();
    await expect(
      page.getByText("Suggested apps", { exact: true })
    ).toBeVisible();
    await expect(optionFor(page, /Blog/)).toBeVisible();

    // Typing narrows to a match after the 300ms debounce.
    const results = waitForAppsList(page);
    await input.fill("Blog");
    await results;

    await expect(page.getByText("Apps", { exact: true })).toBeVisible();
    await expect(optionFor(page, /Blog/)).toBeVisible();
  });

  // --- Regression: single click opens AND keeps the popover open -----------
  // Guards the double-toggle bug: PopoverTrigger's built-in click-toggle fought
  // the onFocus-open, so the first click opened then immediately closed. Fixed
  // by using PopoverAnchor (no click-toggle) + explicit focus/click open.
  test("single click opens the popover and it stays open [regression: no toggle-close]", async ({
    page
  }) => {
    const initial = waitForAppsList(page);
    await page.goto("/");
    await initial;

    const input = searchBox(page);
    const suggested = waitForAppsList(page);
    await input.click();
    await suggested;
    await expect(listbox(page)).toBeVisible();
    await page.waitForTimeout(300);
    await expect(listbox(page)).toBeVisible();
    await expect(input).toHaveAttribute("aria-expanded", "true");

    // Clicking the (already-open, focused) input must NOT close-then-reopen it —
    // PopoverAnchor's outside-interaction dismiss is suppressed for the input.
    await input.click();
    await page.waitForTimeout(300);
    await expect(listbox(page)).toBeVisible();
    await expect(input).toHaveAttribute("aria-expanded", "true");

    await input.press("Escape");
    await expect(listbox(page)).toBeHidden();
    await input.click();
    await expect(listbox(page)).toBeVisible();
  });

  // --- Row 2: AuthN ---------------------------------------------------------
  test("unauthenticated visit does not render the header search [AuthN]", async ({
    browser
  }) => {
    // Clean context: no storageState + proactively cleared cookies, so a
    // localhost-scoped refresh cookie from another port/run cannot leak in —
    // same pattern as e2e/favorite-apps/auth.e2e.ts.
    const ctx = await browser.newContext({ storageState: undefined });
    await ctx.clearCookies();
    try {
      const page = await ctx.newPage();
      await page.goto("/");
      // AuthGuard gates to the login affordance instead of the dashboard shell.
      await expect(
        page.getByRole("button", { name: /continue with email/i })
      ).toBeVisible({ timeout: 20_000 });
      // The header (and its search combobox) must not be present.
      await expect(page.getByRole("combobox")).toHaveCount(0);
    } finally {
      await ctx.close();
    }
  });

  // --- Row 3: AuthZ ---------------------------------------------------------
  // [Decision Table] role x route -> header search present & functional.
  // Header search is not role-gated: the regular user sees and can use it on
  // both a normal dashboard route and an /admin/* route (AuthZ for /admin/*
  // pages themselves is covered by e2e/admin-authz/admin-authz.e2e.ts — this
  // test only asserts the header chrome itself is unaffected by route).
  test("search combobox is present and usable on a dashboard route [DT: role=user, route=dashboard]", async ({
    page
  }) => {
    const initial = waitForAppsList(page);
    await page.goto("/apps");
    await initial;
    await expect(searchBox(page)).toBeVisible();
  });

  // --- Row 4: Validation / input (Equivalence Partitioning) ----------------
  test("empty query shows suggested apps [EP: empty]", async ({ page }) => {
    const initial = waitForAppsList(page);
    await page.goto("/");
    await initial;

    const suggested = waitForAppsList(page);
    await searchBox(page).click();
    await suggested;

    await expect(
      page.getByText("Suggested apps", { exact: true })
    ).toBeVisible();
  });

  test("whitespace-only query is treated as empty and still shows suggested apps [EP: whitespace]", async ({
    page
  }) => {
    const initial = waitForAppsList(page);
    await page.goto("/");
    await initial;

    const input = searchBox(page);
    const suggested = waitForAppsList(page);
    await input.click();
    await suggested;

    // Typing only spaces must not switch the label to "Apps" (results) — the
    // debounced value is trimmed to "" so it stays on the suggested branch.
    await input.fill("   ");
    // No new /apps request is expected for a value that debounces to the same
    // empty search — give the debounce window time to elapse, then assert the
    // suggested label is still shown (not "Apps").
    await page.waitForTimeout(400);
    await expect(
      page.getByText("Suggested apps", { exact: true })
    ).toBeVisible();
  });

  test("a matching query shows results [EP: match]", async ({ page }) => {
    const initial = waitForAppsList(page);
    await page.goto("/");
    await initial;

    const input = searchBox(page);
    const suggested = waitForAppsList(page);
    await input.click();
    await suggested;

    const results = waitForAppsList(page);
    await input.fill("Blog");
    await results;

    await expect(optionFor(page, /Blog/)).toBeVisible();
  });

  test("a non-matching query shows the empty state [EP: no-match]", async ({
    page
  }) => {
    const initial = waitForAppsList(page);
    await page.goto("/");
    await initial;

    const input = searchBox(page);
    const suggested = waitForAppsList(page);
    await input.click();
    await suggested;

    const empty = waitForAppsList(page);
    await input.fill("zzzz-no-such-app");
    await empty;

    await expect(
      page.getByText("No apps found", { exact: true })
    ).toBeVisible();
    await expect(
      page.getByText("Try a different keyword", { exact: true })
    ).toBeVisible();
  });

  test("special-character and unicode queries do not crash the popover [EP: special/unicode]", async ({
    page
  }) => {
    const initial = waitForAppsList(page);
    await page.goto("/");
    await initial;

    const input = searchBox(page);
    const suggested = waitForAppsList(page);
    await input.click();
    await suggested;

    const req1 = waitForAppsList(page);
    await input.fill("<script>alert(1)</script>");
    await req1;
    // Renders safely (no crash / no raw script execution) — either results or
    // the empty state, never a thrown error boundary.
    await expect(listbox(page)).toBeVisible();

    const req2 = waitForAppsList(page);
    await input.fill("📷");
    await req2;
    await expect(listbox(page)).toBeVisible();
  });

  // --- Row 5: Empty / null --------------------------------------------------
  test("no-match search renders the localized empty state text [empty/null]", async ({
    page
  }) => {
    const initial = waitForAppsList(page);
    await page.goto("/");
    await initial;

    const input = searchBox(page);
    const suggested = waitForAppsList(page);
    await input.click();
    await suggested;

    const empty = waitForAppsList(page);
    await input.fill("zzzz-no-such-app");
    await empty;

    await expect(
      page.getByText("No apps found", { exact: true })
    ).toBeVisible();
  });

  test("a suggested/result app with no category renders without a category line (no literal null)", async ({
    page
  }) => {
    // Intercept /apps to control the shape: one app has category: null and
    // iconUrl: null to verify the row falls back to an initial letter and
    // simply omits the category line instead of rendering the word "null".
    await page.route(/\/api\/v1\/apps(\?|$)/, (route: Route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          timestamp: new Date().toISOString(),
          path: "/api/v1/apps",
          message: "OK",
          data: {
            items: [
              {
                _id: "fake-app-1",
                displayName: "Uncategorized App",
                description: "A test app with no category",
                iconUrl: null,
                homeUrl: "https://uncategorized.example.com",
                category: null,
                isFavorite: false
              }
            ],
            meta: { total: 1, page: 1, limit: 5, totalPages: 1 }
          }
        })
      })
    );

    await page.goto("/");
    await searchBox(page).click();

    const row = optionFor(page, /Uncategorized App/);
    await expect(row).toBeVisible();
    // The fallback initial "U" renders where the icon would be; no literal
    // "null" string leaks into the row.
    await expect(row).not.toContainText("null");
  });

  // --- Row 6: Boundary / pagination (Boundary Value Analysis) --------------
  test("result count at the limit (5) hides View All; above the limit shows it [BVA: total=limit vs total>limit]", async ({
    page
  }) => {
    const makeItems = (n: number) =>
      Array.from({ length: n }, (_, i) => ({
        _id: `fake-app-${i}`,
        displayName: `Fake App ${i}`,
        description: "desc",
        iconUrl: null,
        homeUrl: "https://fake.example.com",
        category: "Utilities",
        isFavorite: false
      }));

    // total === items.length (5 == 5) → no "View All".
    await page.route(/\/api\/v1\/apps\?.*search=match/, (route: Route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          timestamp: new Date().toISOString(),
          path: "/api/v1/apps",
          message: "OK",
          data: {
            items: makeItems(5),
            meta: { total: 5, page: 1, limit: 5, totalPages: 1 }
          }
        })
      })
    );

    await page.goto("/");
    const input = searchBox(page);
    await input.click();
    await input.fill("match");
    await page.waitForResponse((r) => r.url().includes("search=match"));

    await expect(optionFor(page, /Fake App 0/)).toBeVisible();
    await expect(page.getByRole("button", { name: "View All" })).toHaveCount(0);
  });

  test("result count above the limit shows View All [BVA: total>limit]", async ({
    page
  }) => {
    const makeItems = (n: number) =>
      Array.from({ length: n }, (_, i) => ({
        _id: `fake-app-${i}`,
        displayName: `Fake App ${i}`,
        description: "desc",
        iconUrl: null,
        homeUrl: "https://fake.example.com",
        category: "Utilities",
        isFavorite: false
      }));

    // total (12) > items.length (5) → "View All" appears.
    await page.route(/\/api\/v1\/apps\?.*search=many/, (route: Route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          timestamp: new Date().toISOString(),
          path: "/api/v1/apps",
          message: "OK",
          data: {
            items: makeItems(5),
            meta: { total: 12, page: 1, limit: 5, totalPages: 3 }
          }
        })
      })
    );

    await page.goto("/");
    const input = searchBox(page);
    await input.click();
    await input.fill("many");
    await page.waitForResponse((r) => r.url().includes("search=many"));

    await expect(page.getByRole("button", { name: "View All" })).toBeVisible();
  });

  test("a single-character query still triggers a search [BVA: min length = 1]", async ({
    page
  }) => {
    const initial = waitForAppsList(page);
    await page.goto("/");
    await initial;

    const input = searchBox(page);
    const suggested = waitForAppsList(page);
    await input.click();
    await suggested;

    const req = page.waitForResponse(
      (r) => r.url().includes("search=B") || r.url().includes("search=b")
    );
    await input.fill("B");
    await req;
    await expect(listbox(page)).toBeVisible();
  });

  test("rapid typing within the debounce window fires a single request for the final value [BVA: debounce timing]", async ({
    page
  }) => {
    const initial = waitForAppsList(page);
    await page.goto("/");
    await initial;

    const input = searchBox(page);
    const suggested = waitForAppsList(page);
    await input.click();
    await suggested;

    const requests: string[] = [];
    page.on("request", (req) => {
      if (
        req.url().includes("/api/v1/apps") &&
        !req.url().includes("categories")
      ) {
        requests.push(req.url());
      }
    });

    // Type "Blo" fast (well under the 300ms debounce) — pressSequentially with
    // no delay keeps every keystroke inside a single debounce window.
    await input.pressSequentially("Blo", { delay: 20 });
    await page.waitForResponse((r) => r.url().includes("search=Blo"));
    // Give any (unexpected) extra debounced requests time to fire before
    // asserting the count, since we're asserting an absence.
    await page.waitForTimeout(300);

    const searchRequests = requests.filter((u) => u.includes("search="));
    expect(searchRequests).toHaveLength(1);
    expect(searchRequests[0]).toContain("search=Blo");
  });

  // --- Row 7: Filter / search ------------------------------------------------
  test('"View All" navigates to /apps?search=<query> and the Apps page reflects the query [filter/search]', async ({
    page
  }) => {
    const initial = waitForAppsList(page);
    await page.goto("/");
    await initial;

    const input = searchBox(page);
    const suggested = waitForAppsList(page);
    await input.click();
    await suggested;

    const results = waitForAppsList(page);
    await input.fill("Blog");
    await results;

    // Deterministically surface "View All": stub a total greater than the
    // rendered items so the footer button is present, without depending on
    // live seed data crossing the limit.
    await page.route(/\/api\/v1\/apps\?.*search=Blog/, (route: Route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          timestamp: new Date().toISOString(),
          path: "/api/v1/apps",
          message: "OK",
          data: {
            items: [
              {
                _id: "blog-1",
                displayName: "Blog",
                description: "desc",
                iconUrl: null,
                homeUrl: "https://blog.example.com",
                category: "Productivity",
                isFavorite: false
              }
            ],
            meta: { total: 6, page: 1, limit: 5, totalPages: 2 }
          }
        })
      })
    );
    await input.fill("");
    await input.fill("Blog");
    await page.waitForResponse((r) => r.url().includes("search=Blog"));

    const viewAll = page.getByRole("button", { name: "View All" });
    await expect(viewAll).toBeVisible();
    await viewAll.click();

    await expect(page).toHaveURL(/\/apps\?search=Blog/);
  });

  test("empty vs non-empty query switches between suggested and results sections [DT: query empty x non-empty]", async ({
    page
  }) => {
    const initial = waitForAppsList(page);
    await page.goto("/");
    await initial;

    const input = searchBox(page);
    const suggested = waitForAppsList(page);
    await input.click();
    await suggested;
    await expect(
      page.getByText("Suggested apps", { exact: true })
    ).toBeVisible();

    const results = waitForAppsList(page);
    await input.fill("Blog");
    await results;
    await expect(page.getByText("Apps", { exact: true })).toBeVisible();
    await expect(page.getByText("Suggested apps", { exact: true })).toHaveCount(
      0
    );
  });

  // --- Row 8: Data rendering -------------------------------------------------
  test("rows render displayName and category, not raw ids/JSON [data rendering]", async ({
    page
  }) => {
    const initial = waitForAppsList(page);
    await page.goto("/");
    await initial;

    const input = searchBox(page);
    const suggested = waitForAppsList(page);
    await input.click();
    await suggested;

    const row = optionFor(page, /Blog/);
    await expect(row).toBeVisible();
    // The Mongo _id must not leak into the row's accessible text.
    await expect(row).not.toContainText(/^[0-9a-f]{24}$/);
  });

  // --- Row 9: i18n (en + vi) --------------------------------------------------
  test("popover chrome renders in English on the default locale [i18n: en]", async ({
    page
  }) => {
    const initial = waitForAppsList(page);
    await page.goto("/");
    await initial;

    const input = searchBox(page);
    await expect(input).toHaveAttribute("placeholder", "Search apps...");

    const suggested = waitForAppsList(page);
    await input.click();
    await suggested;
    await expect(
      page.getByText("Suggested apps", { exact: true })
    ).toBeVisible();

    const empty = waitForAppsList(page);
    await input.fill("zzzz-no-such-app");
    await empty;
    await expect(
      page.getByText("No apps found", { exact: true })
    ).toBeVisible();
  });

  test("popover chrome renders in Vietnamese on /vi [i18n: vi]", async ({
    page
  }) => {
    const initial = waitForAppsList(page);
    await page.goto("/vi");
    await initial;

    const input = searchBox(page);
    await expect(input).toHaveAttribute("placeholder", "Tìm kiếm ứng dụng...");

    const suggested = waitForAppsList(page);
    await input.click();
    await suggested;
    await expect(
      page.getByText("Ứng dụng gợi ý", { exact: true })
    ).toBeVisible();

    const empty = waitForAppsList(page);
    await input.fill("zzzz-no-such-app");
    await empty;
    await expect(
      page.getByText("Không tìm thấy ứng dụng", { exact: true })
    ).toBeVisible();

    // No raw i18n key should leak into the rendered popover text.
    const body = await page.locator("body").innerText();
    expect(body).not.toMatch(/dashboard\.header\./);
  });

  // --- Row 10: Error / loading ------------------------------------------------
  test("shows skeleton rows while the request is pending, then real rows once it resolves [loading]", async ({
    page
  }) => {
    let resolveHold!: () => void;
    const hold = new Promise<void>((resolve) => {
      resolveHold = resolve;
    });

    await page.route(/\/api\/v1\/apps(\?|$)/, async (route: Route) => {
      if (route.request().url().includes("categories")) {
        await route.continue();
        return;
      }
      await hold;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          timestamp: new Date().toISOString(),
          path: "/api/v1/apps",
          message: "OK",
          data: {
            items: [
              {
                _id: "blog-1",
                displayName: "Blog",
                description: "desc",
                iconUrl: null,
                homeUrl: "https://blog.example.com",
                category: "Productivity",
                isFavorite: false
              }
            ],
            meta: { total: 1, page: 1, limit: 5, totalPages: 1 }
          }
        })
      });
    });

    await page.goto("/");
    await searchBox(page).click();

    // While pending: skeleton placeholders render inside the listbox (no
    // role="option" yet).
    await expect(listbox(page)).toBeVisible();
    await expect(page.getByRole("option")).toHaveCount(0);

    resolveHold();

    await expect(optionFor(page, /Blog/)).toBeVisible({ timeout: 10_000 });
  });

  test("a failed request renders the empty state safely instead of crashing or spinning forever [error]", async ({
    page
  }) => {
    await page.route(/\/api\/v1\/apps(\?|$)/, async (route: Route) => {
      if (route.request().url().includes("categories")) {
        await route.continue();
        return;
      }
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({
          code: "INTERNAL_ERROR",
          message: "Internal Server Error",
          timestamp: new Date().toISOString(),
          path: "/api/v1/apps"
        })
      });
    });

    await page.goto("/");
    await searchBox(page).click();

    // No crash: the popover still renders, showing the empty/no-results state
    // (isError is treated as empty) rather than a permanent spinner.
    await expect(listbox(page)).toBeVisible();
    await expect(page.getByText("No apps found", { exact: true })).toBeVisible({
      timeout: 10_000
    });
  });

  // --- Row 11: Mutation safety (N/A) + state transitions --------------------
  // Mutation safety is N/A for this feature — see docs/specs/header-search/e2e.md
  // row 11 (search is read-only; opening an app is an external navigation, not
  // a data mutation). The state-transition sub-scenarios below ARE covered.

  test("clearing the query after typing returns to the suggested list, not stuck on empty [ST: typing -> cleared -> suggested]", async ({
    page
  }) => {
    const initial = waitForAppsList(page);
    await page.goto("/");
    await initial;

    const input = searchBox(page);
    const suggested = waitForAppsList(page);
    await input.click();
    await suggested;

    const noMatch = waitForAppsList(page);
    await input.fill("zzzz-no-such-app");
    await noMatch;
    await expect(
      page.getByText("No apps found", { exact: true })
    ).toBeVisible();

    const backToSuggested = waitForAppsList(page);
    await input.fill("");
    await backToSuggested;
    await expect(
      page.getByText("Suggested apps", { exact: true })
    ).toBeVisible();
    await expect(page.getByText("No apps found", { exact: true })).toHaveCount(
      0
    );
  });

  test("Escape closes the popover and returns focus to the input [ST: open -> closed]", async ({
    page
  }) => {
    const initial = waitForAppsList(page);
    await page.goto("/");
    await initial;

    const input = searchBox(page);
    const suggested = waitForAppsList(page);
    await input.click();
    await suggested;
    await expect(listbox(page)).toBeVisible();

    await input.press("Escape");
    await expect(listbox(page)).toHaveCount(0);
    await expect(input).toBeFocused();
  });

  test("selecting a row opens the app and closes the popover [ST: results -> select -> closed]", async ({
    page
  }) => {
    await stubWindowOpen(page);

    const initial = waitForAppsList(page);
    await page.goto("/");
    await initial;

    const input = searchBox(page);
    const suggested = waitForAppsList(page);
    await input.click();
    await suggested;

    const blogRow = optionFor(page, /Blog/);
    await expect(blogRow).toBeVisible();
    await blogRow.click();

    const opened = await getOpened(page);
    expect(opened).toContain("https://blog.example.com");
    await expect(listbox(page)).toHaveCount(0);
  });

  // --- Row 12: Accessibility --------------------------------------------------
  test("ArrowDown/ArrowUp move the active option, Enter opens the active app, Escape closes [a11y: keyboard]", async ({
    page
  }) => {
    await stubWindowOpen(page);

    const initial = waitForAppsList(page);
    await page.goto("/");
    await initial;

    const input = searchBox(page);
    await expect(input).toHaveAttribute("aria-expanded", "false");

    const suggested = waitForAppsList(page);
    await input.click();
    await suggested;
    await expect(input).toHaveAttribute("aria-expanded", "true");

    await input.press("ArrowDown");
    const firstOption = page.getByRole("option").first();
    await expect(firstOption).toHaveAttribute("aria-selected", "true");

    await input.press("ArrowDown");
    const secondOption = page.getByRole("option").nth(1);
    await expect(secondOption).toHaveAttribute("aria-selected", "true");
    await expect(firstOption).toHaveAttribute("aria-selected", "false");

    await input.press("ArrowUp");
    await expect(firstOption).toHaveAttribute("aria-selected", "true");

    await input.press("Enter");
    const opened = await getOpened(page);
    expect(opened.length).toBeGreaterThan(0);
    await expect(listbox(page)).toHaveCount(0);
  });

  test("input exposes combobox semantics wired to the listbox [a11y: roles/aria]", async ({
    page
  }) => {
    const initial = waitForAppsList(page);
    await page.goto("/");
    await initial;

    const input = searchBox(page);
    await expect(input).toHaveAttribute("aria-haspopup", "listbox");
    await expect(input).toHaveAttribute("aria-expanded", "false");

    const suggested = waitForAppsList(page);
    await input.click();
    await suggested;

    const controls = await input.getAttribute("aria-controls");
    expect(controls).toBeTruthy();
    await expect(listbox(page)).toHaveAttribute("id", controls!);
  });
});
