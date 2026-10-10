import { test, expect } from "@fixtures";
import type { Page } from "@playwright/test";
import { announcements, recordAnnouncements } from "@helpers/password";

// Language switch from the user menu — en has no URL prefix, vi lives under
// /vi (next-intl `as-needed`). Test cases: test-cases/settings.md
// (TC-SETTINGS-020 … TC-SETTINGS-023). Runs as the seeded `user`; switching
// language changes no account state. Copy from
// client/src/locales/{en,vi}/{common,dashboard}.json and i18n/config.ts.

const EN = {
  trigger: "Open user menu",
  language: "Language",
  navHome: "Home",
  announce: "Language changed to Tiếng Việt."
} as const;

const VI = {
  trigger: "Mở menu người dùng",
  language: "Ngôn ngữ",
  navHome: "Trang chủ"
} as const;

async function openLanguageMenu(page: Page, trigger: string, label: string) {
  await page.getByRole("button", { name: trigger }).click();
  await page.getByRole("menuitem", { name: label }).click();
}

async function pickLanguage(page: Page, name: string) {
  await page.getByRole("menuitemradio", { name }).click();
}

test(
  "switching to Tiếng Việt moves to /vi and translates the page, keeping the query",
  { tag: ["@TC-SETTINGS-020", "@smoke"] },
  async ({ page }) => {
    await page.goto("/apps?search=idms");
    await expect(
      page.getByRole("link", { name: EN.navHome }).first()
    ).toBeVisible();

    await openLanguageMenu(page, EN.trigger, EN.language);
    await pickLanguage(page, "Tiếng Việt");

    await expect(page).toHaveURL(/\/vi\/apps\?search=idms$/);
    await expect(
      page.getByRole("link", { name: VI.navHome }).first()
    ).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("lang", "vi");
  }
);

test(
  "switching back to English drops the /vi prefix",
  { tag: ["@TC-SETTINGS-021"] },
  async ({ page }) => {
    await page.goto("/vi/apps");
    await openLanguageMenu(page, VI.trigger, VI.language);
    await pickLanguage(page, "English");

    await expect(page).toHaveURL((url) => url.pathname === "/apps");
    await expect(
      page.getByRole("link", { name: EN.navHome }).first()
    ).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
  }
);

test(
  "the submenu marks the active language and re-picking it changes nothing",
  { tag: ["@TC-SETTINGS-022"] },
  async ({ page }) => {
    await page.goto("/apps");
    await openLanguageMenu(page, EN.trigger, EN.language);
    await expect(
      page.getByRole("menuitemradio", { name: "English" })
    ).toHaveAttribute("aria-checked", "true");
    await expect(
      page.getByRole("menuitemradio", { name: "Tiếng Việt" })
    ).toHaveAttribute("aria-checked", "false");

    await pickLanguage(page, "English");
    await expect(page).toHaveURL((url) => url.pathname === "/apps");
  }
);

test(
  "the change is announced to screen readers",
  { tag: ["@TC-SETTINGS-023"] },
  async ({ page }) => {
    await recordAnnouncements(page);
    await page.goto("/apps");
    await openLanguageMenu(page, EN.trigger, EN.language);
    await pickLanguage(page, "Tiếng Việt");
    await expect(page).toHaveURL(/\/vi\/apps/);
    // Announced in the outgoing (English) locale; the live region is then
    // re-rendered by the new locale, so check what it held, not what it holds.
    await expect.poll(() => announcements(page)).toContain(EN.announce);
  }
);
