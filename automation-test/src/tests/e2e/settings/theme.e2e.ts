import { test, expect } from "@/fixtures";
import { Announcer } from "@/components/announcer.component";
import { UserMenu } from "@/components/user-menu.component";
import { copy, copyVi } from "@/data/copy";
import { AppsPage } from "@/pages/dashboard/apps.page";
import { HomePage } from "@/pages/dashboard/home.page";

// Theme from the user menu — light / dark / system, persisted by next-themes
// in localStorage and applied as a class on <html>. Test cases:
// test-cases/settings.md (Giao diện). Runs as the seeded `user`; the choice
// lives in the browser context only, which is discarded after each test.

const themeClass = (theme: "light" | "dark") => new RegExp(`\\b${theme}\\b`);

test(
  "Dark is applied and persists",
  { tag: ["@TC-SETTINGS-030"] },
  async ({ homePage, page, context }) => {
    await page.emulateMedia({ colorScheme: "light" });
    await homePage.goto();
    await homePage.userMenu.chooseTheme("dark");
    await expect(homePage.documentRoot()).toHaveClass(themeClass("dark"));

    await page.reload();
    await expect(homePage.documentRoot()).toHaveClass(themeClass("dark"));

    const second = new AppsPage(await context.newPage());
    await second.page.emulateMedia({ colorScheme: "light" });
    await second.goto();
    await expect(second.documentRoot()).toHaveClass(themeClass("dark"));
    await second.page.close();
  }
);

test(
  "Light overrides a dark OS preference",
  { tag: ["@TC-SETTINGS-031"] },
  async ({ homePage, page }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await homePage.goto();
    await homePage.userMenu.chooseTheme("light");
    await expect(homePage.documentRoot()).toHaveClass(themeClass("light"));
    await expect(homePage.documentRoot()).not.toHaveClass(themeClass("dark"));
    await page.reload();
    await expect(homePage.documentRoot()).toHaveClass(themeClass("light"));
  }
);

// Decision table: chosen theme = system × OS colour scheme → applied class.
test.describe("System follows the OS", () => {
  for (const scheme of ["dark", "light"] as const) {
    test(
      `when it prefers ${scheme}`,
      { tag: ["@TC-SETTINGS-032"] },
      async ({ homePage, page }) => {
        await page.emulateMedia({ colorScheme: scheme });
        await homePage.goto();
        await homePage.userMenu.chooseTheme("dark");
        await homePage.userMenu.chooseTheme("system");
        await expect(homePage.documentRoot()).toHaveClass(themeClass(scheme));
        await page.reload();
        await expect(homePage.documentRoot()).toHaveClass(themeClass(scheme));
      }
    );
  }
});

test(
  "The theme submenu in Vietnamese",
  { tag: ["@TC-SETTINGS-033"] },
  async ({ page }) => {
    const home = new HomePage(page, undefined, "/vi");
    const menu = new UserMenu(page, copyVi);
    await home.goto();
    await menu.chooseTheme("dark");
    await expect(home.documentRoot()).toHaveClass(themeClass("dark"));

    await menu.openThemeMenu();
    await expect(menu.themeOption("dark")).toHaveAttribute(
      "aria-checked",
      "true"
    );
    await expect(menu.themeOption("light")).toBeVisible();
    await expect(menu.themeOption("system")).toBeVisible();
  }
);

test(
  "The theme change is announced",
  { tag: ["@TC-SETTINGS-040"] },
  async ({ homePage, page }) => {
    const announcer = new Announcer(page);
    await announcer.record();
    await homePage.goto();
    await homePage.userMenu.chooseTheme("dark");
    await homePage.userMenu.chooseTheme("light");
    await expect
      .poll(() => announcer.history())
      .toEqual(
        expect.arrayContaining([
          copy.common.userMenu.switchedToDark,
          copy.common.userMenu.switchedToLight
        ])
      );
  }
);

test.describe("guest", () => {
  test.use({ role: "guest" });

  test(
    "A guest's theme choice applies on the sign-in screen",
    { tag: ["@TC-SETTINGS-041"] },
    async ({ loginPage, page }) => {
      await page.emulateMedia({ colorScheme: "light" });
      await loginPage.goto();
      await expect(loginPage.heading()).toBeVisible();
      await loginPage.userMenu.chooseTheme("dark");
      await expect(loginPage.documentRoot()).toHaveClass(themeClass("dark"));
      await page.reload();
      await expect(loginPage.documentRoot()).toHaveClass(themeClass("dark"));
    }
  );
});
