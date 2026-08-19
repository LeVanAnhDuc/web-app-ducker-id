import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";

// ---------------------------------------------------------------------------
// Team placeholder removal — E2E (Scenario Matrix in
// docs/specs/remove-team-feature/e2e.md). Negative-assertion suite: the mock
// /team Settings placeholder and its nav link were removed entirely.
//
// Read-only, deterministic. Auth from global auth.setup.ts (logged-in regular
// user via the chromium project storageState). Base URL / port resolved by
// playwright.config.ts — never hardcode a host.
//
// i18n: en is default (no prefix); vi served under /vi (next-intl as-needed).
// All asserted strings are verbatim from src/locales/{en,vi}/dashboard.json.
// ---------------------------------------------------------------------------

const SETTINGS_PAGE = "/account-settings"; // a real surviving Settings page

const EN = {
  settingsGroup: "Settings",
  navAccountSettings: "Account Settings",
  navBilling: "Billing",
  navTeam: "Team"
} as const;

const VI = {
  settingsGroup: "Cài đặt",
  navAccountSettings: "Cài đặt tài khoản",
  navTeam: "Nhóm"
} as const;

// The sidebar group exposes its LOCALIZED label as the nav aria-label
// (tGroups("settings") → en "Settings" / vi "Cài đặt"), so the scope label must
// match the page locale — pass VI.settingsGroup on /vi pages.
const settingsNav = (page: Page, groupLabel: string = EN.settingsGroup) =>
  page
    .getByRole("navigation", { name: groupLabel })
    .or(page.locator(`[aria-label="${groupLabel}"]`))
    .first();

const collectConsoleErrors = (page: Page) => {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  return errors;
};

// Row 1 (happy) + no-dangling-link: settings nav shows surviving items, no Team.
test.describe("Team removal — F2 nav integrity", () => {
  test("settings sidebar has no Team link (en)", async ({ page }) => {
    await page.goto(SETTINGS_PAGE);
    const nav = settingsNav(page);
    await expect(
      nav.getByRole("link", { name: EN.navAccountSettings })
    ).toBeVisible();
    await expect(nav.getByRole("link", { name: EN.navBilling })).toBeVisible();
    await expect(nav.getByRole("link", { name: EN.navTeam })).toHaveCount(0);
  });

  // Row 9 (i18n): same in vi, localized Team label ("Nhóm") absent.
  test("settings sidebar has no Team link (vi)", async ({ page }) => {
    await page.goto(`/vi${SETTINGS_PAGE}`);
    const nav = settingsNav(page, VI.settingsGroup);
    await expect(
      nav.getByRole("link", { name: VI.navAccountSettings })
    ).toBeVisible();
    await expect(nav.getByRole("link", { name: VI.navTeam })).toHaveCount(0);
  });
});

// Row 4 (validation): /team resolves to a not-found shell (no crash). No custom
// not-found.tsx exists, so Next renders its built-in 404 copy. Client navigation
// keeps a 200 shell, so assert via the not-found text rather than HTTP status —
// consistent with the account-settings-cleanup /security route-removal test.
const NOT_FOUND_TEXT = /this page could not be found|404|not found/i;

test.describe("Team removal — route removal", () => {
  test("/team renders not-found (en)", async ({ page }) => {
    await page.goto("/team");
    await expect(page.getByText(NOT_FOUND_TEXT).first()).toBeVisible();
  });

  test("/vi/team renders not-found (vi)", async ({ page }) => {
    await page.goto("/vi/team");
    await expect(page.getByText(NOT_FOUND_TEXT).first()).toBeVisible();
  });
});

// Row 9/10 (i18n + error): no MISSING_MESSAGE / leaked `team.*` key on the
// Settings shell after the `team` namespace + dashboard.sidebar.nav.team key
// were deleted — verified in BOTH locales.
test.describe("Team removal — no missing-message regression", () => {
  test("no console error or leaked team key on Settings (en)", async ({
    page
  }) => {
    const errors = collectConsoleErrors(page);
    await page.goto(SETTINGS_PAGE);
    await expect(
      settingsNav(page).getByRole("link", { name: EN.navAccountSettings })
    ).toBeVisible();
    const body = await page.locator("body").innerText();
    expect(body).not.toMatch(/\bteam\.(title|members|invitations|roles)/);
    expect(
      errors.filter((e) => /MISSING_MESSAGE|IntlError/i.test(e))
    ).toHaveLength(0);
  });

  test("no console error on Settings (vi)", async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await page.goto(`/vi${SETTINGS_PAGE}`);
    await expect(
      settingsNav(page, VI.settingsGroup).getByRole("link", {
        name: VI.navAccountSettings
      })
    ).toBeVisible();
    expect(
      errors.filter((e) => /MISSING_MESSAGE|IntlError/i.test(e))
    ).toHaveLength(0);
  });
});

// Row 12 (a11y): surviving settings links stay keyboard-focusable with Team gone.
test.describe("Team removal — a11y", () => {
  test("settings nav remains keyboard-reachable", async ({ page }) => {
    await page.goto(SETTINGS_PAGE);
    const accountLink = settingsNav(page).getByRole("link", {
      name: EN.navAccountSettings
    });
    await accountLink.focus();
    await expect(accountLink).toBeFocused();
  });
});
