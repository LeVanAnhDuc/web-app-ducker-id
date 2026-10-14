import { test, expect } from "@/fixtures";
import { copyVi } from "@/data/copy";
import { ProfilePage } from "@/pages/settings/profile.page";
import { collectConsoleErrors, intlErrors } from "./helpers";

// The Account page — /profile is the single "Account" page; the old
// /account-settings and /security routes are gone. Test cases:
// test-cases/profile.md (TC-PROFILE-001 … TC-PROFILE-007). Read-only, runs as
// the seeded `user` (default role); the password form itself is covered by
// tests/e2e/password/change-password.e2e.ts.

/**
 * Strings the merge and profile-trim removed (docs/specs/profile-account-merge,
 * docs/specs/profile-trim): no catalogue holds them any more, which is the point.
 */
const REMOVED = {
  oldTitle: "Profile",
  connectedAccounts: "Connected Accounts",
  notificationPreferences: "Notification Preferences",
  accountSettingsLink: "Account Settings"
} as const;

test(
  "/profile shows the remaining sections in one page",
  { tag: ["@TC-PROFILE-001", "@smoke"] },
  async ({ profilePage }) => {
    await profilePage.goto();
    await expect(profilePage.title()).toBeVisible();
    await expect(profilePage.personalInfoHeading()).toBeVisible();
    await expect(profilePage.changePasswordHeading()).toBeVisible();
    await expect(profilePage.dangerZoneHeading()).toBeVisible();
    await expect(profilePage.heading(REMOVED.connectedAccounts)).toHaveCount(0);
    await expect(
      profilePage.heading(REMOVED.notificationPreferences)
    ).toHaveCount(0);
  }
);

test(
  'The page is titled "Account", not the old "Profile"',
  { tag: ["@TC-PROFILE-002"] },
  async ({ profilePage }) => {
    await profilePage.goto();
    await expect(profilePage.title()).toBeVisible();
    await expect(
      profilePage.heading(REMOVED.oldTitle, { exact: true })
    ).toHaveCount(0);
  }
);

test(
  "Signed-out visitors are sent to /login",
  { tag: ["@TC-PROFILE-003", "@smoke"] },
  async ({ guestPage }) => {
    await new ProfilePage(guestPage).goto();
    await expect(guestPage).toHaveURL(/\/login/, { timeout: 20_000 });
  }
);

test.describe(
  "The page is fully translated in English and Vietnamese",
  { tag: ["@TC-PROFILE-004"] },
  () => {
    test("English /profile has no raw keys or missing messages", async ({
      page,
      profilePage
    }) => {
      const errors = collectConsoleErrors(page);
      await profilePage.goto();
      await expect(profilePage.title()).toBeVisible();
      await expect(profilePage.changePasswordHeading()).toBeVisible();
      const body = await profilePage.body().innerText();
      expect(body).not.toMatch(/account\.(title|changePassword|dangerZone)/);
      expect(body).not.toMatch(/profile\.|accountSettings\./);
      const offending = intlErrors(errors);
      expect(offending, offending.join("\n")).toHaveLength(0);
    });

    test("Vietnamese /vi/profile has no missing messages", async ({ page }) => {
      const errors = collectConsoleErrors(page);
      const vi = new ProfilePage(page, copyVi);
      await vi.goto("/vi");
      await expect(vi.title()).toBeVisible();
      await expect(vi.changePasswordHeading()).toBeVisible();
      await expect(vi.dangerZoneHeading()).toBeVisible();
      const offending = intlErrors(errors);
      expect(offending, offending.join("\n")).toHaveLength(0);
    });
  }
);

test.describe(
  "The old /account-settings route is gone",
  { tag: ["@TC-PROFILE-005"] },
  () => {
    test("/account-settings renders not-found", async ({
      page,
      profilePage
    }) => {
      await page.goto("/account-settings");
      await expect(profilePage.notFound()).toBeVisible();
      await expect(profilePage.changePasswordHeading()).toHaveCount(0);
    });

    test("/vi/account-settings renders not-found", async ({
      page,
      profilePage
    }) => {
      await page.goto("/vi/account-settings");
      await expect(profilePage.notFound()).toBeVisible();
    });
  }
);

test.describe(
  "The Settings nav links to Account and Billing only",
  { tag: ["@TC-PROFILE-006"] },
  () => {
    test("the Settings group has Account and Billing, no Account Settings", async ({
      profilePage
    }) => {
      await profilePage.goto();
      await expect(profilePage.title()).toBeVisible();
      await expect(profilePage.accountNavLink()).toBeVisible();
      await expect(profilePage.billingNavLink()).toBeVisible();
      await expect(
        profilePage.settingsNavLink(REMOVED.accountSettingsLink)
      ).toHaveCount(0);
    });

    test("the Account link opens /profile", async ({ page, profilePage }) => {
      await profilePage.goto();
      await profilePage.accountNavLink().click();
      await expect(page).toHaveURL(/\/profile/);
      await expect(profilePage.dangerZoneHeading()).toBeVisible();
    });
  }
);

test.describe(
  "The removed /security page leaves no route or link",
  { tag: ["@TC-PROFILE-007"] },
  () => {
    for (const path of ["/security", "/vi/security"]) {
      test(`${path} renders not-found`, async ({ page, profilePage }) => {
        await page.goto(path);
        await expect(profilePage.notFound()).toBeVisible();
      });
    }

    test("the Settings group has no Security link", async ({ profilePage }) => {
      await profilePage.goto();
      await expect(profilePage.accountNavLink()).toBeVisible();
      await expect(profilePage.settingsNavLink(/security/i)).toHaveCount(0);
      await expect(profilePage.dangerZoneHeading()).toBeVisible();
    });
  }
);
