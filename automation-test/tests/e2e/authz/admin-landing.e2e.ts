import { test, expect } from "@fixtures";

test.use({ role: "admin" });

// /admin — the admin console landing page (REQ-AUTHZ-03).
// Test cases: test-cases/authz.md (TC-AUTHZ-014 … TC-AUTHZ-017).
//
// Cards come from client/src/dataSources/AdminDashboard, copy from
// client/src/locales/{en,vi}/adminDashboard.json. Each card is a title, a
// description and an "Open" link; the page is server-rendered, read-only.

const CARDS = [
  { title: "App Registry", href: "/admin/apps" },
  { title: "Entitlements", href: "/admin/entitlements" },
  { title: "Users", href: "/admin/users" },
  { title: "Contact Inbox", href: "/admin/contact" },
  { title: "Login History", href: "/admin/login-history" }
] as const;

const main = (page: import("@playwright/test").Page) =>
  page.locator("#main-content");

test.describe("Admin landing page", () => {
  test(
    "shows the Admin Console with a card and an Open link per admin area",
    { tag: ["@TC-AUTHZ-014", "@smoke"] },
    async ({ page }) => {
      await page.goto("/admin");
      await expect(
        page.getByRole("heading", { name: "Admin Console" })
      ).toBeVisible();

      const openLinks = main(page).getByRole("link", { name: "Open" });
      await expect(openLinks).toHaveCount(CARDS.length);
      for (const [index, card] of CARDS.entries()) {
        await expect(
          main(page).getByText(card.title, { exact: true })
        ).toBeVisible();
        await expect(openLinks.nth(index)).toHaveAttribute("href", card.href);
      }
    }
  );

  for (const card of CARDS) {
    test(
      `the ${card.title} card opens ${card.href}`,
      { tag: "@TC-AUTHZ-015" },
      async ({ page }) => {
        await page.goto("/admin");
        const index = CARDS.findIndex((c) => c.href === card.href);
        await main(page).getByRole("link", { name: "Open" }).nth(index).click();
        await expect(page).toHaveURL(new RegExp(`${card.href}$`));
      }
    );
  }

  test(
    "the landing page also links to the categories area",
    { tag: "@TC-AUTHZ-016" },
    async ({ page }) => {
      // BUG: BUG-029 — /admin has no Categories card — ADMIN_DASHBOARD_CARDS lists 5 of the 6 admin areas (the sidebar has all 6).
      test.fail();
      await page.goto("/admin");
      await expect(
        main(page).locator('a[href="/admin/categories"]')
      ).toHaveCount(1, { timeout: 3_000 });
    }
  );

  test(
    "renders in Vietnamese with locale-prefixed links",
    { tag: "@TC-AUTHZ-017" },
    async ({ page }) => {
      await page.goto("/vi/admin");
      await expect(
        page.getByRole("heading", { name: "Bảng quản trị" })
      ).toBeVisible();
      await expect(
        main(page).getByText("Đăng ký ứng dụng", { exact: true })
      ).toBeVisible();
      const open = main(page).getByRole("link", { name: "Mở" });
      await expect(open).toHaveCount(CARDS.length);
      await expect(open.first()).toHaveAttribute("href", "/vi/admin/apps");
    }
  );

  test(
    "the sidebar Dashboard entry leads back to the landing page",
    { tag: "@TC-AUTHZ-015" },
    async ({ page }) => {
      await page.goto("/admin/users");
      await page.getByRole("link", { name: "Dashboard", exact: true }).click();
      await expect(page).toHaveURL(/\/admin$/);
      await expect(
        page.getByRole("heading", { name: "Admin Console" })
      ).toBeVisible();
    }
  );
});
