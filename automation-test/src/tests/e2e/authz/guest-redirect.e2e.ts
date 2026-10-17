import { test, expect } from "@/fixtures";

test.use({ role: "guest" });

// A guest (no refresh cookie) is sent to the login screen from every admin
// page, in both locales (REQ-AUTHZ-01).
// Test cases: test-cases/authz.md (TC-AUTHZ-006, TC-AUTHZ-013).
//
// AuthGuardLayout / SessionGate own this redirect (src/middleware.ts only
// routes locales), so it happens client-side after the session bootstrap
// fails — the assertion waits for the URL, not for a server 30x.

const ADMIN_PAGES = [
  "/admin",
  "/admin/apps",
  "/admin/categories",
  "/admin/entitlements",
  "/admin/users",
  "/admin/login-history",
  "/admin/contact"
] as const;

test.describe("A guest opening any admin page lands on login", () => {
  for (const path of ADMIN_PAGES) {
    test(
      `a guest opening ${path} lands on the login screen`,
      { tag: ["@TC-AUTHZ-013", "@smoke"] },
      async ({ page, adminShell }) => {
        await page.goto(path);
        await expect(page).toHaveURL(/\/login/);
        await expect(adminShell.backToDashboardLink()).toHaveCount(0);
      }
    );
  }

  test(
    "a guest opening a Vietnamese admin page lands on the Vietnamese login",
    { tag: ["@TC-AUTHZ-013", "@smoke"] },
    async ({ page }) => {
      await page.goto("/vi/admin/apps");
      await expect(page).toHaveURL(/\/vi\/login/);
    }
  );
});

test(
  "A guest opening /admin/categories is sent to login",
  { tag: "@TC-AUTHZ-006" },
  async ({ adminCategoriesPage, page }) => {
    await adminCategoriesPage.goto();
    await expect(page).toHaveURL(/\/login/);
  }
);
