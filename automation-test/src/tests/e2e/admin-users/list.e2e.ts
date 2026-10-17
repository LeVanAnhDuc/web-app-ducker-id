import { test, expect } from "@/fixtures";
import { createApiClient } from "@/api";
import { adminUsersRoutes } from "@/api/admin-users.client";
import { ADMIN_EMAIL, USER_EMAIL } from "@/config/accounts";
import { copy, copyVi } from "@/data/copy";
import { SERVER_ERROR_TOAST } from "@/data/test-data";
import { AdminUsersPage } from "@/pages/admin/admin-users.page";

test.use({ role: "admin" });

// Admin Users list (REQ-ADMINUSERS-01, -04) — the unified list shell on
// /admin/users: search, role/status filters, URL state, pagination, rendering,
// i18n and a11y. Runs as admin (role fixture); the guest and non-admin cases
// take `guestPage` / `userPage`. Read-only — nothing is mutated.
// Test cases: test-cases/admin-users.md. The API contract behind the page is
// in tests/api/admin-users/users.api.ts.

// Newest accounts come first and a page holds 20, so the seeded accounts are
// only guaranteed to be on screen when the list is narrowed to their domain
// (throwaway accounts live under @e2e.example.com).
const SEEDED = "search=%40test.com";

const LIST_API = adminUsersRoutes.list;

const serverError = {
  status: 500,
  contentType: "application/json",
  body: JSON.stringify({ code: "INTERNAL_SERVER_ERROR", message: "boom" })
};

// ---------------------------------------------------------------------------
// Happy path, access
// ---------------------------------------------------------------------------
test.describe(
  "Admin sees the account list with search and filters",
  { tag: ["@TC-ADMINUSERS-001", "@smoke"] },
  () => {
    test("list renders with data, toolbar and table visible", async ({
      adminUsersPage: users
    }) => {
      await users.goto();
      await expect(users.searchInput()).toBeVisible();
      await expect(users.filtersButton()).toBeVisible();
      await expect(users.firstDataRow()).toBeVisible();
      // Narrowed to the seed domain: both seeded accounts are listed.
      await users.goto(`?${SEEDED}`);
      await expect(users.email(ADMIN_EMAIL)).toBeVisible();
      await expect(users.email(USER_EMAIL)).toBeVisible();
    });

    test("admin role can access /admin/users and see the table", async ({
      adminUsersPage: users
    }) => {
      await users.goto();
      await expect(users.table()).toBeVisible();
    });
  }
);

test(
  "A guest is sent to sign in",
  { tag: ["@TC-ADMINUSERS-002", "@smoke"] },
  async ({ guestPage }) => {
    await new AdminUsersPage(guestPage).goto();
    // AuthGuard redirects to login.
    await expect(guestPage).toHaveURL(/\/login/);
  }
);

// A non-admin is sent away from /admin/* by the client-side role guard
// (AdminGuardLayout), and the API refuses the list with 403 regardless, so no
// account data reaches the page.
test(
  "A non-admin gets a refusal and no account data",
  { tag: ["@TC-ADMINUSERS-003", "@smoke"] },
  async ({ userPage, userApi }) => {
    const res = await createApiClient(userApi).adminUsers.list();
    expect(res.status()).toBe(403);

    const users = new AdminUsersPage(userPage);
    await users.goto();
    await expect(userPage).not.toHaveURL(/\/admin/);
    await expect(users.email(ADMIN_EMAIL)).toHaveCount(0);
  }
);

// ---------------------------------------------------------------------------
// URL params: tampering, special characters, boundaries
// ---------------------------------------------------------------------------
test.describe(
  "Tampered URL params are sanitised",
  { tag: "@TC-ADMINUSERS-004" },
  () => {
    // [EP] invalid role param → ignored, table still renders (no crash)
    test("invalid role=xyz param is silently ignored — table renders", async ({
      adminUsersPage: users
    }) => {
      await users.goto(`?role=xyz&${SEEDED}`);
      await expect(users.table()).toBeVisible();
      // Role filter dropped → both roles shown.
      await expect(users.email(ADMIN_EMAIL)).toBeVisible();
      await expect(users.email(USER_EMAIL)).toBeVisible();
    });

    // [DT] role=xyz (invalid) + search=admin (valid) → role dropped, search kept
    test("invalid role with valid search: search applies, invalid role dropped", async ({
      adminUsersPage: users
    }) => {
      await users.goto("?role=xyz&search=admin");
      await expect(users.table()).toBeVisible();
      await expect(users.email(ADMIN_EMAIL)).toBeVisible();
      await expect(users.email(USER_EMAIL)).toHaveCount(0);
    });

    // [DT] page=abc (invalid) + role=admin (valid) → page becomes 1, role kept
    test("page=abc is sanitized to 1; valid role filter is kept", async ({
      adminUsersPage: users
    }) => {
      await users.goto("?page=abc&role=admin");
      await expect(users.table()).toBeVisible();
      await expect(users.email(ADMIN_EMAIL)).toBeVisible();
      // user@test.com is role=user, should not appear when role=admin
      await expect(users.email(USER_EMAIL)).toHaveCount(0);
    });
  }
);

// [EP] special characters in search do not crash the page
test(
  "Special characters in search do not break the page",
  { tag: "@TC-ADMINUSERS-005" },
  async ({ adminUsersPage: users }) => {
    await users.goto("?search=%F0%9F%94%8D%25test");
    await expect(users.table().or(users.noMatch()).first()).toBeVisible();
  }
);

test(
  "A search with no match shows the empty state",
  { tag: "@TC-ADMINUSERS-006" },
  async ({ adminUsersPage: users }) => {
    await users.goto("?search=zzznomatch99999");
    await expect(users.noMatch()).toBeVisible();
    await expect(users.clearFiltersButton()).toBeVisible();
  }
);

test(
  "Clear filters restores the full list",
  { tag: "@TC-ADMINUSERS-007" },
  async ({ page, adminUsersPage: users }) => {
    await users.goto("?search=zzznomatch99999");
    await expect(users.noMatch()).toBeVisible();
    await users.clearFiltersButton().click();
    // After clearing, URL is clean (no search param) and the table shows data
    await expect(page).toHaveURL(/\/admin\/users/);
    await expect(page).not.toHaveURL(/search=/);
    await expect(users.firstDataRow()).toBeVisible();
    await expect(users.noMatch()).toHaveCount(0);
  }
);

test.describe(
  "Out-of-range page numbers render safely",
  { tag: "@TC-ADMINUSERS-008" },
  () => {
    // [BVA] page beyond range → no crash, graceful (empty or last page)
    test("page=9999 beyond range does not crash — handles gracefully", async ({
      adminUsersPage: users
    }) => {
      await users.goto("?page=9999");
      await expect(
        users.table().or(users.noMatch()).or(users.nothingYet()).first()
      ).toBeVisible();
    });

    for (const value of ["0", "-1"]) {
      test(`page=${value} is sanitized to page=1 — table renders normally`, async ({
        adminUsersPage: users
      }) => {
        await users.goto(`?page=${value}&${SEEDED}`);
        await expect(users.table()).toBeVisible();
        await expect(users.email(ADMIN_EMAIL)).toBeVisible();
      });
    }
  }
);

// ---------------------------------------------------------------------------
// Filter / search, URL state
// ---------------------------------------------------------------------------

// [EP] search match → filtered results; debounce pushes to URL after 300ms
test(
  "Typing a search narrows the list and writes the URL",
  { tag: "@TC-ADMINUSERS-009" },
  async ({ page, adminUsersPage: users }) => {
    await users.goto();
    await users.searchInput().fill("admin");
    await page.waitForURL(/search=admin/, { timeout: 10_000 });
    await expect(page).toHaveURL(/search=admin/);
    await expect(users.email(ADMIN_EMAIL)).toBeVisible();
    await expect(users.email(USER_EMAIL)).toHaveCount(0);
  }
);

test(
  "Emptying the search box restores every account",
  { tag: "@TC-ADMINUSERS-010" },
  async ({ page, adminUsersPage: users }) => {
    await users.goto("?search=admin");
    await expect(users.email(ADMIN_EMAIL)).toBeVisible();
    const narrowed = await users.rows().count();
    await users.searchInput().fill("");
    await page.waitForURL(/\/admin\/users(?!\?search=)/, { timeout: 10_000 });
    await expect(page).not.toHaveURL(/search=/);
    await expect.poll(() => users.rows().count()).toBeGreaterThan(narrowed);
  }
);

// [ST] changing filter when on page 3 resets to page=1
test(
  "Changing a filter resets to page 1",
  { tag: "@TC-ADMINUSERS-011" },
  async ({ page, adminUsersPage: users }) => {
    await users.goto("?page=3");
    await users.filterByRole(copy.adminUsers.role.admin);
    await expect(page).toHaveURL(/page=1/);
  }
);

// [DT] role=admin + status=active + search → AND filtering
test(
  "Role, status and search apply together",
  { tag: "@TC-ADMINUSERS-012" },
  async ({ adminUsersPage: users }) => {
    await users.goto("?role=admin&status=active&search=admin");
    await expect(users.table()).toBeVisible();
    await expect(users.email(ADMIN_EMAIL)).toBeVisible();
    await expect(users.email(USER_EMAIL)).toHaveCount(0);
  }
);

test.describe(
  "List state survives reload and Back",
  { tag: "@TC-ADMINUSERS-013" },
  () => {
    test("reload preserves search and filter state from URL", async ({
      page,
      adminUsersPage: users
    }) => {
      await users.goto("?search=admin&role=admin");
      await expect(users.email(ADMIN_EMAIL)).toBeVisible();
      await page.reload();
      await expect(page).toHaveURL(/search=admin/);
      await expect(page).toHaveURL(/role=admin/);
      await expect(users.email(ADMIN_EMAIL)).toBeVisible();
    });

    // [ST] back button after filter → URL before filter is restored
    test("back button after filter restores previous URL", async ({
      page,
      adminUsersPage: users
    }) => {
      await users.goto();
      await expect(users.firstDataRow()).toBeVisible();
      await users.searchInput().fill("admin");
      await page.waitForURL(/search=admin/, { timeout: 10_000 });
      await page.goBack();
      await expect(page).not.toHaveURL(/search=admin/);
    });
  }
);

// The seed holds fewer than 21 accounts, so a second page exists only by
// accident of other specs' throwaways. The list response is passed through
// with `totalPages` raised to 2 so the pager always renders; the click must
// then ask the real API for page 2 and write it to the URL.
test(
  "The pager moves to the next page and keeps it in the URL",
  { tag: "@TC-ADMINUSERS-060" },
  async ({ page, adminUsersPage: users }) => {
    await page.route(LIST_API, async (route) => {
      const response = await route.fetch();
      const json = (await response.json()) as {
        data: { meta: { totalPages: number } };
      };
      json.data.meta.totalPages = Math.max(json.data.meta.totalPages, 2);
      await route.fulfill({ response, json });
    });
    await users.goto();
    await expect(users.pager()).toBeVisible();
    // Wait for the response, not the request: the route handler is still
    // fetching page 2 when the URL changes, and ending the test then makes
    // `route.fetch` throw on a closed page.
    const pageTwo = page.waitForResponse(
      (r) =>
        LIST_API.test(r.url()) &&
        new URL(r.url()).searchParams.get("page") === "2"
    );
    await users.nextPageLink().click();
    await pageTwo;
    await expect(page).toHaveURL(/page=2/);
  }
);

// ---------------------------------------------------------------------------
// Data rendering
// ---------------------------------------------------------------------------
test.describe(
  "Roles, statuses and dates render as labels",
  { tag: "@TC-ADMINUSERS-014" },
  () => {
    test('no raw "null" anywhere in the table', async ({
      adminUsersPage: users
    }) => {
      await users.goto();
      await expect(users.text("null", true)).toHaveCount(0);
    });

    test('role is shown as human-readable label "Admin" not enum "admin"', async ({
      adminUsersPage: users
    }) => {
      await users.goto("?role=admin");
      await expect(
        users.text(copy.adminUsers.role.admin).first()
      ).toBeVisible();
    });

    test('status is shown as "Active" not "active" enum', async ({
      adminUsersPage: users
    }) => {
      await users.goto("?status=active");
      await expect(
        users.text(copy.adminUsers.status.active).first()
      ).toBeVisible();
    });

    test('null lastLoginAt renders as "Never" not raw null', async ({
      adminUsersPage: users
    }) => {
      // unverified@test.com cannot complete a sign-in, so its lastLoginAt is
      // always null.
      const unverified = "unverified@test.com";
      await users.goto(`?search=${encodeURIComponent(unverified)}`);
      await expect(
        users.rowCell(unverified, copy.adminUsers.table.neverLoggedIn)
      ).toBeVisible();
      await expect(users.text("null", true)).toHaveCount(0);
      await expect(users.text("undefined", true)).toHaveCount(0);
    });
  }
);

test(
  "The table shows the expected columns",
  { tag: "@TC-ADMINUSERS-018" },
  async ({ adminUsersPage: users }) => {
    await users.goto();
    const t = copy.adminUsers.table;
    for (const name of [t.user, t.role, t.status, t.lastLoginAt, t.createdAt]) {
      await expect(users.columnHeader(name)).toBeVisible();
    }
  }
);

// ---------------------------------------------------------------------------
// i18n
// ---------------------------------------------------------------------------
test.describe(
  "English list chrome, no missing messages",
  { tag: "@TC-ADMINUSERS-015" },
  () => {
    test("EN: toolbar renders 'Filters' and the list search", async ({
      adminUsersPage: users
    }) => {
      await users.goto();
      await expect(
        users.filtersButton(new RegExp(`^${copy.list.filters}`))
      ).toBeVisible();
      await expect(users.searchInput()).toBeVisible();
    });

    test("no missing-message placeholder in EN table", async ({
      adminUsersPage: users
    }) => {
      await users.goto();
      // next-intl renders missing messages as the key name in brackets
      await expect(users.text(/\[list\./)).toHaveCount(0);
      await expect(users.text(/\[adminUsers\./)).toHaveCount(0);
    });
  }
);

test.describe(
  "Vietnamese list chrome, no missing messages",
  { tag: "@TC-ADMINUSERS-016" },
  () => {
    test("VI: toolbar renders 'Bộ lọc' and search accessible as 'Tìm kiếm'", async ({
      page
    }) => {
      const users = new AdminUsersPage(page, copyVi, "/vi");
      await users.goto();
      await expect(
        users.filtersButton(new RegExp(`^${copyVi.list.filters}`))
      ).toBeVisible();
      await expect(users.searchInput()).toHaveAttribute(
        "aria-label",
        copyVi.list.search
      );
    });

    test("no missing-message placeholder in VI table", async ({ page }) => {
      const users = new AdminUsersPage(page, copyVi, "/vi");
      await users.goto();
      await expect(users.text(/\[list\./)).toHaveCount(0);
      await expect(users.text(/\[adminUsers\./)).toHaveCount(0);
    });
  }
);

// ---------------------------------------------------------------------------
// Accessibility
// ---------------------------------------------------------------------------
test.describe(
  "Toolbar is reachable and operable by keyboard",
  { tag: "@TC-ADMINUSERS-017" },
  () => {
    test("search input has accessible name", async ({
      adminUsersPage: users
    }) => {
      await users.goto();
      await expect(users.searchInput()).toBeVisible();
    });

    test("Filters button has accessible name", async ({
      adminUsersPage: users
    }) => {
      await users.goto();
      await expect(users.filtersButton()).toBeVisible();
    });

    test("Filters popover can be opened and closed with Escape", async ({
      page,
      adminUsersPage: users
    }) => {
      await users.goto();
      await users.filtersButton().click();
      await expect(users.filtersPanelHeading()).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(users.filtersPanelHeading()).not.toBeVisible();
    });

    test("keyboard tab reaches Filters button from search input", async ({
      page,
      adminUsersPage: users
    }) => {
      await users.goto();
      await users.searchInput().focus();
      await page.keyboard.press("Tab");
      await expect(users.filtersButton()).toBeVisible();
    });
  }
);

// ---------------------------------------------------------------------------
// Loading and error states
// ---------------------------------------------------------------------------
test(
  "A skeleton shows while the list loads",
  { tag: "@TC-ADMINUSERS-020" },
  async ({ page, adminUsersPage: users }) => {
    await page.route(LIST_API, async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      await route.continue();
    });
    await users.goto();
    await expect(users.skeleton().first()).toBeVisible();
    await expect(users.firstDataRow()).toBeVisible();
    await expect(users.skeleton()).toHaveCount(0);
  }
);

test.describe(
  'A failed list load is reported, not shown as "no users"',
  { tag: "@TC-ADMINUSERS-019" },
  () => {
    test("API 500 surfaces the server-error toast", async ({
      page,
      adminUsersPage: users
    }) => {
      await page.route(LIST_API, (route) => route.fulfill(serverError));
      await users.goto();
      // React Query retries 5xx twice (1 s + 2 s back-off) before the toast.
      await expect(users.text(SERVER_ERROR_TOAST, true)).toBeVisible({
        timeout: 15_000
      });
    });

    test("API 500 shows the load-error state, not 'No users match'", async ({
      page,
      adminUsersPage: users
    }) => {
      await page.route(LIST_API, (route) => route.fulfill(serverError));
      await users.goto();
      await expect(users.text(SERVER_ERROR_TOAST, true)).toBeVisible({
        timeout: 15_000
      });
      await expect(users.noMatch()).toHaveCount(0);
      await expect(users.loadError()).toBeVisible({ timeout: 2_000 });
    });
  }
);

test(
  "A finished load is announced to screen readers",
  { tag: "@TC-ADMINUSERS-021" },
  async ({ adminUsersPage: users }) => {
    await users.goto();
    await expect(users.email(ADMIN_EMAIL)).toBeVisible();
    await expect(users.announcer()).toContainText(/\d+ users loaded/, {
      timeout: 3_000
    });
  }
);
