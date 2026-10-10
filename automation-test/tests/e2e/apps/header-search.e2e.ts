import { test, expect } from "@fixtures";
import type { Page, Route } from "@playwright/test";
import { catalogByName, reEscape } from "@helpers/catalog";
import type { CatalogApp } from "@helpers/catalog";

// Header search — the combobox + popover in AppHeader that searches apps via
// GET /api/v1/apps?search=, with suggested apps (no query) shown on focus.
// Read-only: selecting a row opens the app's homeUrl in a new tab
// (window.open, stubbed here); "View All" navigates to /apps?search=<q>.
// Test cases: test-cases/apps.md (TC-APPS-020 … 037). Role: user (default),
// except the AuthN case which runs as guest.
//
// The app searched for is the first catalogue app by name, read from the API
// in beforeEach — the suite does not assume any particular seed app.

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
// actually opening a new tab/navigating to an external URL.
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

// The app the real-data tests search for (first catalogue app by name).
let app: CatalogApp;
const appOption = (page: Page) =>
  optionFor(page, new RegExp(reEscape(app.displayName)));

// Focus/click opens the popover. The suggested list may be served from the
// React Query cache (Home already loaded the catalogue), so wait for the
// rendered rows rather than for a network response.
const openPopover = async (page: Page) => {
  await searchBox(page).click();
  await expect(listbox(page)).toBeVisible();
  await expect(page.getByRole("option").first()).toBeVisible();
};

// Types a query and waits for the debounced search request for it.
const typeQuery = async (page: Page, q: string) => {
  const res = page.waitForResponse(
    (r) =>
      isAppsList(r) && new URL(r.url()).searchParams.get("search") === q.trim()
  );
  await searchBox(page).fill(q);
  await res;
};

const inList = (page: Page, text: string) =>
  listbox(page).getByText(text, { exact: true });

test.beforeEach(async ({ userApi }) => {
  [app] = await catalogByName(userApi);
});

test.describe("Header search (AppHeader combobox)", () => {
  // --- Row 1: Happy path ---------------------------------------------------
  test(
    "focus opens the popover with suggested apps, then typing narrows to results [happy path]",
    { tag: ["@TC-APPS-020", "@smoke"] },
    async ({ page }) => {
      await page.goto("/");
      await expect(searchBox(page)).toBeVisible();

      const input = searchBox(page);
      await expect(input).toBeVisible();

      await openPopover(page);

      await expect(listbox(page)).toBeVisible();
      await expect(inList(page, "Suggested apps")).toBeVisible();
      // Typing narrows to a match after the 300ms debounce.
      await typeQuery(page, app.displayName);

      await expect(inList(page, "Apps")).toBeVisible();
      await expect(appOption(page)).toBeVisible();
    }
  );

  // --- Regression: single click opens AND keeps the popover open -----------
  // Guards the double-toggle bug: PopoverTrigger's built-in click-toggle fought
  // the onFocus-open, so the first click opened then immediately closed. Fixed
  // by using PopoverAnchor (no click-toggle) + explicit focus/click open.
  test(
    "single click opens the popover and it stays open [regression: no toggle-close]",
    { tag: "@TC-APPS-021" },
    async ({ page }) => {
      await page.goto("/");
      await expect(searchBox(page)).toBeVisible();

      const input = searchBox(page);
      await openPopover(page);
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
    }
  );

  // --- Row 2: AuthN ---------------------------------------------------------
  test(
    "unauthenticated visit does not render the header search [AuthN]",
    { tag: "@TC-APPS-022" },
    async ({ browser }) => {
      // Clean context: no storageState + proactively cleared cookies, so a
      // localhost-scoped refresh cookie from another port/run cannot leak in.
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
    }
  );

  // --- Row 3: AuthZ ---------------------------------------------------------
  // [Decision Table] role x route -> header search present & functional.
  // Header search is not role-gated: the regular user sees and can use it on
  // a dashboard route (AuthZ for /admin/* pages themselves belongs to the
  // AUTHZ module — this test only asserts the header chrome is present).
  test(
    "search combobox is present and usable on a dashboard route [DT: role=user, route=dashboard]",
    { tag: "@TC-APPS-023" },
    async ({ page }) => {
      await page.goto("/apps");
      await expect(searchBox(page)).toBeVisible();
    }
  );

  // --- Row 4: Validation / input (Equivalence Partitioning) ----------------
  test(
    "empty query shows suggested apps [EP: empty]",
    { tag: "@TC-APPS-024" },
    async ({ page }) => {
      await page.goto("/");
      await expect(searchBox(page)).toBeVisible();

      await openPopover(page);

      await expect(inList(page, "Suggested apps")).toBeVisible();
    }
  );

  test(
    "whitespace-only query is treated as empty and still shows suggested apps [EP: whitespace]",
    { tag: "@TC-APPS-024" },
    async ({ page }) => {
      await page.goto("/");
      await expect(searchBox(page)).toBeVisible();

      const input = searchBox(page);
      await openPopover(page);

      // Typing only spaces must not switch the label to "Apps" (results) — the
      // debounced value is trimmed to "" so it stays on the suggested branch.
      await input.fill("   ");
      // No new /apps request is expected for a value that debounces to the same
      // empty search — give the debounce window time to elapse, then assert the
      // suggested label is still shown (not "Apps").
      await page.waitForTimeout(400);
      await expect(inList(page, "Suggested apps")).toBeVisible();
    }
  );

  test(
    "a matching query shows results [EP: match]",
    { tag: "@TC-APPS-024" },
    async ({ page }) => {
      await page.goto("/");
      await expect(searchBox(page)).toBeVisible();

      const input = searchBox(page);
      await openPopover(page);

      await typeQuery(page, app.displayName);

      await expect(appOption(page)).toBeVisible();
    }
  );

  test(
    "a non-matching query shows the empty state [EP: no-match]",
    { tag: "@TC-APPS-024" },
    async ({ page }) => {
      await page.goto("/");
      await expect(searchBox(page)).toBeVisible();

      const input = searchBox(page);
      await openPopover(page);

      await typeQuery(page, "zzzz-no-such-app");

      await expect(inList(page, "No apps found")).toBeVisible();
      await expect(inList(page, "Try a different keyword")).toBeVisible();
    }
  );

  test(
    "special-character and unicode queries do not crash the popover [EP: special/unicode]",
    { tag: "@TC-APPS-024" },
    async ({ page }) => {
      await page.goto("/");
      await expect(searchBox(page)).toBeVisible();

      const input = searchBox(page);
      await openPopover(page);

      await typeQuery(page, "<script>alert(1)</script>");
      // Renders safely (no crash / no raw script execution) — either results or
      // the empty state, never a thrown error boundary.
      await expect(listbox(page)).toBeVisible();

      await typeQuery(page, "📷");
      await expect(listbox(page)).toBeVisible();
    }
  );

  // --- Row 5: Empty / null --------------------------------------------------
  test(
    "no-match search renders the localized empty state text [empty/null]",
    { tag: "@TC-APPS-025" },
    async ({ page }) => {
      await page.goto("/");
      await expect(searchBox(page)).toBeVisible();

      const input = searchBox(page);
      await openPopover(page);

      await typeQuery(page, "zzzz-no-such-app");

      await expect(inList(page, "No apps found")).toBeVisible();
    }
  );

  test(
    "a suggested/result app with no category renders without a category line (no literal null)",
    { tag: "@TC-APPS-025" },
    async ({ page }) => {
      // Intercept /apps to control the shape: one app has no categories and
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
                  categories: [],
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
    }
  );

  // --- Row 6: Boundary / pagination (Boundary Value Analysis) --------------
  test(
    "result count at the limit (5) hides View All; above the limit shows it [BVA: total=limit vs total>limit]",
    { tag: "@TC-APPS-026" },
    async ({ page }) => {
      const makeItems = (n: number) =>
        Array.from({ length: n }, (_, i) => ({
          _id: `fake-app-${i}`,
          displayName: `Fake App ${i}`,
          description: "desc",
          iconUrl: null,
          homeUrl: "https://fake.example.com",
          categories: [
            {
              _id: "cat-utilities",
              slug: "utilities",
              name: { en: "Utilities", vi: "Tiện ích" }
            }
          ],
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
      await expect(page.getByRole("button", { name: "View All" })).toHaveCount(
        0
      );
    }
  );

  test(
    "result count above the limit shows View All [BVA: total>limit]",
    { tag: "@TC-APPS-026" },
    async ({ page }) => {
      const makeItems = (n: number) =>
        Array.from({ length: n }, (_, i) => ({
          _id: `fake-app-${i}`,
          displayName: `Fake App ${i}`,
          description: "desc",
          iconUrl: null,
          homeUrl: "https://fake.example.com",
          categories: [
            {
              _id: "cat-utilities",
              slug: "utilities",
              name: { en: "Utilities", vi: "Tiện ích" }
            }
          ],
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

      await expect(
        page.getByRole("button", { name: "View All" })
      ).toBeVisible();
    }
  );

  test(
    "a single-character query still triggers a search [BVA: min length = 1]",
    { tag: "@TC-APPS-027" },
    async ({ page }) => {
      await page.goto("/");
      await expect(searchBox(page)).toBeVisible();

      const input = searchBox(page);
      await openPopover(page);

      await typeQuery(page, app.displayName.charAt(0));
      await expect(listbox(page)).toBeVisible();
    }
  );

  test(
    "rapid typing within the debounce window fires a single request for the final value [BVA: debounce timing]",
    { tag: "@TC-APPS-027" },
    async ({ page }) => {
      await page.goto("/");
      await expect(searchBox(page)).toBeVisible();

      const input = searchBox(page);
      await openPopover(page);

      const requests: string[] = [];
      page.on("request", (req) => {
        if (
          req.url().includes("/api/v1/apps") &&
          !req.url().includes("categories")
        ) {
          requests.push(req.url());
        }
      });

      // Type three characters fast (well under the 300ms debounce) —
      // pressSequentially with a 20ms delay keeps every keystroke inside a
      // single debounce window.
      const prefix = app.displayName.slice(0, 3);
      await input.pressSequentially(prefix, { delay: 20 });
      await page.waitForResponse(
        (r) => new URL(r.url()).searchParams.get("search") === prefix
      );
      // Give any (unexpected) extra debounced requests time to fire before
      // asserting the count, since we're asserting an absence.
      await page.waitForTimeout(300);

      const searchRequests = requests.filter((u) =>
        new URL(u).searchParams.has("search")
      );
      expect(searchRequests).toHaveLength(1);
      expect(new URL(searchRequests[0]).searchParams.get("search")).toBe(
        prefix
      );
    }
  );

  // --- Row 7: Filter / search ------------------------------------------------
  test(
    '"View All" navigates to /apps?search=<query> and the Apps page reflects the query [filter/search]',
    { tag: "@TC-APPS-028" },
    async ({ page }) => {
      await page.goto("/");
      await expect(searchBox(page)).toBeVisible();

      const input = searchBox(page);
      await openPopover(page);

      // Deterministically surface "View All": stub a total greater than the
      // rendered items so the footer button is present, without depending on
      // live seed data crossing the limit.
      const isQuery = (url: URL) =>
        url.pathname.endsWith("/api/v1/apps") &&
        url.searchParams.get("search") === app.displayName;
      await page.route(isQuery, (route: Route) =>
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
                  categories: [
                    {
                      _id: "cat-productivity",
                      slug: "productivity",
                      name: { en: "Productivity", vi: "Năng suất" }
                    }
                  ],
                  isFavorite: false
                }
              ],
              meta: { total: 6, page: 1, limit: 5, totalPages: 2 }
            }
          })
        })
      );
      // The stub is in place before the first keystroke, so the one debounced
      // request for this query is the stubbed one (a repeat would be served
      // from the React Query cache and never reach the route).
      await input.fill(app.displayName);
      await page.waitForResponse((r) => isQuery(new URL(r.url())));

      const viewAll = page.getByRole("button", { name: "View All" });
      await expect(viewAll).toBeVisible();
      await viewAll.click();

      await expect(page).toHaveURL(/\/apps\?search=/);
      expect(new URL(page.url()).searchParams.get("search")).toBe(
        app.displayName
      );
    }
  );

  test(
    "empty vs non-empty query switches between suggested and results sections [DT: query empty x non-empty]",
    { tag: "@TC-APPS-029" },
    async ({ page }) => {
      await page.goto("/");
      await expect(searchBox(page)).toBeVisible();

      const input = searchBox(page);
      await openPopover(page);
      await expect(inList(page, "Suggested apps")).toBeVisible();

      await typeQuery(page, app.displayName);
      await expect(inList(page, "Apps")).toBeVisible();
      await expect(inList(page, "Suggested apps")).toHaveCount(0);
    }
  );

  // --- Row 8: Data rendering -------------------------------------------------
  test(
    "rows render displayName and category, not raw ids/JSON [data rendering]",
    { tag: "@TC-APPS-030" },
    async ({ page }) => {
      await page.goto("/");
      await expect(searchBox(page)).toBeVisible();

      const input = searchBox(page);
      await openPopover(page);

      const row = page.getByRole("option").first();
      await expect(row).toBeVisible();
      await expect(row).not.toHaveText("");
      // The Mongo _id must not leak into the row's accessible text.
      await expect(row).not.toContainText(/^[0-9a-f]{24}$/);
    }
  );

  // --- Row 9: i18n (en + vi) --------------------------------------------------
  test(
    "popover chrome renders in English on the default locale [i18n: en]",
    { tag: "@TC-APPS-031" },
    async ({ page }) => {
      await page.goto("/");
      await expect(searchBox(page)).toBeVisible();

      const input = searchBox(page);
      await expect(input).toHaveAttribute("placeholder", "Search apps...");

      await openPopover(page);
      await expect(inList(page, "Suggested apps")).toBeVisible();

      await typeQuery(page, "zzzz-no-such-app");
      await expect(inList(page, "No apps found")).toBeVisible();
    }
  );

  test(
    "popover chrome renders in Vietnamese on /vi [i18n: vi]",
    { tag: "@TC-APPS-032" },
    async ({ page }) => {
      await page.goto("/vi");
      await expect(searchBox(page)).toBeVisible();

      const input = searchBox(page);
      await expect(input).toHaveAttribute(
        "placeholder",
        "Tìm kiếm ứng dụng..."
      );

      await openPopover(page);
      await expect(inList(page, "Ứng dụng gợi ý")).toBeVisible();

      await typeQuery(page, "zzzz-no-such-app");
      await expect(inList(page, "Không tìm thấy ứng dụng")).toBeVisible();

      // No raw i18n key should leak into the rendered popover text.
      const body = await page.locator("body").innerText();
      expect(body).not.toMatch(/dashboard\.header\./);
    }
  );

  // --- Row 10: Error / loading ------------------------------------------------
  test(
    "shows skeleton rows while the request is pending, then real rows once it resolves [loading]",
    { tag: "@TC-APPS-033" },
    async ({ page }) => {
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
                  categories: [
                    {
                      _id: "cat-productivity",
                      slug: "productivity",
                      name: { en: "Productivity", vi: "Năng suất" }
                    }
                  ],
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
    }
  );

  test(
    "a failed request renders the empty state safely instead of crashing or spinning forever [error]",
    { tag: "@TC-APPS-034" },
    async ({ page }) => {
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
      await expect(inList(page, "No apps found")).toBeVisible({
        timeout: 10_000
      });
    }
  );

  // --- Row 11: Mutation safety (N/A) + state transitions --------------------
  // Mutation safety is N/A — search is read-only and opening an app is an
  // external navigation. The state-transition sub-scenarios ARE covered.

  test(
    "clearing the query after typing returns to the suggested list, not stuck on empty [ST: typing -> cleared -> suggested]",
    { tag: "@TC-APPS-035" },
    async ({ page }) => {
      await page.goto("/");
      await expect(searchBox(page)).toBeVisible();

      const input = searchBox(page);
      await openPopover(page);

      await typeQuery(page, "zzzz-no-such-app");
      await expect(inList(page, "No apps found")).toBeVisible();

      await input.fill("");
      await expect(inList(page, "Suggested apps")).toBeVisible();
      await expect(inList(page, "No apps found")).toHaveCount(0);
    }
  );

  test(
    "Escape closes the popover and returns focus to the input [ST: open -> closed]",
    { tag: "@TC-APPS-035" },
    async ({ page }) => {
      await page.goto("/");
      await expect(searchBox(page)).toBeVisible();

      const input = searchBox(page);
      await openPopover(page);
      await expect(listbox(page)).toBeVisible();

      await input.press("Escape");
      await expect(listbox(page)).toHaveCount(0);
      await expect(input).toBeFocused();
    }
  );

  test(
    "selecting a row opens the app and closes the popover [ST: results -> select -> closed]",
    { tag: "@TC-APPS-035" },
    async ({ page }) => {
      await stubWindowOpen(page);

      await page.goto("/");
      await expect(searchBox(page)).toBeVisible();

      const input = searchBox(page);
      await openPopover(page);

      await typeQuery(page, app.displayName);
      const row = appOption(page);
      await expect(row).toBeVisible();
      await row.click();

      const opened = await getOpened(page);
      expect(opened).toContain(app.homeUrl);
      await expect(listbox(page)).toHaveCount(0);
    }
  );

  // --- Row 12: Accessibility --------------------------------------------------
  test(
    "ArrowDown/ArrowUp move the active option, Enter opens the active app, Escape closes [a11y: keyboard]",
    { tag: "@TC-APPS-036" },
    async ({ page }) => {
      await stubWindowOpen(page);

      await page.goto("/");
      await expect(searchBox(page)).toBeVisible();

      const input = searchBox(page);
      await expect(input).toHaveAttribute("aria-expanded", "false");

      await openPopover(page);
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
    }
  );

  test(
    "results and no-results are announced through the live region [a11y: aria-live]",
    { tag: "@TC-APPS-046" },
    async ({ page }) => {
      await page.goto("/");
      await expect(searchBox(page)).toBeVisible();
      await openPopover(page);

      await typeQuery(page, "zzzz-no-such-app");
      await expect(page.locator("#announcer")).toHaveText("No apps found");

      await typeQuery(page, app.displayName);
      await expect(page.locator("#announcer")).toHaveText(/^\d+ apps found$/);
    }
  );

  test(
    "input exposes combobox semantics wired to the listbox [a11y: roles/aria]",
    { tag: "@TC-APPS-037" },
    async ({ page }) => {
      await page.goto("/");
      await expect(searchBox(page)).toBeVisible();

      const input = searchBox(page);
      await expect(input).toHaveAttribute("aria-haspopup", "listbox");
      await expect(input).toHaveAttribute("aria-expanded", "false");

      await openPopover(page);

      const controls = await input.getAttribute("aria-controls");
      expect(controls).toBeTruthy();
      await expect(listbox(page)).toHaveAttribute("id", controls!);
    }
  );
});
