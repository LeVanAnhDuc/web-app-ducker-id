import { test, expect } from "@fixtures";
import type { Page } from "@playwright/test";

// Theme from the user menu — light / dark / system, persisted by next-themes
// in localStorage and applied as a class on <html>. Test cases:
// test-cases/settings.md (TC-SETTINGS-030 … TC-SETTINGS-033). Runs as the
// seeded `user`; the choice lives in the browser context only, which is
// discarded after each test. Copy from client/src/locales/{en,vi}/common.json.

const EN = {
  trigger: "Open user menu",
  theme: "Theme",
  light: "Light",
  dark: "Dark",
  system: "System"
} as const;

const VI = {
  trigger: "Mở menu người dùng",
  theme: "Giao diện",
  light: "Sáng",
  dark: "Tối",
  system: "Theo hệ thống"
} as const;

async function chooseTheme(
  page: Page,
  option: string,
  labels: { trigger: string; theme: string } = EN
) {
  await page.getByRole("button", { name: labels.trigger }).click();
  await page.getByRole("menuitem", { name: labels.theme }).click();
  await page.getByRole("menuitemradio", { name: option }).click();
}

const html = (page: Page) => page.locator("html");

test(
  "Dark applies the dark class and survives a reload and a new tab",
  { tag: ["@TC-SETTINGS-030"] },
  async ({ page, context }) => {
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto("/");
    await chooseTheme(page, EN.dark);
    await expect(html(page)).toHaveClass(/\bdark\b/);

    await page.reload();
    await expect(html(page)).toHaveClass(/\bdark\b/);

    const second = await context.newPage();
    await second.emulateMedia({ colorScheme: "light" });
    await second.goto("/apps");
    await expect(html(second)).toHaveClass(/\bdark\b/);
    await second.close();
  }
);

test(
  "Light applies the light class even when the OS prefers dark",
  { tag: ["@TC-SETTINGS-031"] },
  async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto("/");
    await chooseTheme(page, EN.light);
    await expect(html(page)).toHaveClass(/\blight\b/);
    await expect(html(page)).not.toHaveClass(/\bdark\b/);
    await page.reload();
    await expect(html(page)).toHaveClass(/\blight\b/);
  }
);

// Decision table: chosen theme = system × OS colour scheme → applied class.
for (const scheme of ["dark", "light"] as const) {
  test(
    `System follows the OS when it prefers ${scheme}`,
    { tag: ["@TC-SETTINGS-032"] },
    async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await page.goto("/");
      await chooseTheme(page, EN.dark);
      await chooseTheme(page, EN.system);
      await expect(html(page)).toHaveClass(new RegExp(`\\b${scheme}\\b`));
      await page.reload();
      await expect(html(page)).toHaveClass(new RegExp(`\\b${scheme}\\b`));
    }
  );
}

test(
  "the theme submenu is translated under /vi and marks the active option",
  { tag: ["@TC-SETTINGS-033"] },
  async ({ page }) => {
    await page.goto("/vi");
    await chooseTheme(page, VI.dark, VI);
    await expect(html(page)).toHaveClass(/\bdark\b/);

    await page.getByRole("button", { name: VI.trigger }).click();
    await page.getByRole("menuitem", { name: VI.theme }).click();
    await expect(
      page.getByRole("menuitemradio", { name: VI.dark })
    ).toHaveAttribute("aria-checked", "true");
    await expect(
      page.getByRole("menuitemradio", { name: VI.light })
    ).toBeVisible();
    await expect(
      page.getByRole("menuitemradio", { name: VI.system })
    ).toBeVisible();
  }
);
