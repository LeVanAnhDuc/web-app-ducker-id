import { test, expect } from "@/fixtures";
import { copy, copyVi } from "@/data/copy";
import { AdminDashboardPage } from "@/pages/admin/admin-dashboard.page";

test.use({ role: "admin" });

// /admin — the admin console landing page (REQ-AUTHZ-03) and its shell
// (REQ-AUTHZ-06). Test cases: test-cases/authz.md (TC-AUTHZ-014 … 017, 022).
//
// Cards come from client/src/dataSources/AdminDashboard, copy from
// client/src/locales/{en,vi}/adminDashboard.json. Each card is a title, a
// description and an "Open" link; the page is server-rendered, read-only.

const cards = copy.adminDashboard.cards;
const CARDS = [
  { title: cards.apps.title, href: "/admin/apps" },
  { title: cards.categories.title, href: "/admin/categories" },
  { title: cards.entitlements.title, href: "/admin/entitlements" },
  { title: cards.users.title, href: "/admin/users" },
  { title: cards.contacts.title, href: "/admin/contact" },
  { title: cards.loginHistory.title, href: "/admin/login-history" }
] as const;

test(
  "/admin shows the Admin Console with a card per area",
  { tag: ["@TC-AUTHZ-014", "@smoke"] },
  async ({ adminDashboardPage: dashboard }) => {
    await dashboard.goto();
    await expect(dashboard.heading()).toBeVisible();

    const openLinks = dashboard.openLinks();
    await expect(openLinks).toHaveCount(CARDS.length);
    for (const [index, card] of CARDS.entries()) {
      await expect(dashboard.cardTitle(card.title)).toBeVisible();
      await expect(openLinks.nth(index)).toHaveAttribute("href", card.href);
    }
  }
);

test.describe("Each landing card opens its area, and the sidebar leads back", () => {
  for (const card of CARDS) {
    test(
      `the ${card.title} card opens ${card.href}`,
      { tag: "@TC-AUTHZ-015" },
      async ({ adminDashboardPage: dashboard, page }) => {
        await dashboard.goto();
        const index = CARDS.findIndex((c) => c.href === card.href);
        await dashboard.openLinks().nth(index).click();
        await expect(page).toHaveURL(new RegExp(`${card.href}$`));
      }
    );
  }

  test(
    "the sidebar Dashboard entry leads back to the landing page",
    { tag: "@TC-AUTHZ-015" },
    async ({ adminUsersPage, adminDashboardPage: dashboard, page }) => {
      await adminUsersPage.goto();
      await dashboard.sidebar.dashboardLink().click();
      await expect(page).toHaveURL(/\/admin$/);
      await expect(dashboard.heading()).toBeVisible();
    }
  );
});

test(
  "The landing page links to the categories area",
  { tag: "@TC-AUTHZ-016" },
  async ({ adminDashboardPage: dashboard }) => {
    await dashboard.goto();
    await expect(dashboard.areaLink("/admin/categories")).toHaveCount(1, {
      timeout: 3_000
    });
  }
);

test(
  "The landing page renders in Vietnamese",
  { tag: "@TC-AUTHZ-017" },
  async ({ page }) => {
    const dashboard = new AdminDashboardPage(page, copyVi, "/vi");
    await dashboard.goto();
    await expect(dashboard.heading()).toBeVisible();
    await expect(
      dashboard.cardTitle(copyVi.adminDashboard.cards.apps.title)
    ).toBeVisible();
    const open = dashboard.openLinks();
    await expect(open).toHaveCount(CARDS.length);
    await expect(open.first()).toHaveAttribute("href", "/vi/admin/apps");
  }
);

test(
  "Back to User Dashboard leaves the admin console",
  { tag: "@TC-AUTHZ-022" },
  async ({ adminDashboardPage: dashboard, page }) => {
    await dashboard.goto();
    await expect(dashboard.heading()).toBeVisible();
    await expect(dashboard.shell.modeBadge()).toBeVisible();

    await dashboard.shell.backToDashboardLink().click();
    await expect(page).toHaveURL(/\/$/);
    await expect(dashboard.shell.modeBadge()).toHaveCount(0);
  }
);
