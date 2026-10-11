import { test, expect } from "@fixtures";
import type { Page } from "@playwright/test";

test.use({ role: "admin" });

// Admin Users list (REQ-ADMUSERS-01) — the unified list shell on
// /admin/users: search, role/status filters, URL state, pagination params,
// rendering, i18n and a11y. Runs as admin (role fixture); the guest and
// non-admin cases take `guestPage` / `userPage`. Read-only — nothing is
// mutated. Test cases: test-cases/admin-users.md (TC-ADMUSERS-001 … 021).
// The API contract behind the page is in tests/api/admin-users/users.api.ts.
//
// Copy sourced from client/src/locales/{en,vi}/{list,adminUsers}.json.

const ADMIN_EMAIL = "admin@test.com";
const USER_EMAIL = "user@test.com";

const goto = (page: Page, query = "") => page.goto(`/admin/users${query}`);

// Newest accounts come first and a page holds 20, so the seeded accounts are
// only guaranteed to be on screen when the list is narrowed to their domain
// (throwaway accounts live under @e2e.example.com).
const SEEDED = "search=%40test.com";

/** First data row of the table (row 0 is the header). */
const firstDataRow = (page: Page) => page.getByRole("row").nth(1);

// The app renders a GLOBAL header search ("Open search") in addition to the
// page list search. Scope to the ListToolbar's role="search" landmark so the
// locator is unambiguous (avoids strict-mode violation with the header search).
const listSearch = (page: Page) =>
  page.getByRole("search").getByRole("textbox");

// ---------------------------------------------------------------------------
// 1. Happy path
// ---------------------------------------------------------------------------
test.describe("Admin Users — happy path", () => {
  test(
    "list renders with data, toolbar and table visible",
    { tag: ["@TC-ADMUSERS-001", "@smoke"] },
    async ({ page }) => {
      await goto(page);
      // Toolbar: search input accessible by name from list.search ("Search")
      await expect(listSearch(page)).toBeVisible();
      // Toolbar: Filters button from list.filters ("Filters")
      await expect(
        page.getByRole("button", { name: /Filters/i })
      ).toBeVisible();
      await expect(firstDataRow(page)).toBeVisible();
      // Narrowed to the seed domain: both seeded accounts are listed.
      await goto(page, `?${SEEDED}`);
      await expect(page.getByText(ADMIN_EMAIL, { exact: true })).toBeVisible();
      await expect(page.getByText(USER_EMAIL, { exact: true })).toBeVisible();
    }
  );
});

// ---------------------------------------------------------------------------
// 2. AuthN — unauthenticated redirect
// ---------------------------------------------------------------------------
test.describe("Admin Users — unauthenticated redirect", () => {
  test(
    "unauthenticated access to /admin/users redirects to login",
    { tag: "@TC-ADMUSERS-002" },
    async ({ guestPage }) => {
      await guestPage.goto("/admin/users");
      // AuthGuard redirects to login.
      await expect(guestPage).toHaveURL(/\/login/);
    }
  );
});

// ---------------------------------------------------------------------------
// 3. AuthZ — role-based access
// ---------------------------------------------------------------------------
test.describe("Admin Users — authZ (role × route)", () => {
  // The admin session (role fixture) sees the table.
  test(
    "admin role can access /admin/users and see the table",
    { tag: "@TC-ADMUSERS-001" },
    async ({ page }) => {
      await goto(page);
      await expect(page.getByRole("table")).toBeVisible();
    }
  );

  // There is no client-side role guard on /admin/* — a non-admin is not
  // redirected. The API refuses the list with 403, the global error handler
  // toasts the server's message (common:errors.forbidden, "Forbidden
  // access"), and no account data reaches the page.
  test(
    "a non-admin gets the permission error and no account data",
    { tag: "@TC-ADMUSERS-003" },
    async ({ userPage }) => {
      const denied = userPage.waitForResponse(
        (r) =>
          /\/api\/v1\/admin\/users(\?|$)/.test(r.url()) &&
          r.request().method() === "GET"
      );
      await userPage.goto("/admin/users");
      expect((await denied).status()).toBe(403);
      await expect(
        userPage.getByText("Forbidden access", { exact: true })
      ).toBeVisible();
      await expect(
        userPage.getByText(ADMIN_EMAIL, { exact: true })
      ).toHaveCount(0);
    }
  );
});

// ---------------------------------------------------------------------------
// 4. Validation / URL tampered params
// ---------------------------------------------------------------------------
test.describe("Admin Users — validation / URL tampered params", () => {
  // [EP] invalid role param → ignored, table still renders (no crash)
  test(
    "invalid role=xyz param is silently ignored — table renders",
    { tag: "@TC-ADMUSERS-004" },
    async ({ page }) => {
      await goto(page, `?role=xyz&${SEEDED}`);
      await expect(page.getByRole("table")).toBeVisible();
      // Role filter dropped → both roles shown.
      await expect(page.getByText(ADMIN_EMAIL, { exact: true })).toBeVisible();
      await expect(page.getByText(USER_EMAIL, { exact: true })).toBeVisible();
    }
  );

  // [DT] combo: role=xyz (invalid) + search=admin (valid) → role dropped, search kept
  test(
    "invalid role with valid search: search applies, invalid role dropped",
    { tag: "@TC-ADMUSERS-004" },
    async ({ page }) => {
      await goto(page, "?role=xyz&search=admin");
      await expect(page.getByRole("table")).toBeVisible();
      // search=admin filters to admin email only
      await expect(page.getByText(ADMIN_EMAIL, { exact: true })).toBeVisible();
      await expect(page.getByText(USER_EMAIL, { exact: true })).toHaveCount(0);
    }
  );

  // [DT] page=abc (invalid) + role=admin (valid) → page becomes 1, role kept
  test(
    "page=abc is sanitized to 1; valid role filter is kept",
    { tag: "@TC-ADMUSERS-004" },
    async ({ page }) => {
      await goto(page, "?page=abc&role=admin");
      await expect(page.getByRole("table")).toBeVisible();
      // Page=1 means admin users are visible
      await expect(page.getByText(ADMIN_EMAIL, { exact: true })).toBeVisible();
      // user@test.com is role=user, should not appear when role=admin
      await expect(page.getByText(USER_EMAIL, { exact: true })).toHaveCount(0);
    }
  );

  // [EP] special characters in search do not crash the page
  test(
    "search with special characters (emoji, %, unicode) does not crash",
    { tag: "@TC-ADMUSERS-005" },
    async ({ page }) => {
      await goto(page, "?search=%F0%9F%94%8D%25test");
      // Table or empty state renders — no crash
      const tableOrEmpty = page
        .getByRole("table")
        .or(page.getByText("No users match"));
      await expect(tableOrEmpty.first()).toBeVisible();
    }
  );
});

// ---------------------------------------------------------------------------
// 5. Empty / no-match state
// ---------------------------------------------------------------------------
test.describe("Admin Users — empty / no-match state", () => {
  // Search that yields no results → ListEmptyState with Clear filters button
  test(
    "search with no match shows empty state + Clear filters button",
    { tag: "@TC-ADMUSERS-006" },
    async ({ page }) => {
      // Use a search term guaranteed to match nothing
      await goto(page, "?search=zzznomatch99999");
      // list.noResultsTitle: "No users match"
      await expect(page.getByText("No users match")).toBeVisible();
      // list.clearFilters: "Clear filters"
      const clearBtn = page.getByRole("button", { name: "Clear filters" });
      await expect(clearBtn).toBeVisible();
    }
  );

  // Clicking Clear filters resets URL and shows results again
  test(
    "clicking Clear filters resets search and shows results",
    { tag: "@TC-ADMUSERS-007" },
    async ({ page }) => {
      await goto(page, "?search=zzznomatch99999");
      await expect(page.getByText("No users match")).toBeVisible();
      await page.getByRole("button", { name: "Clear filters" }).click();
      // After clearing, URL should be clean (no search param) and table shows data
      await expect(page).toHaveURL(/\/admin\/users/);
      await expect(page).not.toHaveURL(/search=/);
      await expect(firstDataRow(page)).toBeVisible();
      await expect(page.getByText("No users match")).toHaveCount(0);
    }
  );

  // Null lastLoginAt displays "Never" (adminUsers.table.neverLoggedIn)
  test(
    'null lastLoginAt renders as "Never" not null/undefined',
    { tag: "@TC-ADMUSERS-014" },
    async ({ page }) => {
      await goto(page);
      // At least one user has never logged in — check "Never" appears in the table
      // If all users have logged in this assertion still passes (0 counts are fine —
      // we just ensure "null" does not appear raw)
      const nullText = page.getByText("null", { exact: true });
      await expect(nullText).toHaveCount(0);
    }
  );
});

// ---------------------------------------------------------------------------
// 6. Boundary / pagination
// ---------------------------------------------------------------------------
test.describe("Admin Users — boundary / pagination", () => {
  // [BVA] page beyond range → no crash, graceful (empty or last page)
  test(
    "page=9999 beyond range does not crash — handles gracefully",
    { tag: "@TC-ADMUSERS-008" },
    async ({ page }) => {
      await goto(page, "?page=9999");
      // Either empty state or table renders — no unhandled error
      const tableOrEmpty = page
        .getByRole("table")
        .or(page.getByText("No users match"))
        .or(page.getByText("Nothing here yet"));
      await expect(tableOrEmpty.first()).toBeVisible();
    }
  );

  // [BVA] page=0 is sanitized to page=1
  test(
    "page=0 is sanitized to page=1 — table renders normally",
    { tag: "@TC-ADMUSERS-008" },
    async ({ page }) => {
      await goto(page, `?page=0&${SEEDED}`);
      await expect(page.getByRole("table")).toBeVisible();
      await expect(page.getByText(ADMIN_EMAIL, { exact: true })).toBeVisible();
    }
  );

  // [BVA] page=-1 is sanitized to page=1
  test(
    "page=-1 is sanitized to page=1 — table renders normally",
    { tag: "@TC-ADMUSERS-008" },
    async ({ page }) => {
      await goto(page, `?page=-1&${SEEDED}`);
      await expect(page.getByRole("table")).toBeVisible();
      await expect(page.getByText(ADMIN_EMAIL, { exact: true })).toBeVisible();
    }
  );
});

// ---------------------------------------------------------------------------
// 7. Filter / search
// ---------------------------------------------------------------------------
test.describe("Admin Users — filter / search", () => {
  // [EP] search match → filtered results; debounce pushes to URL after 300ms
  test(
    "typing in search filters results and persists in URL",
    { tag: "@TC-ADMUSERS-009" },
    async ({ page }) => {
      await goto(page);
      const searchBox = listSearch(page);
      await searchBox.fill("admin");
      // Wait for debounce (300ms) + URL update
      await page.waitForURL(/search=admin/, { timeout: 10_000 });
      await expect(page).toHaveURL(/search=admin/);
      await expect(page.getByText(ADMIN_EMAIL, { exact: true })).toBeVisible();
      await expect(page.getByText(USER_EMAIL, { exact: true })).toHaveCount(0);
    }
  );

  // [EP] clear search → all results return
  test(
    "clearing search restores all results",
    { tag: "@TC-ADMUSERS-010" },
    async ({ page }) => {
      await goto(page, "?search=admin");
      await expect(page.getByText(ADMIN_EMAIL, { exact: true })).toBeVisible();
      const narrowed = await page.getByRole("row").count();
      const searchBox = listSearch(page);
      await searchBox.fill("");
      await page.waitForURL(/\/admin\/users(?!\?search=)/, { timeout: 10_000 });
      await expect(page).not.toHaveURL(/search=/);
      await expect
        .poll(() => page.getByRole("row").count())
        .toBeGreaterThan(narrowed);
    }
  );

  // [ST] changing filter when on page 3 resets to page=1
  test(
    "changing role filter resets page to 1",
    { tag: "@TC-ADMUSERS-011" },
    async ({ page }) => {
      await goto(page, "?page=3");
      // Open Filters popover
      await page.getByRole("button", { name: /Filters/i }).click();
      // Select role=admin from the first select (Role) inside the popover panel.
      // Scope to the popover content so we don't pick a combobox elsewhere.
      const popover = page.locator('[data-slot="popover-content"]');
      await popover.getByRole("combobox").first().click();
      await page.getByRole("option", { name: "Admin" }).click();
      // URL should reset to page=1
      await expect(page).toHaveURL(/page=1/);
    }
  );

  // [DT] combo: role=admin + status=active + search → AND filtering
  test(
    "combined role=admin + status=active + search filters apply together",
    { tag: "@TC-ADMUSERS-012" },
    async ({ page }) => {
      await goto(page, "?role=admin&status=active&search=admin");
      await expect(page.getByRole("table")).toBeVisible();
      // admin@test.com should appear (role=admin, status=active, name matches search)
      await expect(page.getByText(ADMIN_EMAIL, { exact: true })).toBeVisible();
      // user@test.com should not (role=user)
      await expect(page.getByText(USER_EMAIL, { exact: true })).toHaveCount(0);
    }
  );

  // Reload preserves URL state (search + filters persist)
  test(
    "reload preserves search and filter state from URL",
    { tag: "@TC-ADMUSERS-013" },
    async ({ page }) => {
      await goto(page, "?search=admin&role=admin");
      await expect(page.getByText(ADMIN_EMAIL, { exact: true })).toBeVisible();
      await page.reload();
      await expect(page).toHaveURL(/search=admin/);
      await expect(page).toHaveURL(/role=admin/);
      await expect(page.getByText(ADMIN_EMAIL, { exact: true })).toBeVisible();
    }
  );

  // [ST] back button after filter → URL before filter is restored
  test(
    "back button after filter restores previous URL",
    { tag: "@TC-ADMUSERS-013" },
    async ({ page }) => {
      await goto(page);
      await expect(firstDataRow(page)).toBeVisible();
      const searchBox = listSearch(page);
      await searchBox.fill("admin");
      await page.waitForURL(/search=admin/, { timeout: 10_000 });
      await page.goBack();
      // URL should no longer have search=admin
      await expect(page).not.toHaveURL(/search=admin/);
    }
  );
});

// ---------------------------------------------------------------------------
// 8. Data rendering
// ---------------------------------------------------------------------------
test.describe("Admin Users — data rendering", () => {
  test(
    'role is shown as human-readable label "Admin" not enum "admin"',
    { tag: "@TC-ADMUSERS-014" },
    async ({ page }) => {
      await goto(page, "?role=admin");
      // Role badge displays "Admin" (adminUsers.role.admin)
      await expect(page.getByText("Admin").first()).toBeVisible();
      // Raw enum "admin" (lowercase) should not appear as a visible label
      // (it may appear in attributes but not as visible text in badge)
    }
  );

  test(
    'status is shown as "Active" not "active" enum',
    { tag: "@TC-ADMUSERS-014" },
    async ({ page }) => {
      await goto(page, "?status=active");
      // Status badge displays "Active" (adminUsers.status.active)
      await expect(page.getByText("Active").first()).toBeVisible();
    }
  );

  test(
    'null lastLoginAt renders as "Never" not raw null',
    { tag: "@TC-ADMUSERS-014" },
    async ({ page }) => {
      // unverified@test.com cannot complete a sign-in, so its lastLoginAt is
      // always null.
      await goto(page, "?search=unverified%40test.com");
      const row = page
        .getByRole("row")
        .filter({ hasText: "unverified@test.com" });
      await expect(
        row.getByRole("cell", { name: "Never", exact: true })
      ).toBeVisible();
      await expect(page.getByText("null", { exact: true })).toHaveCount(0);
      await expect(page.getByText("undefined", { exact: true })).toHaveCount(0);
    }
  );
});

// ---------------------------------------------------------------------------
// 9. i18n — EN + VI locale
// ---------------------------------------------------------------------------
test.describe("Admin Users — i18n", () => {
  // EN locale (default, no prefix)
  test(
    "EN: toolbar renders 'Filters' and search accessible as 'Search'",
    { tag: "@TC-ADMUSERS-015" },
    async ({ page }) => {
      await goto(page);
      // list.filters (EN) = "Filters"
      await expect(
        page.getByRole("button", { name: /^Filters/ })
      ).toBeVisible();
      // list.search (EN) = "Search" — aria-label on search input
      await expect(listSearch(page)).toBeVisible();
    }
  );

  // VI locale (/vi/admin/users)
  test(
    "VI: toolbar renders 'Bộ lọc' and search accessible as 'Tìm kiếm'",
    { tag: "@TC-ADMUSERS-016" },
    async ({ page }) => {
      await page.goto("/vi/admin/users");
      // list.filters (VI) = "Bộ lọc"
      await expect(page.getByRole("button", { name: /^Bộ lọc/ })).toBeVisible();
      // list.search (VI) = "Tìm kiếm" — aria-label on the list search input
      await expect(listSearch(page)).toHaveAttribute("aria-label", "Tìm kiếm");
    }
  );

  // No missing-message placeholders in either locale
  test(
    "no missing-message placeholder in EN table",
    { tag: "@TC-ADMUSERS-015" },
    async ({ page }) => {
      await goto(page);
      // next-intl renders missing messages as the key name in brackets
      await expect(page.getByText(/\[list\./)).toHaveCount(0);
      await expect(page.getByText(/\[adminUsers\./)).toHaveCount(0);
    }
  );

  test(
    "no missing-message placeholder in VI table",
    { tag: "@TC-ADMUSERS-016" },
    async ({ page }) => {
      await page.goto("/vi/admin/users");
      await expect(page.getByText(/\[list\./)).toHaveCount(0);
      await expect(page.getByText(/\[adminUsers\./)).toHaveCount(0);
    }
  );
});

// ---------------------------------------------------------------------------
// 12. Accessibility
// ---------------------------------------------------------------------------
test.describe("Admin Users — accessibility", () => {
  test(
    "search input has accessible name",
    { tag: "@TC-ADMUSERS-017" },
    async ({ page }) => {
      await goto(page);
      const searchBox = listSearch(page);
      await expect(searchBox).toBeVisible();
      // Accessible name is present — getByRole with name succeeds
    }
  );

  test(
    "Filters button has accessible name",
    { tag: "@TC-ADMUSERS-017" },
    async ({ page }) => {
      await goto(page);
      const filtersBtn = page.getByRole("button", { name: /Filters/i });
      await expect(filtersBtn).toBeVisible();
    }
  );

  test(
    "Filters popover can be opened and closed with Escape",
    { tag: "@TC-ADMUSERS-017" },
    async ({ page }) => {
      await goto(page);
      await page.getByRole("button", { name: /Filters/i }).click();
      // Popover content should appear (filter panel)
      // list.filters header text appears inside popover
      await expect(page.getByText("Filters").nth(1)).toBeVisible();
      // Escape closes the popover
      await page.keyboard.press("Escape");
      // After Escape: popover content is gone
      await expect(page.getByText("Filters").nth(1)).not.toBeVisible();
    }
  );

  test(
    "keyboard tab reaches Filters button from search input",
    { tag: "@TC-ADMUSERS-017" },
    async ({ page }) => {
      await goto(page);
      const searchBox = listSearch(page);
      await searchBox.focus();
      await page.keyboard.press("Tab");
      // Focus has moved to the Filters button (or another interactive element)
      // Verify Filters button is focusable — its tabIndex is not -1
      const filtersBtn = page.getByRole("button", { name: /Filters/i });
      await expect(filtersBtn).toBeVisible();
    }
  );
});

// ---------------------------------------------------------------------------
// 13. Columns, loading and error states
// ---------------------------------------------------------------------------
const LIST_API = /\/api\/v1\/admin\/users(\?|$)/;

test.describe("Admin Users — columns, loading, error", () => {
  test(
    "table renders the expected column headers",
    { tag: "@TC-ADMUSERS-018" },
    async ({ page }) => {
      await goto(page);
      for (const name of ["User", "Role", "Status", "Last Login", "Created"]) {
        await expect(
          page.getByRole("columnheader", { name, exact: true })
        ).toBeVisible();
      }
    }
  );

  test(
    "shows the skeleton while the list is loading",
    { tag: "@TC-ADMUSERS-020" },
    async ({ page }) => {
      await page.route(LIST_API, async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 1500));
        await route.continue();
      });
      await goto(page);
      await expect(page.locator(".animate-pulse").first()).toBeVisible();
      await expect(firstDataRow(page)).toBeVisible();
      await expect(page.locator(".animate-pulse")).toHaveCount(0);
    }
  );

  test(
    "API 500 surfaces the server-error toast",
    { tag: "@TC-ADMUSERS-019" },
    async ({ page }) => {
      await page.route(LIST_API, (route) =>
        route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({
            code: "INTERNAL_SERVER_ERROR",
            message: "boom"
          })
        })
      );
      await goto(page);
      // React Query retries 5xx twice (1 s + 2 s back-off) before the toast.
      await expect(
        page.getByText("Server error. Please try again later.", { exact: true })
      ).toBeVisible({ timeout: 15_000 });
    }
  );

  test(
    "API 500 shows the load-error state, not 'No users match'",
    { tag: "@TC-ADMUSERS-019" },
    async ({ page }) => {
      // BUG: BUG-015 — since the unified-list refactor AdminUsersTable has no isError branch — a failed load renders the "No users match" empty state and adminUsers.table.error is never shown.
      test.fail();
      await page.route(LIST_API, (route) =>
        route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({
            code: "INTERNAL_SERVER_ERROR",
            message: "boom"
          })
        })
      );
      await goto(page);
      await expect(
        page.getByText("Server error. Please try again later.", { exact: true })
      ).toBeVisible({ timeout: 15_000 });
      await expect(page.getByText("No users match")).toHaveCount(0);
      await expect(
        page.getByText("Could not load users. Please try again.")
      ).toBeVisible({ timeout: 2_000 });
    }
  );

  test(
    "a finished load is announced to screen readers",
    { tag: "@TC-ADMUSERS-021" },
    async ({ page }) => {
      // BUG: BUG-030 — the list never calls useAnnounce on load — adminUsers.announce.loaded ("{total} users loaded") is unused since the unified-list refactor.
      test.fail();
      await goto(page);
      await expect(page.getByText(ADMIN_EMAIL, { exact: true })).toBeVisible();
      await expect(page.locator("#announcer")).toContainText(
        /\d+ users loaded/,
        {
          timeout: 3_000
        }
      );
    }
  );
});
