import { test, expect } from "@/fixtures";
import { Announcer } from "@/components/announcer.component";
import { UserMenu } from "@/components/user-menu.component";
import { copy, copyVi, fill } from "@/data/copy";
import { AppsPage } from "@/pages/dashboard/apps.page";
import { LoginPage } from "@/pages/auth/login.page";

// Language switch from the user menu — en has no URL prefix, vi lives under
// /vi (next-intl `as-needed`). Test cases: test-cases/settings.md (Ngôn ngữ).
// Runs as the seeded `user`; switching language changes no account state.

test(
  "Switching to Tiếng Việt moves to /vi and translates the page",
  { tag: ["@TC-SETTINGS-020", "@smoke"] },
  async ({ appsPage, page }) => {
    await appsPage.goto("?search=idms");
    await expect(appsPage.sidebarLink("home")).toBeVisible();

    await appsPage.userMenu.chooseLanguage("vi");

    await expect(page).toHaveURL(/\/vi\/apps\?search=idms$/);
    await expect(new AppsPage(page, "vi").sidebarLink("home")).toBeVisible();
    await expect(appsPage.documentRoot()).toHaveAttribute("lang", "vi");
  }
);

test(
  "Switching back to English drops the prefix",
  { tag: ["@TC-SETTINGS-021"] },
  async ({ page }) => {
    const viApps = new AppsPage(page, "vi");
    await viApps.goto();
    await new UserMenu(page, copyVi).chooseLanguage("en");

    await expect(page).toHaveURL((url) => url.pathname === "/apps");
    await expect(new AppsPage(page).sidebarLink("home")).toBeVisible();
    await expect(viApps.documentRoot()).toHaveAttribute("lang", "en");
  }
);

test(
  "The active language is marked; picking it again is a no-op",
  { tag: ["@TC-SETTINGS-022"] },
  async ({ appsPage, page }) => {
    await appsPage.goto();
    await appsPage.userMenu.openLanguageMenu();
    await expect(appsPage.userMenu.languageOption("en")).toHaveAttribute(
      "aria-checked",
      "true"
    );
    await expect(appsPage.userMenu.languageOption("vi")).toHaveAttribute(
      "aria-checked",
      "false"
    );

    await appsPage.userMenu.languageOption("en").click();
    await expect(page).toHaveURL((url) => url.pathname === "/apps");
  }
);

test(
  "The switch is announced",
  { tag: ["@TC-SETTINGS-023"] },
  async ({ appsPage, page }) => {
    const announcer = new Announcer(page);
    await announcer.record();
    await appsPage.goto();
    await appsPage.userMenu.chooseLanguage("vi");
    await expect(page).toHaveURL(/\/vi\/apps/);
    // Announced in the outgoing (English) locale; the live region is then
    // re-rendered by the new locale, so check what it held, not what it holds.
    await expect
      .poll(() => announcer.history())
      .toContain(
        fill(copy.common.announce.languageChanged, { language: "Tiếng Việt" })
      );
  }
);

test.describe("guest", () => {
  test.use({ role: "guest" });

  test(
    "A guest can switch the language on the sign-in screen",
    { tag: ["@TC-SETTINGS-038"] },
    async ({ loginPage, page }) => {
      await loginPage.goto();
      await expect(loginPage.heading()).toBeVisible();

      await loginPage.userMenu.chooseLanguage("vi");

      await expect(page).toHaveURL((url) => url.pathname === "/vi/login");
      await expect(new LoginPage(page, copyVi).heading()).toBeVisible();
      await expect(loginPage.documentRoot()).toHaveAttribute("lang", "vi");
    }
  );
});

test(
  "An unsupported locale prefix is not found",
  { tag: ["@TC-SETTINGS-039"] },
  async ({ profilePage, page }) => {
    await page.goto("/fr/apps");
    await expect(profilePage.notFound()).toBeVisible();
  }
);
