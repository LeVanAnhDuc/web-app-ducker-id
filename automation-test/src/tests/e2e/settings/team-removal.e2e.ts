import { test, expect } from "@/fixtures";
import { copyVi } from "@/data/copy";
import { ProfilePage } from "@/pages/settings/profile.page";
import { REMOVED_TEAM_LABEL, collectConsole } from "./helpers";

// Team placeholder removal — negative assertions: the mock /team Settings
// page and its nav link are gone and nothing in Settings broke. Test cases:
// test-cases/settings.md (Tính năng đã gỡ). Read-only, runs as the seeded
// `user` (default role). /profile ("Account") is the surviving Settings page;
// /account-settings itself was removed by the profile-account-merge change.

test.describe("The Settings nav has no Team link", () => {
  test(
    "en",
    { tag: ["@TC-SETTINGS-010", "@smoke"] },
    async ({ profilePage }) => {
      await profilePage.goto();
      await expect(profilePage.accountNavLink()).toBeVisible();
      await expect(profilePage.billingNavLink()).toBeVisible();
      await expect(
        profilePage.settingsNavLink(REMOVED_TEAM_LABEL.en)
      ).toHaveCount(0);
    }
  );

  // Same in vi: the sidebar group is labelled "Cài đặt", Team was "Nhóm".
  test("vi", { tag: ["@TC-SETTINGS-010", "@smoke"] }, async ({ page }) => {
    const vi = new ProfilePage(page, copyVi);
    await vi.goto("/vi");
    await expect(vi.accountNavLink()).toBeVisible();
    await expect(vi.settingsNavLink(REMOVED_TEAM_LABEL.vi)).toHaveCount(0);
  });
});

// No custom not-found.tsx exists, so Next renders its built-in 404 copy.
// Client navigation keeps a 200 shell, so assert via the not-found text
// rather than the HTTP status.
test.describe("/team is not found", () => {
  for (const prefix of ["", "/vi"]) {
    test(
      `${prefix}/team`,
      { tag: ["@TC-SETTINGS-011"] },
      async ({ profilePage, page }) => {
        await page.goto(`${prefix}/team`);
        await expect(profilePage.notFound()).toBeVisible();
      }
    );
  }
});

// The `team` namespace and dashboard.sidebar.nav.team were deleted: no
// MISSING_MESSAGE and no leaked `team.*` key on the Settings shell, in BOTH
// locales.
test.describe("No missing message or leaked team key after the removal", () => {
  test("en", { tag: ["@TC-SETTINGS-012"] }, async ({ profilePage, page }) => {
    const errors = collectConsole(page);
    await profilePage.goto();
    await expect(profilePage.accountNavLink()).toBeVisible();
    const body = await profilePage.body().innerText();
    expect(body).not.toMatch(/\bteam\.(title|members|invitations|roles)/);
    expect(
      errors.filter((e) => /MISSING_MESSAGE|IntlError/i.test(e))
    ).toHaveLength(0);
  });

  test("vi", { tag: ["@TC-SETTINGS-012"] }, async ({ page }) => {
    const errors = collectConsole(page);
    const vi = new ProfilePage(page, copyVi);
    await vi.goto("/vi");
    await expect(vi.accountNavLink()).toBeVisible();
    expect(
      errors.filter((e) => /MISSING_MESSAGE|IntlError/i.test(e))
    ).toHaveLength(0);
  });
});

test(
  "The surviving Settings links stay keyboard-reachable",
  { tag: ["@TC-SETTINGS-013"] },
  async ({ profilePage }) => {
    await profilePage.goto();
    const accountLink = profilePage.accountNavLink();
    await accountLink.focus();
    await expect(accountLink).toBeFocused();
  }
);
