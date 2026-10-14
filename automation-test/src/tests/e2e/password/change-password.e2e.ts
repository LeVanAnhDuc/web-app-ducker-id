import { test, expect } from "@/fixtures";
import { loginInBrowser, loginOverApi } from "@/api/session";
import { USER_PASSWORD as DEFAULT_PASSWORD } from "@/config/accounts";
import { clientLiteral, copy, copyVi } from "@/data/copy";
import { ProfilePasswordPage } from "@/pages/settings/profile-password.page";
import { createAccount } from "@/utils/accounts";
import {
  CHANGE_PASSWORD_GLOB,
  countPatches,
  holdChangePassword,
  mockChangePassword,
  realTokens
} from "./helpers";

// Change password from /profile (ChangePasswordCard). Test cases:
// test-cases/password.md (TC-PASSWORD-001 … TC-PASSWORD-018). The form tests
// run as the seeded `user` (default role) and never send a real PATCH — every
// server answer is a page.route mock, or client validation blocks first. The
// one real change runs on a throwaway account signed into an empty context,
// so user@test.com keeps its password. API-level cases (revocation of other
// sessions, 401, rate limit) live in tests/api/password/change-password.api.ts.

const NEW_PASSWORD = "NewPass@123";
const t = copy.account.changePassword;
const v = copy.common.validation;

// ---------------------------------------------------------------------------
// Seeded user, no real PATCH.
// ---------------------------------------------------------------------------
test.describe("signed in as the seeded user", () => {
  test.beforeEach(async ({ profilePasswordPage }) => {
    await profilePasswordPage.goto();
    await expect(profilePasswordPage.heading()).toBeVisible();
  });

  test(
    "A mismatched confirmation is blocked on the client",
    { tag: ["@TC-PASSWORD-004"] },
    async ({ page, profilePasswordPage: form }) => {
      const patches = countPatches(page);
      await form.fill(DEFAULT_PASSWORD, NEW_PASSWORD, "Different@123");
      await form.submit();
      await expect(form.confirmPasswordInput()).toHaveAttribute(
        "aria-invalid",
        "true"
      );
      expect(patches.count).toBe(0);
    }
  );

  // MOCKED (page.route) to assert the client's handling of the server's
  // wrong-current answer without spending the real limiter bucket (5 / IP+user
  // / 900 s): the code is mapped to the current-password field.
  test(
    "A wrong current password is shown on the current-password field",
    { tag: ["@TC-PASSWORD-005"] },
    async ({ page, profilePasswordPage: form }) => {
      await mockChangePassword(page, {
        status: 400,
        body: {
          code: "CHANGE_PASSWORD_WRONG_CURRENT",
          message: "Wrong current"
        }
      });
      await form.fill("WrongPass@123", NEW_PASSWORD);
      await form.submit();
      // The visible mapped error first (auto-retries through the re-render
      // after the response), then the aria-invalid attribute.
      await expect(
        form.message(v.currentPassword.wrongCurrentPassword)
      ).toBeVisible();
      await expect(form.currentPasswordInput()).toHaveAttribute(
        "aria-invalid",
        "true"
      );
      await page.unroute(CHANGE_PASSWORD_GLOB);
    }
  );

  // MOCKED: the server rejects new == current, the client maps the code to
  // the new-password field.
  test(
    "A new password equal to the current one is shown on the new-password field",
    { tag: ["@TC-PASSWORD-006"] },
    async ({ page, profilePasswordPage: form }) => {
      await mockChangePassword(page, {
        status: 400,
        body: {
          code: "CHANGE_PASSWORD_SAME_AS_CURRENT",
          message: "Same as current"
        }
      });
      await form.fill(DEFAULT_PASSWORD, DEFAULT_PASSWORD);
      await form.submit();
      await expect(form.message(v.newPassword.sameAsCurrent)).toBeVisible();
      await expect(form.newPasswordInput()).toHaveAttribute(
        "aria-invalid",
        "true"
      );
      await page.unroute(CHANGE_PASSWORD_GLOB);
    }
  );

  // [EP] Client policy (zod passwordSchema) blocks every invalid class
  // before any call to the server.
  test.describe("Each invalid password class is blocked before the API", () => {
    const invalidNewPasswordClasses: ReadonlyArray<{
      label: string;
      value: string;
    }> = [
      { label: "missing an uppercase letter", value: "newpass@123" },
      { label: "empty", value: "" },
      { label: "missing a lowercase letter", value: "NEWPASS@123" },
      { label: "missing a digit", value: "NewPass@!!" },
      { label: "missing a special character", value: "NewPass123" }
    ];
    for (const { label, value } of invalidNewPasswordClasses) {
      test(
        `rejects new password ${label} (no API call)`,
        { tag: ["@TC-PASSWORD-007"] },
        async ({ page, profilePasswordPage: form }) => {
          const patches = countPatches(page);
          await form.fill(DEFAULT_PASSWORD, value);
          await form.submit();
          await expect(form.newPasswordInput()).toHaveAttribute(
            "aria-invalid",
            "true"
          );
          expect(patches.count).toBe(0);
        }
      );
    }
  });

  test(
    "An empty current password is blocked",
    { tag: ["@TC-PASSWORD-008"] },
    async ({ page, profilePasswordPage: form }) => {
      const patches = countPatches(page);
      await form.newPasswordInput().fill(NEW_PASSWORD);
      await form.confirmPasswordInput().fill(NEW_PASSWORD);
      // Touch current to make the form dirty, then clear it.
      await form.currentPasswordInput().fill("x");
      await form.currentPasswordInput().fill("");
      await form.submit();
      await expect(form.currentPasswordInput()).toHaveAttribute(
        "aria-invalid",
        "true"
      );
      expect(patches.count).toBe(0);
    }
  );

  test(
    "Client policy wins when current is wrong and new is invalid",
    { tag: ["@TC-PASSWORD-009"] },
    async ({ page, profilePasswordPage: form }) => {
      const patches = countPatches(page);
      await form.fill("WrongPass@123", "newpass@123");
      await form.submit();
      await expect(form.newPasswordInput()).toHaveAttribute(
        "aria-invalid",
        "true"
      );
      expect(patches.count).toBe(0);
    }
  );

  test(
    "A pristine form cannot be submitted or cancelled",
    { tag: ["@TC-PASSWORD-010"] },
    async ({ page, profilePasswordPage: form }) => {
      const patches = countPatches(page);
      await expect(form.saveButton()).toBeDisabled();
      await expect(form.cancelButton()).toBeDisabled();
      expect(patches.count).toBe(0);
    }
  );

  // [BVA] 7 / 8 / 129. The accepted side is a mocked 200 carrying the page's
  // own real tokens — no real PATCH, no limiter bucket, no reload (a reload
  // after a faked 200 would race the refresh-token bootstrap).
  test.describe("New-password length boundaries in the form", () => {
    test(
      "rejects a new password of 7 characters (below the minimum, no API call)",
      { tag: ["@TC-PASSWORD-011"] },
      async ({ page, profilePasswordPage: form }) => {
        const patches = countPatches(page);
        const sevenChars = "Ab@3xyz"; // 7 chars, otherwise policy-valid
        expect(sevenChars).toHaveLength(7);
        await form.fill(DEFAULT_PASSWORD, sevenChars);
        await form.submit();
        await expect(form.newPasswordInput()).toHaveAttribute(
          "aria-invalid",
          "true"
        );
        expect(patches.count).toBe(0);
      }
    );

    test(
      "accepts a new password of exactly 8 characters (boundary)",
      { tag: ["@TC-PASSWORD-011"] },
      async ({ page, profilePasswordPage: form }) => {
        const eightChars = "Ab@3xyzz"; // exactly 8 chars, policy-valid
        expect(eightChars).toHaveLength(8);
        await mockChangePassword(page, {
          status: 200,
          body: { data: await realTokens(page) }
        });
        await form.fill(DEFAULT_PASSWORD, eightChars);
        await form.submit();
        await expect(form.toast.withText(t.toast.success)).toBeVisible();
        await page.unroute(CHANGE_PASSWORD_GLOB);
      }
    );

    test(
      "rejects a new password of 129 characters (above the maximum, no API call)",
      { tag: ["@TC-PASSWORD-011"] },
      async ({ page, profilePasswordPage: form }) => {
        const patches = countPatches(page);
        const tooLong = "Ab@3" + "x".repeat(125); // 129 chars
        expect(tooLong).toHaveLength(129);
        await form.fill(DEFAULT_PASSWORD, tooLong);
        await form.submit();
        await expect(form.newPasswordInput()).toHaveAttribute(
          "aria-invalid",
          "true"
        );
        expect(patches.count).toBe(0);
      }
    );
  });

  test(
    "The form renders its labelled fields",
    { tag: ["@TC-PASSWORD-012"] },
    async ({ profilePasswordPage: form }) => {
      await expect(form.currentPasswordInput()).toBeVisible();
      await expect(form.newPasswordInput()).toBeVisible();
      await expect(form.confirmPasswordInput()).toBeVisible();
      await expect(form.saveButton()).toBeVisible();
    }
  );

  test.describe("The form and its server error are Vietnamese under /vi", () => {
    test(
      "renders the form in Vietnamese on the /vi route",
      { tag: ["@TC-PASSWORD-013"] },
      async ({ page }) => {
        const vi = new ProfilePasswordPage(page, copyVi);
        await vi.goto("/vi");
        await expect(vi.heading()).toBeVisible();
      }
    );

    // MOCKED: the client renders the Vietnamese wrong-current error from the
    // server's code.
    test(
      "shows the Vietnamese wrong-current error on the /vi route",
      { tag: ["@TC-PASSWORD-013"] },
      async ({ page }) => {
        const vi = new ProfilePasswordPage(page, copyVi);
        await vi.goto("/vi");
        await expect(vi.heading()).toBeVisible();
        await mockChangePassword(page, {
          status: 400,
          body: {
            code: "CHANGE_PASSWORD_WRONG_CURRENT",
            message: "Wrong current"
          }
        });
        await vi.fill("WrongPass@123", NEW_PASSWORD);
        await vi.submit();
        await expect(
          vi.message(
            copyVi.common.validation.currentPassword.wrongCurrentPassword
          )
        ).toBeVisible();
        await page.unroute(CHANGE_PASSWORD_GLOB);
      }
    );
  });

  // [error-guessing] 500 → the card maps field errors only, so the global
  // mutationCache 5xx toast (client/src/libs/query-client.ts) shows; the
  // values stay and the user stays on /profile.
  test(
    "A server failure keeps the values and shows an error",
    { tag: ["@TC-PASSWORD-014"] },
    async ({ page, profilePasswordPage: form }) => {
      await mockChangePassword(page, {
        status: 500,
        body: { code: "INTERNAL_SERVER_ERROR", message: "Server error" }
      });
      await form.fill(DEFAULT_PASSWORD, NEW_PASSWORD);
      await form.submit();
      await expect(
        form.toast.withText(clientLiteral.serverErrorToast, { exact: true })
      ).toBeVisible({ timeout: 10_000 });
      await expect(form.newPasswordInput()).toHaveValue(NEW_PASSWORD);
      await expect(page).toHaveURL(/\/profile/);
      await page.unroute(CHANGE_PASSWORD_GLOB);
    }
  );

  // The PATCH is held open only long enough to see the disabled inputs, then
  // aborted (no success handler, so no token pair to clean up); a fresh load
  // leaves a known-good signed-in page behind.
  test(
    "Inputs are disabled while the request is in flight",
    { tag: ["@TC-PASSWORD-015"] },
    async ({ page, profilePasswordPage: form }) => {
      const release = await holdChangePassword(page);
      await form.fill(DEFAULT_PASSWORD, NEW_PASSWORD);
      await form.submit();
      await expect(form.currentPasswordInput()).toBeDisabled();
      await expect(form.newPasswordInput()).toBeDisabled();
      await expect(form.confirmPasswordInput()).toBeDisabled();
      await release();
      await page.unroute(CHANGE_PASSWORD_GLOB);
      await form.goto();
      await expect(form.heading()).toBeVisible();
    }
  );

  // Each PasswordInput renders a show/hide toggle AFTER its input
  // (client/src/components/PasswordInput), so focus goes current → toggle →
  // new → toggle → confirm.
  test(
    "Keyboard focus follows the field order",
    { tag: ["@TC-PASSWORD-017"] },
    async ({ page, profilePasswordPage: form }) => {
      await form.currentPasswordInput().focus();
      await expect(form.currentPasswordInput()).toBeFocused();
      await page.keyboard.press("Tab"); // current show/hide toggle
      await page.keyboard.press("Tab"); // -> new password input
      await expect(form.newPasswordInput()).toBeFocused();
      await page.keyboard.press("Tab"); // new show/hide toggle
      await page.keyboard.press("Tab"); // -> confirm password input
      await expect(form.confirmPasswordInput()).toBeFocused();
    }
  );

  // Observe only: nothing is submitted (it would change the seeded user's
  // password if the policy passed); the page must stay usable and the field
  // report a definite validity state.
  test(
    "A trailing space in the new password does not break the form",
    { tag: ["@TC-PASSWORD-018"] },
    async ({ profilePasswordPage: form }) => {
      await form.fill(DEFAULT_PASSWORD, `${NEW_PASSWORD} `);
      const invalid = await form
        .newPasswordInput()
        .getAttribute("aria-invalid");
      expect(["true", "false", null]).toContain(invalid);
    }
  );

  // MOCKED 200 with the page's real tokens: the client's reaction to success.
  // No reload — the real session survival is TC-PASSWORD-001.
  test(
    "A 200 from the server shows success and stays on the page",
    { tag: ["@TC-PASSWORD-002"] },
    async ({ page, profilePasswordPage: form }) => {
      await mockChangePassword(page, {
        status: 200,
        body: { data: await realTokens(page) }
      });
      await form.fill(DEFAULT_PASSWORD, NEW_PASSWORD);
      await form.submit();
      await expect(form.toast.withText(t.toast.success)).toBeVisible();
      await expect(page).toHaveURL(/\/profile/);
      await page.unroute(CHANGE_PASSWORD_GLOB);
    }
  );

  // A delayed mocked 200 keeps the first request in flight while a second,
  // forced click is attempted: Save is disabled while pending, so exactly one
  // PATCH goes out.
  test(
    "A rapid double click sends exactly one PATCH",
    { tag: ["@TC-PASSWORD-016"] },
    async ({ page, profilePasswordPage: form }) => {
      const patches = countPatches(page);
      await mockChangePassword(page, {
        status: 200,
        body: { data: await realTokens(page) },
        delayMs: 800
      });
      await form.fill(DEFAULT_PASSWORD, NEW_PASSWORD);
      await form.saveButton().click();
      await form.saveButton().click({ force: true });
      await expect(form.toast.withText(t.toast.success)).toBeVisible();
      expect(patches.count).toBe(1);
      await page.unroute(CHANGE_PASSWORD_GLOB);
    }
  );
});

// ---------------------------------------------------------------------------
// The real change on a throwaway account; and no session at all.
// ---------------------------------------------------------------------------
test.describe("as a guest", () => {
  test.use({ role: "guest" });

  test(
    "Changing the password keeps the current session",
    { tag: ["@TC-PASSWORD-001", "@smoke"] },
    async ({ page, profilePasswordPage: form }) => {
      const account = await createAccount({ tag: "cp-ui" });
      await loginInBrowser(page, account.email, account.password);
      await form.goto();
      await expect(form.heading()).toBeVisible();

      await form.fill(account.password, NEW_PASSWORD);
      await form.submit();
      await expect(form.toast.withText(t.toast.success)).toBeVisible({
        timeout: 10_000
      });
      await expect(page).toHaveURL(/\/profile/);
      // [ST valid] this device got a rotated cookie, so a reload stays signed in.
      await page.reload();
      await expect(form.heading()).toBeVisible();
      await expect(page).toHaveURL(/\/profile/);

      expect((await loginOverApi(account.email, NEW_PASSWORD)).status).toBe(
        200
      );
      expect((await loginOverApi(account.email, account.password)).status).toBe(
        401
      );
    }
  );

  test(
    "Signed-out visitors cannot reach the form",
    { tag: ["@TC-PASSWORD-003", "@smoke"] },
    async ({ page, profilePasswordPage: form }) => {
      await form.goto();
      await expect(page).toHaveURL(/\/login/);
    }
  );
});
