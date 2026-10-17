import { test, expect } from "@/fixtures";
import type { APIResponse } from "@playwright/test";
import { createApiClient, type ApiClient } from "@/api";
import { errorOf } from "@/api/response";
import { ADMIN } from "@/config/accounts";
import { copy } from "@/data/copy";

// A signed-in NON-admin must not reach admin data (REQ-AUTHZ-02).
// Runs as a regular user — the default `role` of @/fixtures — on purpose: the
// denial is only observable with a non-admin session. Admin-only calls use the
// `userApi` fixture (user@test.com's Bearer token).
// Test cases: test-cases/authz.md (TC-AUTHZ-001, TC-AUTHZ-018).
//
// Confirmed behaviour (observed live, not assumed):
//   * There is NO client-side role guard for /admin/*. The (admin) route-group
//     layout only wraps AdminLayout; the private layout enforces
//     AUTHENTICATION (AuthGuardLayout), not AUTHORIZATION. A non-admin who
//     opens an admin route is NOT redirected — the URL stays on /admin/* and
//     the admin shell renders. TC-AUTHZ-018 records that gap as a bug.
//   * Authorization is enforced by the BACKEND: the page's React Query hooks
//     fire and the API answers 403 AUTH_ADMIN_ONLY.
//   * query-client.ts turns the 403 into a transient sonner toast, which
//     auto-dismisses — asserting it is flaky. Each page instead settles into a
//     STABLE deny state asserted per route (an empty list), and the
//     admin-only marker (admin@test.com) never renders.

/** Seeded admin-only data that a non-admin must never see rendered. */
const ADMIN_DATA_MARKER = ADMIN.email;

/** Initials of the seeded user ("Test User") in the header avatar. */
const USER_INITIALS = "TU";

// Each admin list page + the STABLE deny signal it settles into for a
// non-admin (observed live) + the admin endpoint its hook calls.
const ADMIN_ROUTES: readonly {
  route: string;
  denySignal: string;
  read: (api: ApiClient) => Promise<APIResponse>;
}[] = [
  {
    route: "/admin/users",
    denySignal: copy.adminUsers.table.empty,
    read: (api) => api.adminUsers.list()
  },
  {
    route: "/admin/apps",
    denySignal: copy.adminApps.table.empty,
    read: (api) => api.adminApps.list()
  },
  {
    route: "/admin/login-history",
    denySignal: copy.loginHistory.table.empty,
    read: (api) => api.adminLoginHistory.list()
  },
  {
    route: "/admin/categories",
    denySignal: copy.adminCategories.empty.title,
    read: (api) => api.adminCategories.list()
  },
  {
    route: "/admin/contact",
    denySignal: copy.contactAdmin.admin.list.table.empty,
    read: (api) => api.contact.adminList()
  }
];

test.describe("A non-admin opening an admin page never sees admin data", () => {
  for (const { route, denySignal, read } of ADMIN_ROUTES) {
    test(
      `non-admin is denied admin data at ${route}`,
      { tag: ["@TC-AUTHZ-001", "@smoke"] },
      async ({ page, adminShell, userApi }) => {
        await page.goto(route);

        // No FE guard => the non-admin is NOT redirected; URL stays on the admin route.
        await expect(page).toHaveURL(
          new RegExp(route.replace(/\//g, "\\/") + "$")
        );

        // Stable deny state for this route (empty state). Unlike the transient
        // permission toast, it persists.
        await expect(adminShell.text(denySignal).first()).toBeVisible();

        // Protected admin-only data never renders for a non-admin.
        await expect(
          adminShell.text(ADMIN_DATA_MARKER, { exact: true })
        ).toHaveCount(0);

        // The BE contract the page relies on: 403 AUTH_ADMIN_ONLY for a user token.
        const res = await read(createApiClient(userApi));
        expect(res.status()).toBe(403);
        expect((await errorOf(res)).code).toBe("AUTH_ADMIN_ONLY");
      }
    );
  }

  test(
    "non-admin's entitlement picker never lists any account",
    { tag: ["@TC-AUTHZ-001", "@smoke"] },
    async ({ page, adminEntitlementsPage, adminShell }) => {
      await adminEntitlementsPage.goto();
      await expect(page).toHaveURL(/\/admin\/entitlements$/);
      await adminEntitlementsPage.pickerSearch().fill("admin");
      await expect(adminEntitlementsPage.noResults()).toBeVisible();
      await expect(
        adminShell.text(ADMIN_DATA_MARKER, { exact: true })
      ).toHaveCount(0);
    }
  );
});

test(
  "A non-admin is kept out of the admin console shell",
  { tag: "@TC-AUTHZ-018" },
  async ({ adminDashboardPage: dashboard }) => {
    // no client-side role guard — a non-admin gets the full admin shell ("Admin Mode", sidebar, landing cards) on /admin/*.
    // BUG: defects/authz.md#bug-authz-02
    test.fail();
    await dashboard.goto();
    // Wait until the session has hydrated (the header avatar shows the
    // user's initials on every private shell) — before that an absence
    // check passes vacuously.
    await expect(
      dashboard.userMenu.initials(USER_INITIALS).first()
    ).toBeVisible();
    await expect(dashboard.shell.modeBadge()).toHaveCount(0, {
      timeout: 3_000
    });
  }
);
