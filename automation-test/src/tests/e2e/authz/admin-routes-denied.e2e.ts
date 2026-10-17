import { test, expect } from "@/fixtures";
import type { APIResponse } from "@playwright/test";
import { createApiClient, type ApiClient } from "@/api";
import { errorOf } from "@/api/response";
import { ADMIN } from "@/config/accounts";

// A signed-in NON-admin must not reach admin data (REQ-AUTHZ-02).
// Runs as a regular user — the default `role` of @/fixtures — on purpose: the
// denial is only observable with a non-admin session. Admin-only calls use the
// `userApi` fixture (user@test.com's Bearer token).
// Test cases: test-cases/authz.md (TC-AUTHZ-001, TC-AUTHZ-018).
//
// Behaviour:
//   * The (admin) route group is wrapped in AdminGuardLayout: a signed-in
//     non-admin who opens /admin/* is sent to the home page and the admin
//     shell never renders (TC-AUTHZ-018).
//   * Authorization is still enforced by the BACKEND: every admin endpoint the
//     pages read answers 403 AUTH_ADMIN_ONLY for a user token.

/** Seeded admin-only data that a non-admin must never see rendered. */
const ADMIN_DATA_MARKER = ADMIN.email;

/** Initials of the seeded user ("Test User") in the header avatar. */
const USER_INITIALS = "TU";

// Each admin page + the admin endpoint its hook calls.
const ADMIN_ROUTES: readonly {
  route: string;
  read: (api: ApiClient) => Promise<APIResponse>;
}[] = [
  { route: "/admin/users", read: (api) => api.adminUsers.list() },
  { route: "/admin/apps", read: (api) => api.adminApps.list() },
  {
    route: "/admin/login-history",
    read: (api) => api.adminLoginHistory.list()
  },
  { route: "/admin/categories", read: (api) => api.adminCategories.list() },
  { route: "/admin/contact", read: (api) => api.contact.adminList() }
];

test.describe("A non-admin opening an admin page never sees admin data", () => {
  for (const { route, read } of ADMIN_ROUTES) {
    test(
      `non-admin is denied admin data at ${route}`,
      { tag: ["@TC-AUTHZ-001", "@smoke"] },
      async ({ page, adminShell, userApi }) => {
        await page.goto(route);

        // The client-side role guard sends the non-admin away from /admin/*.
        await expect(page).not.toHaveURL(/\/admin/);
        await expect(adminShell.modeBadge()).toHaveCount(0);

        // Protected admin-only data never renders for a non-admin.
        await expect(
          adminShell.text(ADMIN_DATA_MARKER, { exact: true })
        ).toHaveCount(0);

        // The BE contract behind the guard: 403 AUTH_ADMIN_ONLY for a user token.
        const res = await read(createApiClient(userApi));
        expect(res.status()).toBe(403);
        expect((await errorOf(res)).code).toBe("AUTH_ADMIN_ONLY");
      }
    );
  }

  test(
    "non-admin never reaches the entitlement picker",
    { tag: ["@TC-AUTHZ-001", "@smoke"] },
    async ({ page, adminEntitlementsPage, adminShell }) => {
      await adminEntitlementsPage.goto();
      await expect(page).not.toHaveURL(/\/admin/);
      await expect(adminEntitlementsPage.pickerSearch()).toHaveCount(0);
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
