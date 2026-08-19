import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";

// E2E — Profile/Account merge. Scenario Matrix:
// docs/specs/profile-account-merge/e2e.md. Read-only / no mutation
// (password-change form behaviour lives in e2e/change-password). i18n strings
// sourced verbatim from src/locales/{en,vi}/{account,dashboard}.json.

const EN = {
  title: "Account",
  personalInfo: "Personal Information",
  connectedAccounts: "Connected Accounts",
  notificationPreferences: "Notification Preferences",
  changePassword: "Change Password",
  dangerZone: "Danger Zone",
  settingsGroup: "Settings",
  navAccount: "Account",
  navBilling: "Billing",
  navAccountSettings: "Account Settings",
  navProfileOld: "Profile"
} as const;

const VI = {
  title: "Tài khoản",
  changePassword: "Đổi mật khẩu",
  dangerZone: "Vùng nguy hiểm"
} as const;

const NOT_FOUND_TEXT = /this page could not be found|404|not found/i;

const collectConsoleErrors = (page: Page) => {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  return errors;
};

const expectNoMissingMessage = (errors: string[]) => {
  const offending = errors.filter((m) =>
    /MISSING_MESSAGE|IntlError|MessageFormat/i.test(m)
  );
  expect(offending, offending.join("\n")).toHaveLength(0);
};

// --- Row 1 — Happy path: remaining cards render; trimmed sections absent --
// profile-trim removed Connected Accounts + Notification Preferences.
// See docs/specs/profile-trim/.
test.describe("Profile/Account merge — happy path", () => {
  test("renders remaining sections on /profile in one page", async ({
    page
  }) => {
    await page.goto("/profile");
    await expect(
      page.getByRole("heading", { name: EN.title, exact: true })
    ).toBeVisible();
    for (const name of [EN.personalInfo, EN.changePassword, EN.dangerZone]) {
      await expect(page.getByRole("heading", { name })).toBeVisible();
    }
    await expect(
      page.getByRole("heading", { name: EN.connectedAccounts })
    ).toHaveCount(0);
    await expect(
      page.getByRole("heading", { name: EN.notificationPreferences })
    ).toHaveCount(0);
  });
});

// --- Row 8 — Data rendering: new title, not the old "Profile" -------------
test.describe("Profile/Account merge — page identity", () => {
  test("page title is 'Account' (not the old 'Profile')", async ({ page }) => {
    await page.goto("/profile");
    await expect(
      page.getByRole("heading", { name: EN.title, exact: true })
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: EN.navProfileOld, exact: true })
    ).toHaveCount(0);
  });
});

// --- Row 2 — AuthN: unauthenticated -> /login -----------------------------
test.describe("Profile/Account merge — AuthN", () => {
  test("unauthenticated user is redirected away from /profile", async ({
    browser
  }) => {
    const ctx = await browser.newContext({ storageState: undefined });
    await ctx.clearCookies();
    try {
      const freshPage = await ctx.newPage();
      await freshPage.goto("/profile");
      await expect(freshPage).toHaveURL(/\/login/, { timeout: 20_000 });
    } finally {
      await ctx.close();
    }
  });
});

// --- Row 9 — i18n en + vi, no missing-message after namespace rename ------
test.describe("Profile/Account merge — i18n", () => {
  test("english /profile localized with no missing messages", async ({
    page
  }) => {
    const errors = collectConsoleErrors(page);
    await page.goto("/profile");
    await expect(
      page.getByRole("heading", { name: EN.title, exact: true })
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: EN.changePassword })
    ).toBeVisible();
    const body = await page.locator("body").innerText();
    expect(body).not.toMatch(/account\.(title|changePassword|dangerZone)/);
    expect(body).not.toMatch(/profile\.|accountSettings\./);
    expectNoMissingMessage(errors);
  });

  test("vietnamese /vi/profile localized with no missing messages", async ({
    page
  }) => {
    const errors = collectConsoleErrors(page);
    await page.goto("/vi/profile");
    await expect(
      page.getByRole("heading", { name: VI.title, exact: true })
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: VI.changePassword })
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: VI.dangerZone })
    ).toBeVisible();
    expectNoMissingMessage(errors);
  });
});

// --- F1 — Route removal [ST invalid]: /account-settings -> not-found ------
test.describe("Profile/Account merge — route removal", () => {
  test("/account-settings renders not-found (default locale)", async ({
    page
  }) => {
    await page.goto("/account-settings");
    await expect(page.getByText(NOT_FOUND_TEXT).first()).toBeVisible();
    await expect(
      page.getByRole("heading", { name: EN.changePassword })
    ).toHaveCount(0);
  });

  test("/vi/account-settings renders not-found (vietnamese)", async ({
    page
  }) => {
    await page.goto("/vi/account-settings");
    await expect(page.getByText(NOT_FOUND_TEXT).first()).toBeVisible();
  });
});

// --- F2 — Nav integrity: Account present, Account Settings/Profile gone ----
test.describe("Profile/Account merge — nav integrity", () => {
  test("settings nav has Account/Billing, no Account Settings", async ({
    page
  }) => {
    await page.goto("/profile");
    await expect(
      page.getByRole("heading", { name: EN.title, exact: true })
    ).toBeVisible();

    const settingsNav = page
      .getByRole("navigation", { name: EN.settingsGroup })
      .or(page.locator(`[aria-label="${EN.settingsGroup}"]`))
      .first();

    await expect(
      settingsNav.getByRole("link", { name: EN.navAccount, exact: true })
    ).toBeVisible();
    await expect(
      settingsNav.getByRole("link", { name: EN.navBilling })
    ).toBeVisible();
    await expect(
      settingsNav.getByRole("link", { name: EN.navAccountSettings })
    ).toHaveCount(0);
  });

  test("Account nav link navigates to /profile", async ({ page }) => {
    await page.goto("/profile");
    const settingsNav = page
      .getByRole("navigation", { name: EN.settingsGroup })
      .or(page.locator(`[aria-label="${EN.settingsGroup}"]`))
      .first();
    await settingsNav
      .getByRole("link", { name: EN.navAccount, exact: true })
      .click();
    await expect(page).toHaveURL(/\/profile/);
    await expect(
      page.getByRole("heading", { name: EN.dangerZone })
    ).toBeVisible();
  });
});
