import { test, expect } from "@fixtures";
import type { Page } from "@playwright/test";

// Team placeholder removal — negative assertions: the mock /team Settings
// page and its nav link are gone and nothing in Settings broke. Test cases:
// test-cases/settings.md (TC-SETTINGS-010 … TC-SETTINGS-014). Read-only, runs
// as the seeded `user` (default role). /profile is the surviving Settings
// page ("Account"); /account-settings itself was removed by the
// profile-account-merge change.
//
// i18n: en is default (no prefix); vi served under /vi (next-intl as-needed).
// Asserted strings are verbatim from client/src/locales/{en,vi}/dashboard.json.

const SETTINGS_PAGE = "/profile"; // a real surviving Settings page

const EN = {
  settingsGroup: "Settings",
  navAccount: "Account",
  navBilling: "Billing",
  navTeam: "Team"
} as const;

const VI = {
  settingsGroup: "Cài đặt",
  navAccount: "Tài khoản",
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

// TC-SETTINGS-010 / 011: settings nav shows surviving items, no Team.
test.describe("Team removal — F2 nav integrity", () => {
  test(
    "settings sidebar has no Team link (en)",
    { tag: ["@TC-SETTINGS-010"] },
    async ({ page }) => {
      await page.goto(SETTINGS_PAGE);
      const nav = settingsNav(page);
      await expect(
        nav.getByRole("link", { name: EN.navAccount, exact: true })
      ).toBeVisible();
      await expect(
        nav.getByRole("link", { name: EN.navBilling })
      ).toBeVisible();
      await expect(nav.getByRole("link", { name: EN.navTeam })).toHaveCount(0);
    }
  );

  // Row 9 (i18n): same in vi, localized Team label ("Nhóm") absent.
  test(
    "settings sidebar has no Team link (vi)",
    { tag: ["@TC-SETTINGS-010"] },
    async ({ page }) => {
      await page.goto(`/vi${SETTINGS_PAGE}`);
      const nav = settingsNav(page, VI.settingsGroup);
      await expect(
        nav.getByRole("link", { name: VI.navAccount, exact: true })
      ).toBeVisible();
      await expect(nav.getByRole("link", { name: VI.navTeam })).toHaveCount(0);
    }
  );
});

// Row 4 (validation): /team resolves to a not-found shell (no crash). No custom
// not-found.tsx exists, so Next renders its built-in 404 copy. Client navigation
// keeps a 200 shell, so assert via the not-found text rather than HTTP status —
// consistent with the account-settings-cleanup /security route-removal test.
const NOT_FOUND_TEXT = /this page could not be found|404|not found/i;

test.describe("Team removal — route removal", () => {
  test(
    "/team renders not-found (en)",
    { tag: ["@TC-SETTINGS-011"] },
    async ({ page }) => {
      await page.goto("/team");
      await expect(page.getByText(NOT_FOUND_TEXT).first()).toBeVisible();
    }
  );

  test(
    "/vi/team renders not-found (vi)",
    { tag: ["@TC-SETTINGS-011"] },
    async ({ page }) => {
      await page.goto("/vi/team");
      await expect(page.getByText(NOT_FOUND_TEXT).first()).toBeVisible();
    }
  );
});

// Row 9/10 (i18n + error): no MISSING_MESSAGE / leaked `team.*` key on the
// Settings shell after the `team` namespace + dashboard.sidebar.nav.team key
// were deleted — verified in BOTH locales.
test.describe("Team removal — no missing-message regression", () => {
  test(
    "no console error or leaked team key on Settings (en)",
    { tag: ["@TC-SETTINGS-012"] },
    async ({ page }) => {
      const errors = collectConsoleErrors(page);
      await page.goto(SETTINGS_PAGE);
      await expect(
        settingsNav(page).getByRole("link", {
          name: EN.navAccount,
          exact: true
        })
      ).toBeVisible();
      const body = await page.locator("body").innerText();
      expect(body).not.toMatch(/\bteam\.(title|members|invitations|roles)/);
      expect(
        errors.filter((e) => /MISSING_MESSAGE|IntlError/i.test(e))
      ).toHaveLength(0);
    }
  );

  test(
    "no console error on Settings (vi)",
    { tag: ["@TC-SETTINGS-012"] },
    async ({ page }) => {
      const errors = collectConsoleErrors(page);
      await page.goto(`/vi${SETTINGS_PAGE}`);
      await expect(
        settingsNav(page, VI.settingsGroup).getByRole("link", {
          name: VI.navAccount,
          exact: true
        })
      ).toBeVisible();
      expect(
        errors.filter((e) => /MISSING_MESSAGE|IntlError/i.test(e))
      ).toHaveLength(0);
    }
  );
});

// Row 12 (a11y): surviving settings links stay keyboard-focusable with Team gone.
test.describe("Team removal — a11y", () => {
  test(
    "settings nav remains keyboard-reachable",
    { tag: ["@TC-SETTINGS-013"] },
    async ({ page }) => {
      await page.goto(SETTINGS_PAGE);
      const accountLink = settingsNav(page).getByRole("link", {
        name: EN.navAccount,
        exact: true
      });
      await accountLink.focus();
      await expect(accountLink).toBeFocused();
    }
  );
});
