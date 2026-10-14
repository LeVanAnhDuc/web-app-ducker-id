import { test, expect } from "@/fixtures";
import type { Route } from "@playwright/test";
import type { CatalogApp } from "@/api/web-app.client";
import { HeaderSearch } from "@/components/header-search.component";
import { copy, copyVi } from "@/data/copy";
import { LoginPage } from "@/pages/auth/login.page";
import {
  APPS_LIST_URL,
  APPS_PATH,
  catalogByName,
  recentAppPath,
  searchParamOf
} from "@/utils/catalog";
import { escapeRegExp } from "@/utils/regex";
import { openedUrls, stubWindowOpen } from "@/utils/window-open";
import { envelope, fulfillJson, serverError, typeQuery } from "./helpers";

// Header search — the combobox + popover in AppHeader that searches apps via
// GET /apps?search=, with suggested apps (no query) shown on focus.
// Read-only: selecting a row opens the app's homeUrl in a new tab
// (window.open, stubbed here); "View All" navigates to /apps?search=<q>.
// Test cases: test-cases/apps.md (TC-APPS-020 … 037, 046, 070 … 073).
// Role: user (default), except the AuthN case (guest) and the admin route.
//
// The app searched for is the first catalogue app by name, read from the API
// in beforeEach — the suite does not assume any particular seed app.

const header = copy.dashboard.header;
const NO_MATCH = "zzzz-no-such-app";

// The app the real-data tests search for (first catalogue app by name).
let app: CatalogApp;
const appOption = (search: HeaderSearch) =>
  search.option(new RegExp(escapeRegExp(app.displayName)));

/** A stubbed row with a category, as the server shapes it. */
const stubRow = (over: Partial<CatalogApp> = {}): CatalogApp => ({
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
  isFavorite: false,
  ...over
});

const makeItems = (n: number): CatalogApp[] =>
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

/** GET /apps?…search=<term>… — the header's query request. */
const searchUrl = (term: string) =>
  new RegExp(`${escapeRegExp(APPS_PATH)}\\?.*search=${term}`);

test.beforeEach(async ({ userApi }) => {
  [app] = await catalogByName(userApi);
});

test.describe("Header search (AppHeader combobox)", () => {
  // --- Row 1: Happy path ---------------------------------------------------
  test(
    "Header search: focus shows suggestions, typing narrows",
    { tag: ["@TC-APPS-020", "@smoke"] },
    async ({ page, headerSearch }) => {
      await page.goto("/");
      await expect(headerSearch.input()).toBeVisible();

      await headerSearch.open();

      await expect(headerSearch.listbox()).toBeVisible();
      await expect(headerSearch.suggestedLabel()).toBeVisible();
      // Typing narrows to a match after the 300ms debounce.
      await typeQuery(page, headerSearch, app.displayName);

      await expect(headerSearch.resultsLabel()).toBeVisible();
      await expect(appOption(headerSearch)).toBeVisible();
    }
  );

  // --- Regression: single click opens AND keeps the popover open -----------
  // Guards the double-toggle bug: PopoverTrigger's built-in click-toggle fought
  // the onFocus-open, so the first click opened then immediately closed. Fixed
  // by using PopoverAnchor (no click-toggle) + explicit focus/click open.
  test(
    "A single click opens the popover and it stays open",
    { tag: "@TC-APPS-021" },
    async ({ page, headerSearch }) => {
      await page.goto("/");
      await expect(headerSearch.input()).toBeVisible();

      const input = headerSearch.input();
      await headerSearch.open();
      await expect(headerSearch.listbox()).toBeVisible();
      // A toggle-close would be committed by the next paint; aria-expanded
      // mirrors the `open` state directly (no exit animation in between).
      await headerSearch.afterNextPaint();
      await expect(headerSearch.listbox()).toBeVisible();
      await expect(input).toHaveAttribute("aria-expanded", "true");

      // Clicking the (already-open, focused) input must NOT close-then-reopen it —
      // PopoverAnchor's outside-interaction dismiss is suppressed for the input.
      await input.click();
      await headerSearch.afterNextPaint();
      await expect(headerSearch.listbox()).toBeVisible();
      await expect(input).toHaveAttribute("aria-expanded", "true");

      await input.press("Escape");
      await expect(headerSearch.listbox()).toBeHidden();
      await input.click();
      await expect(headerSearch.listbox()).toBeVisible();
    }
  );

  // --- Row 2: AuthN ---------------------------------------------------------
  test(
    "No header search for a signed-out visitor",
    { tag: "@TC-APPS-022" },
    async ({ guestPage }) => {
      // Clean context (no storageState), so a refresh cookie from another
      // run cannot leak in.
      await guestPage.goto("/");
      // AuthGuard gates to the login affordance instead of the dashboard shell.
      await expect(new LoginPage(guestPage).continueButton()).toBeVisible({
        timeout: 20_000
      });
      // The header (and its search combobox) must not be present.
      await expect(new HeaderSearch(guestPage).input()).toHaveCount(0);
    }
  );

  // --- Row 3: AuthZ ---------------------------------------------------------
  // Header search is not role-gated: the regular user sees it on a dashboard
  // route (AuthZ for /admin/* pages belongs to the AUTHZ module).
  test(
    "Header search is present on a dashboard route",
    { tag: "@TC-APPS-023" },
    async ({ appsPage, headerSearch }) => {
      await appsPage.goto();
      await expect(headerSearch.input()).toBeVisible();
    }
  );

  // --- Row 4: Validation / input (Equivalence Partitioning) ----------------
  test.describe(
    "Query classes: empty, whitespace, match, no-match, special characters",
    { tag: "@TC-APPS-024" },
    () => {
      test("empty query shows suggested apps [EP: empty]", async ({
        page,
        headerSearch
      }) => {
        await page.goto("/");
        await expect(headerSearch.input()).toBeVisible();
        await headerSearch.open();
        await expect(headerSearch.suggestedLabel()).toBeVisible();
      });

      test("whitespace-only query is treated as empty and still shows suggested apps [EP: whitespace]", async ({
        page,
        headerSearch
      }) => {
        await page.clock.install();
        await page.goto("/");
        await expect(headerSearch.input()).toBeVisible();
        await headerSearch.open();

        // Typing only spaces must not switch the label to "Apps" (results) —
        // the debounced value is trimmed to "" so it stays on the suggested
        // branch. No new request is expected: fast-forward through the
        // debounce window, let React commit, then assert the label.
        await headerSearch.input().fill("   ");
        await page.clock.runFor(HeaderSearch.DEBOUNCE_MS);
        await headerSearch.afterNextPaint();
        await expect(headerSearch.suggestedLabel()).toBeVisible();
      });

      test("a matching query shows results [EP: match]", async ({
        page,
        headerSearch
      }) => {
        await page.goto("/");
        await expect(headerSearch.input()).toBeVisible();
        await headerSearch.open();
        await typeQuery(page, headerSearch, app.displayName);
        await expect(appOption(headerSearch)).toBeVisible();
      });

      test("a non-matching query shows the empty state [EP: no-match]", async ({
        page,
        headerSearch
      }) => {
        await page.goto("/");
        await expect(headerSearch.input()).toBeVisible();
        await headerSearch.open();
        await typeQuery(page, headerSearch, NO_MATCH);
        await expect(headerSearch.noResults()).toBeVisible();
        await expect(headerSearch.noResultsHint()).toBeVisible();
      });

      test("special-character and unicode queries do not crash the popover [EP: special/unicode]", async ({
        page,
        headerSearch
      }) => {
        await page.goto("/");
        await expect(headerSearch.input()).toBeVisible();
        await headerSearch.open();

        await typeQuery(page, headerSearch, "<script>alert(1)</script>");
        // Renders safely (no crash / no raw script execution) — either
        // results or the empty state, never a thrown error boundary.
        await expect(headerSearch.listbox()).toBeVisible();

        await typeQuery(page, headerSearch, "📷");
        await expect(headerSearch.listbox()).toBeVisible();
      });
    }
  );

  // --- Row 5: Empty / null --------------------------------------------------
  test.describe(
    "Empty and null rows render safely",
    { tag: "@TC-APPS-025" },
    () => {
      test("no-match search renders the localized empty state text [empty/null]", async ({
        page,
        headerSearch
      }) => {
        await page.goto("/");
        await expect(headerSearch.input()).toBeVisible();
        await headerSearch.open();
        await typeQuery(page, headerSearch, NO_MATCH);
        await expect(headerSearch.noResults()).toBeVisible();
      });

      test("a suggested/result app with no category renders without a category line (no literal null)", async ({
        page,
        headerSearch
      }) => {
        // One app with no categories and iconUrl: null — the row falls back
        // to an initial letter and omits the category line instead of
        // rendering the word "null".
        await page.route(APPS_LIST_URL, (route: Route) =>
          fulfillJson(
            route,
            envelope({
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
            })
          )
        );

        await page.goto("/");
        await headerSearch.input().click();

        const row = headerSearch.option(/Uncategorized App/);
        await expect(row).toBeVisible();
        await expect(row).not.toContainText("null");
      });
    }
  );

  // --- Row 6: Boundary / pagination (Boundary Value Analysis) --------------
  test.describe(
    '"View All" appears only when results exceed the limit',
    { tag: "@TC-APPS-026" },
    () => {
      test("result count at the limit (5) hides View All [BVA: total=limit]", async ({
        page,
        headerSearch
      }) => {
        // total === items.length (5 == 5) → no "View All".
        await page.route(searchUrl("match"), (route: Route) =>
          fulfillJson(
            route,
            envelope({
              items: makeItems(5),
              meta: { total: 5, page: 1, limit: 5, totalPages: 1 }
            })
          )
        );

        await page.goto("/");
        const input = headerSearch.input();
        await input.click();
        await input.fill("match");
        await page.waitForResponse((r) => r.url().includes("search=match"));

        await expect(headerSearch.option(/Fake App 0/)).toBeVisible();
        await expect(headerSearch.viewAllButton()).toHaveCount(0);
      });

      test("result count above the limit shows View All [BVA: total>limit]", async ({
        page,
        headerSearch
      }) => {
        // total (12) > items.length (5) → "View All" appears.
        await page.route(searchUrl("many"), (route: Route) =>
          fulfillJson(
            route,
            envelope({
              items: makeItems(5),
              meta: { total: 12, page: 1, limit: 5, totalPages: 3 }
            })
          )
        );

        await page.goto("/");
        const input = headerSearch.input();
        await input.click();
        await input.fill("many");
        await page.waitForResponse((r) => r.url().includes("search=many"));

        await expect(headerSearch.viewAllButton()).toBeVisible();
      });
    }
  );

  test.describe(
    "One character searches; fast typing sends one request",
    { tag: "@TC-APPS-027" },
    () => {
      test("a single-character query still triggers a search [BVA: min length = 1]", async ({
        page,
        headerSearch
      }) => {
        await page.goto("/");
        await expect(headerSearch.input()).toBeVisible();
        await headerSearch.open();
        await typeQuery(page, headerSearch, app.displayName.charAt(0));
        await expect(headerSearch.listbox()).toBeVisible();
      });

      test("rapid typing within the debounce window fires a single request for the final value [BVA: debounce timing]", async ({
        page,
        headerSearch
      }) => {
        await page.goto("/");
        await expect(headerSearch.input()).toBeVisible();
        await headerSearch.open();

        const requests: string[] = [];
        page.on("request", (req) => {
          if (
            req.url().includes(APPS_PATH) &&
            !req.url().includes("categories")
          ) {
            requests.push(req.url());
          }
        });

        // Three characters fast (well under the 300ms debounce) — a 20ms
        // delay keeps every keystroke inside a single debounce window.
        const prefix = app.displayName.slice(0, 3);
        await headerSearch.input().pressSequentially(prefix, { delay: 20 });
        await page.waitForResponse((r) => searchParamOf(r.url()) === prefix);
        // No extra wait for the absence: the debounce restarts on every
        // keystroke, so a timer for an intermediate value would have expired
        // before the final value's, and its request would already be recorded.

        const searchRequests = requests.filter((u) =>
          new URL(u).searchParams.has("search")
        );
        expect(searchRequests).toHaveLength(1);
        expect(searchParamOf(searchRequests[0])).toBe(prefix);
      });
    }
  );

  // --- Row 7: Filter / search ------------------------------------------------
  test(
    '"View All" jumps to `/apps?search=<query>`',
    { tag: "@TC-APPS-028" },
    async ({ page, headerSearch }) => {
      await page.goto("/");
      await expect(headerSearch.input()).toBeVisible();
      await headerSearch.open();

      // Deterministically surface "View All": stub a total greater than the
      // rendered items, without depending on live data crossing the limit.
      const isQuery = (url: URL) =>
        url.pathname.endsWith(APPS_PATH) &&
        url.searchParams.get("search") === app.displayName;
      await page.route(isQuery, (route: Route) =>
        fulfillJson(
          route,
          envelope({
            items: [stubRow()],
            meta: { total: 6, page: 1, limit: 5, totalPages: 2 }
          })
        )
      );
      // The stub is in place before the first keystroke, so the one debounced
      // request for this query is the stubbed one.
      await headerSearch.input().fill(app.displayName);
      await page.waitForResponse((r) => isQuery(new URL(r.url())));

      const viewAll = headerSearch.viewAllButton();
      await expect(viewAll).toBeVisible();
      await viewAll.click();

      await expect(page).toHaveURL(/\/apps\?search=/);
      expect(searchParamOf(page.url())).toBe(app.displayName);
    }
  );

  test(
    "Enter with a query and no highlighted row opens the full list",
    { tag: "@TC-APPS-070" },
    async ({ page, headerSearch }) => {
      await page.goto("/");
      await expect(headerSearch.input()).toBeVisible();
      await headerSearch.open();

      await typeQuery(page, headerSearch, app.displayName);
      // No ArrowDown: activeIndex is -1, so Enter navigates instead of opening.
      await headerSearch.input().press("Enter");

      await expect(page).toHaveURL(/\/apps\?search=/);
      expect(searchParamOf(page.url())).toBe(app.displayName);
      await expect(headerSearch.listbox()).toHaveCount(0);
    }
  );

  test(
    "Empty vs non-empty query switch the section label",
    { tag: "@TC-APPS-029" },
    async ({ page, headerSearch }) => {
      await page.goto("/");
      await expect(headerSearch.input()).toBeVisible();
      await headerSearch.open();
      await expect(headerSearch.suggestedLabel()).toBeVisible();

      await typeQuery(page, headerSearch, app.displayName);
      await expect(headerSearch.resultsLabel()).toBeVisible();
      await expect(headerSearch.suggestedLabel()).toHaveCount(0);
    }
  );

  // --- Row 8: Data rendering -------------------------------------------------
  test(
    "Rows show names, never raw ids",
    { tag: "@TC-APPS-030" },
    async ({ page, headerSearch }) => {
      await page.goto("/");
      await expect(headerSearch.input()).toBeVisible();
      await headerSearch.open();

      const row = headerSearch.options().first();
      await expect(row).toBeVisible();
      await expect(row).not.toHaveText("");
      // The Mongo _id must not leak into the row's accessible text.
      await expect(row).not.toContainText(/^[0-9a-f]{24}$/);
    }
  );

  // --- Row 9: i18n (en + vi) --------------------------------------------------
  test(
    "Header search chrome in English",
    { tag: "@TC-APPS-031" },
    async ({ page, headerSearch }) => {
      await page.goto("/");
      await expect(headerSearch.input()).toBeVisible();
      await expect(headerSearch.input()).toHaveAttribute(
        "placeholder",
        header.searchPlaceholder
      );

      await headerSearch.open();
      await expect(headerSearch.suggestedLabel()).toBeVisible();

      await typeQuery(page, headerSearch, NO_MATCH);
      await expect(headerSearch.noResults()).toBeVisible();
    }
  );

  test(
    "Header search chrome in Vietnamese",
    { tag: "@TC-APPS-032" },
    async ({ page, appsPage }) => {
      const search = new HeaderSearch(page, copyVi);
      await page.goto("/vi");
      await expect(search.input()).toBeVisible();
      await expect(search.input()).toHaveAttribute(
        "placeholder",
        copyVi.dashboard.header.searchPlaceholder
      );

      await search.open();
      await expect(search.suggestedLabel()).toBeVisible();

      await typeQuery(page, search, NO_MATCH);
      await expect(search.noResults()).toBeVisible();

      // No raw i18n key should leak into the rendered page text.
      const body = await appsPage.body().innerText();
      expect(body).not.toMatch(/dashboard\.header\./);
    }
  );

  // --- Row 10: Error / loading ------------------------------------------------
  test(
    "Skeleton rows while a search is pending",
    { tag: "@TC-APPS-033" },
    async ({ page, headerSearch }) => {
      let resolveHold!: () => void;
      const hold = new Promise<void>((resolve) => {
        resolveHold = resolve;
      });

      await page.route(APPS_LIST_URL, async (route: Route) => {
        if (route.request().url().includes("categories")) {
          await route.continue();
          return;
        }
        await hold;
        await fulfillJson(
          route,
          envelope({
            items: [stubRow()],
            meta: { total: 1, page: 1, limit: 5, totalPages: 1 }
          })
        );
      });

      await page.goto("/");
      await headerSearch.input().click();

      // While pending: skeleton placeholders render inside the listbox (no
      // role="option" yet).
      await expect(headerSearch.listbox()).toBeVisible();
      await expect(headerSearch.options()).toHaveCount(0);

      resolveHold();

      await expect(headerSearch.option(/Blog/)).toBeVisible({
        timeout: 10_000
      });
    }
  );

  test(
    "A failed search renders the empty state, not a spinner",
    { tag: "@TC-APPS-034" },
    async ({ page, headerSearch }) => {
      await page.route(APPS_LIST_URL, async (route: Route) => {
        if (route.request().url().includes("categories")) {
          await route.continue();
          return;
        }
        await fulfillJson(route, serverError(), 500);
      });

      await page.goto("/");
      await headerSearch.input().click();

      // No crash: the popover still renders, showing the empty/no-results
      // state (isError is treated as empty) rather than a permanent spinner.
      await expect(headerSearch.listbox()).toBeVisible();
      await expect(headerSearch.noResults()).toBeVisible({ timeout: 10_000 });
    }
  );

  // --- Row 11: state transitions ----------------------------------------------
  // Search is read-only and opening an app is an external navigation, so
  // there is no mutation to make safe; the popover's states are covered.
  test.describe(
    "Popover state transitions: clear, Escape, select",
    { tag: "@TC-APPS-035" },
    () => {
      test("clearing the query after typing returns to the suggested list, not stuck on empty [ST: typing -> cleared -> suggested]", async ({
        page,
        headerSearch
      }) => {
        await page.goto("/");
        await expect(headerSearch.input()).toBeVisible();
        await headerSearch.open();

        await typeQuery(page, headerSearch, NO_MATCH);
        await expect(headerSearch.noResults()).toBeVisible();

        await headerSearch.input().fill("");
        await expect(headerSearch.suggestedLabel()).toBeVisible();
        await expect(headerSearch.noResults()).toHaveCount(0);
      });

      test("Escape closes the popover and returns focus to the input [ST: open -> closed]", async ({
        page,
        headerSearch
      }) => {
        await page.goto("/");
        await expect(headerSearch.input()).toBeVisible();
        await headerSearch.open();
        await expect(headerSearch.listbox()).toBeVisible();

        await headerSearch.input().press("Escape");
        await expect(headerSearch.listbox()).toHaveCount(0);
        await expect(headerSearch.input()).toBeFocused();
      });

      test("selecting a row opens the app and closes the popover [ST: results -> select -> closed]", async ({
        page,
        headerSearch
      }) => {
        await stubWindowOpen(page);

        await page.goto("/");
        await expect(headerSearch.input()).toBeVisible();
        await headerSearch.open();

        await typeQuery(page, headerSearch, app.displayName);
        const row = appOption(headerSearch);
        await expect(row).toBeVisible();
        await row.click();

        expect(await openedUrls(page)).toContain(app.homeUrl);
        await expect(headerSearch.listbox()).toHaveCount(0);
      });
    }
  );

  test(
    "Clicking outside closes the header search",
    { tag: "@TC-APPS-071" },
    async ({ appsPage, headerSearch }) => {
      await appsPage.goto();
      await expect(appsPage.heading()).toBeVisible();
      await headerSearch.open();

      // Radix dismisses on a pointer-down outside the popover and its anchor;
      // the page title is plain text, so the click does nothing else. The <h1>
      // spans the content width and the popover covers its centre, so click
      // the start of the title (its glyphs), which stays uncovered.
      await appsPage.heading().click({ position: { x: 4, y: 4 } });
      await expect(headerSearch.listbox()).toHaveCount(0);
      await expect(headerSearch.input()).toHaveAttribute(
        "aria-expanded",
        "false"
      );
    }
  );

  test(
    "Opening an app from header search records the launch",
    { tag: "@TC-APPS-073" },
    async ({ page, headerSearch }) => {
      await stubWindowOpen(page);
      await page.goto("/");
      await expect(headerSearch.input()).toBeVisible();
      await headerSearch.open();
      await typeQuery(page, headerSearch, app.displayName);

      const recorded = page.waitForResponse(
        (r) =>
          r.url().includes(recentAppPath(app._id)) &&
          r.request().method() === "POST"
      );
      await appOption(headerSearch).click();
      expect((await recorded).status()).toBe(204);
      expect(await openedUrls(page)).toContain(app.homeUrl);
    }
  );

  // --- Row 12: Accessibility --------------------------------------------------
  test(
    "Keyboard navigation in the results",
    { tag: "@TC-APPS-036" },
    async ({ page, headerSearch }) => {
      await stubWindowOpen(page);

      await page.goto("/");
      await expect(headerSearch.input()).toBeVisible();

      const input = headerSearch.input();
      await expect(input).toHaveAttribute("aria-expanded", "false");

      await headerSearch.open();
      await expect(input).toHaveAttribute("aria-expanded", "true");

      await input.press("ArrowDown");
      const firstOption = headerSearch.options().first();
      await expect(firstOption).toHaveAttribute("aria-selected", "true");

      await input.press("ArrowDown");
      const secondOption = headerSearch.options().nth(1);
      await expect(secondOption).toHaveAttribute("aria-selected", "true");
      await expect(firstOption).toHaveAttribute("aria-selected", "false");

      await input.press("ArrowUp");
      await expect(firstOption).toHaveAttribute("aria-selected", "true");

      await input.press("Enter");
      const opened = await openedUrls(page);
      expect(opened.length).toBeGreaterThan(0);
      await expect(headerSearch.listbox()).toHaveCount(0);
    }
  );

  test(
    "Header search results are announced",
    { tag: "@TC-APPS-046" },
    async ({ page, appsPage, headerSearch }) => {
      await page.goto("/");
      await expect(headerSearch.input()).toBeVisible();
      await headerSearch.open();

      await typeQuery(page, headerSearch, NO_MATCH);
      await expect(appsPage.announcer.region()).toHaveText(
        header.announce.noResults
      );

      await typeQuery(page, headerSearch, app.displayName);
      await expect(appsPage.announcer.region()).toHaveText(/^\d+ apps found$/);
    }
  );

  test(
    "Combobox ARIA wiring",
    { tag: "@TC-APPS-037" },
    async ({ page, headerSearch }) => {
      await page.goto("/");
      await expect(headerSearch.input()).toBeVisible();

      const input = headerSearch.input();
      await expect(input).toHaveAttribute("aria-haspopup", "listbox");
      await expect(input).toHaveAttribute("aria-expanded", "false");

      await headerSearch.open();

      const controls = await input.getAttribute("aria-controls");
      expect(controls).toBeTruthy();
      await expect(headerSearch.listbox()).toHaveAttribute("id", controls!);
    }
  );
});

test.describe("Header search on an admin route", () => {
  test.use({ role: "admin" });

  test(
    "Header search works for an admin on an admin route",
    { tag: "@TC-APPS-072" },
    async ({ page, adminApi, headerSearch }) => {
      const [first] = await catalogByName(adminApi);
      await page.goto("/admin");
      await expect(headerSearch.input()).toBeVisible();
      await headerSearch.open();
      await expect(headerSearch.suggestedLabel()).toBeVisible();

      await typeQuery(page, headerSearch, first.displayName);
      await expect(
        headerSearch.option(new RegExp(escapeRegExp(first.displayName)))
      ).toBeVisible();
    }
  );
});
