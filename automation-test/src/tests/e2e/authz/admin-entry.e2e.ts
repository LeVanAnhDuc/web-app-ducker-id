import { test, expect } from "@/fixtures";
import { ADMIN, USER } from "@/config/accounts";
import { AdminDashboardPage } from "@/pages/admin/admin-dashboard.page";
import { HomePage } from "@/pages/dashboard/home.page";

// The user menu's way into the admin console (REQ-AUTHZ-04) —
// client/src/components/UserMenu/mains/AdminEntryItem renders "Admin Console"
// only when the session's role is admin, linking to /admin.
// Test case: test-cases/authz.md (TC-AUTHZ-021).

test(
  "The Admin Console entry appears in the user menu only for admins",
  { tag: "@TC-AUTHZ-021" },
  async ({ userPage, adminPage }) => {
    const asUser = new HomePage(userPage);
    await asUser.goto();
    await asUser.userMenu.open();
    // The menu is open and the session hydrated before checking an absence.
    await expect(asUser.userMenu.entry(USER.email)).toBeVisible();
    await expect(asUser.userMenu.adminConsoleItem()).toHaveCount(0);

    const asAdmin = new HomePage(adminPage);
    await asAdmin.goto();
    await asAdmin.userMenu.open();
    await expect(asAdmin.userMenu.entry(ADMIN.email)).toBeVisible();
    await asAdmin.userMenu.adminConsoleItem().click();
    await expect(adminPage).toHaveURL(/\/admin$/);
    await expect(new AdminDashboardPage(adminPage).heading()).toBeVisible();
  }
);
