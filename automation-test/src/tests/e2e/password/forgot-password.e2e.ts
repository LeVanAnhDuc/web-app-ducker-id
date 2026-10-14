import { test, expect } from "@/fixtures";
import { loginOverApi } from "@/api/session";
import { copy, copyVi, fill, serverMessage } from "@/data/copy";
import { KNOWN_MAGIC_TOKEN, KNOWN_OTP } from "@/data/test-data";
import { ForgotPasswordPage } from "@/pages/auth/forgot-password.page";
import { ForgotPasswordResetPage } from "@/pages/auth/forgot-password-reset.page";
import { createAccount } from "@/utils/accounts";
import { readQueuedEmail } from "@/utils/email";
import { plantCode } from "@/utils/redis";
import {
  answerRepeatVerifyWithFirst,
  countMagicLinkVerifies,
  countResets,
  isDevBuild
} from "./helpers";

// Forgot password in the browser — options → OTP or magic link → new
// password → login. Test cases: test-cases/password.md (TC-PASSWORD-050 …
// TC-PASSWORD-063, TC-PASSWORD-087 … TC-PASSWORD-089). Runs as `guest`;
// accounts are throwaways, codes are planted after the real send call.

test.use({ role: "guest" });

const NEW_PASSWORD = "Recovered@123";
const v = copy.common.validation;
const reset = copy.forgotPasswordReset;

test.describe("entry and options", () => {
  test(
    "Recovery pages need an email in the URL",
    { tag: ["@TC-PASSWORD-050"] },
    async ({ page }) => {
      await page.goto("/forgot-password");
      await expect(page).toHaveURL(/\/login(\?|$)/);
      await page.goto("/forgot-password/otp");
      await expect(page).toHaveURL(/\/login(\?|$)/);
      await page.goto("/forgot-password/reset?email=a%40b.co");
      await expect(page).toHaveURL(/\/login(\?|$)/);
    }
  );

  test(
    "The options page lists the recovery methods",
    { tag: ["@TC-PASSWORD-051"] },
    async ({ page, forgotPasswordPage: options }) => {
      const email = "someone@e2e.example.com";
      await options.goto(email);
      await expect(options.heading()).toBeVisible();
      await expect(options.email(email)).toBeVisible();
      await expect(options.otpOption()).toBeVisible();
      await expect(options.magicLinkOption()).toBeVisible();
      await expect(options.contactAdminOption()).toBeVisible();
      // 2FA is shown but is not an actionable control.
      await expect(options.twoFactorTitle()).toBeVisible();
      await expect(options.unavailableBadge()).toBeVisible();
      await expect(options.twoFactorButton()).toHaveCount(0);

      await options.changeEmailLink().click();
      await expect(page).toHaveURL(/\/login(\?|$)/);
    }
  );

  test(
    "The unavailable 2FA option is exposed as disabled",
    { tag: ["@TC-PASSWORD-062"] },
    async ({ forgotPasswordPage: options }) => {
      // RecoveryOptionTwoFactor passes aria-label/aria-disabled to
      // FadeSlideLeft, which drops every prop but className — the card has no
      // accessible name or disabled state.
      // BUG: defects/password.md#bug-password-05
      test.fail();
      await options.goto("someone@e2e.example.com");
      await expect(options.twoFactorCard()).toHaveAttribute(
        "aria-disabled",
        "true",
        { timeout: 5_000 }
      );
    }
  );

  test(
    '"Forgot Password?" on the password step carries the email',
    { tag: ["@TC-PASSWORD-061"] },
    async ({ page, loginPasswordPage, forgotPasswordPage: options }) => {
      const email = "carry-me@e2e.example.com";
      await loginPasswordPage.goto(email);
      await loginPasswordPage.forgotPasswordLink().click();
      await expect(page).toHaveURL(
        new RegExp(
          `/forgot-password\\?email=${encodeURIComponent(email).replace(/\./g, "\\.")}`
        )
      );
      await expect(options.heading()).toBeVisible();
    }
  );

  test(
    "Contact administrator opens the support form with the email filled in",
    { tag: ["@TC-PASSWORD-088"] },
    async ({ forgotPasswordPage: options }) => {
      const email = "help-me@e2e.example.com";
      await options.goto(email);
      await options.contactAdminOption().click();
      const dialog = options.supportDialog;
      await expect(dialog.root()).toBeVisible();
      await expect(dialog.emailInput()).toHaveValue(email);
      await expect(dialog.emailInput()).toBeEditable();
      await expect(dialog.emailPrefilledHint()).toBeVisible();
    }
  );
});

test.describe("by one-time code", () => {
  test(
    "Recovery by one-time code",
    { tag: ["@TC-PASSWORD-052", "@smoke"] },
    async ({
      page,
      forgotPasswordPage: options,
      forgotPasswordOtpPage: codeStep,
      forgotPasswordResetPage: form
    }) => {
      const account = await createAccount({ tag: "fpui-otp" });
      await options.goto(account.email);
      expect((await options.chooseOtp()).status()).toBe(200);
      await expect(page).toHaveURL(/\/forgot-password\/otp\?email=/);
      await expect(codeStep.heading()).toBeVisible();
      await plantCode("forgotPasswordOtp", account.email, KNOWN_OTP);

      await codeStep.enterCode(KNOWN_OTP);
      await expect(page).toHaveURL(
        /\/forgot-password\/reset\?email=.*&token=/,
        { timeout: 15_000 }
      );
      await expect(form.heading()).toBeVisible();

      await form.fillNewPassword(NEW_PASSWORD);
      await form.submit();
      await expect(form.message(reset.message.success)).toBeVisible({
        timeout: 15_000
      });
      await expect(page).toHaveURL(/\/login(\?|$)/);

      expect((await loginOverApi(account.email, NEW_PASSWORD)).status).toBe(
        200
      );
      expect((await loginOverApi(account.email, account.password)).status).toBe(
        401
      );
    }
  );

  test(
    "A wrong code clears the boxes and says how many tries remain",
    { tag: ["@TC-PASSWORD-053"] },
    async ({
      page,
      forgotPasswordPage: options,
      forgotPasswordOtpPage: codeStep
    }) => {
      const account = await createAccount({ tag: "fpui-otpbad" });
      await options.goto(account.email);
      expect((await options.chooseOtp()).status()).toBe(200);
      await expect(page).toHaveURL(/\/forgot-password\/otp/);
      await plantCode("forgotPasswordOtp", account.email, KNOWN_OTP);

      expect((await codeStep.enterCodeAndWait("000000")).status()).toBe(401);
      await expect(
        codeStep.message(
          fill(serverMessage.forgotPassword.errors.invalidOtpWithRemaining, {
            remaining: 4
          })
        )
      ).toBeVisible({ timeout: 10_000 });
      await expect(codeStep.codeInput()).toHaveValue("");
      await expect(page).toHaveURL(/\/forgot-password\/otp/);
    }
  );

  test(
    "The code step shows the resend countdown and a way back",
    { tag: ["@TC-PASSWORD-060"] },
    async ({
      page,
      forgotPasswordPage: options,
      forgotPasswordOtpPage: codeStep
    }) => {
      const account = await createAccount({ tag: "fpui-resend" });
      await options.goto(account.email);
      expect((await options.chooseOtp()).status()).toBe(200);
      await expect(codeStep.resendCountdown()).toBeVisible();
      await expect(codeStep.resendCountdown()).toBeDisabled();

      await codeStep.tryOtherLink().click();
      await expect(page).toHaveURL(/\/forgot-password\?email=/);
      await expect(options.heading()).toBeVisible();
    }
  );
});

test.describe("new password form", () => {
  // The OTP path puts the reset token straight in the URL, so the form can be
  // opened with any token; client validation must block before any request.
  const FAKE_TOKEN = "f".repeat(128);

  test.describe("The new-password form enforces the policy before the API", () => {
    const cases: ReadonlyArray<{
      label: string;
      value: string;
      confirm?: string;
      message: string;
    }> = [
      {
        label: "7 characters",
        value: "Ab@3xyz",
        message: v.newPassword.minLength
      },
      {
        label: "no uppercase",
        value: "recover@123",
        message: v.newPassword.requirements
      },
      {
        label: "no digit",
        value: "Recover@abc",
        message: v.newPassword.requirements
      },
      {
        label: "no special character",
        value: "Recover1234",
        message: v.newPassword.requirements
      },
      {
        label: "a mismatched confirmation",
        value: NEW_PASSWORD,
        confirm: "Different@123",
        message: v.confirmPassword.mismatch
      }
    ];
    for (const c of cases) {
      test(
        `rejects ${c.label} without calling the API`,
        { tag: ["@TC-PASSWORD-054"] },
        async ({ page, forgotPasswordResetPage: form }) => {
          const resets = countResets(page);
          await form.goto("form@e2e.example.com", FAKE_TOKEN);
          await form.fillNewPassword(c.value, c.confirm ?? c.value);
          await form.submit();
          await expect(form.message(c.message)).toBeVisible();
          expect(resets.count).toBe(0);
        }
      );
    }
  });

  test(
    "A reset token the server no longer holds is refused in the UI",
    { tag: ["@TC-PASSWORD-059"] },
    async ({ page, forgotPasswordResetPage: form }) => {
      const account = await createAccount({ tag: "fpui-stale" });
      await form.goto(account.email, FAKE_TOKEN);
      await form.fillNewPassword(NEW_PASSWORD);
      await form.submit();
      await expect(
        form.message(serverMessage.forgotPassword.errors.invalidResetToken)
      ).toBeVisible({ timeout: 10_000 });
      await expect(page).toHaveURL(/\/forgot-password\/reset/);
      expect((await loginOverApi(account.email, account.password)).status).toBe(
        200
      );
    }
  );
});

test.describe("by magic link", () => {
  test(
    "Recovery by magic link",
    { tag: ["@TC-PASSWORD-055", "@smoke"] },
    async ({
      page,
      forgotPasswordPage: options,
      forgotPasswordMagicLinkPage: checkEmail,
      forgotPasswordResetPage: form
    }) => {
      const account = await createAccount({ tag: "fpui-magic" });
      await options.goto(account.email);
      expect((await options.chooseMagicLink()).status()).toBe(200);
      await expect(page).toHaveURL(/\/forgot-password\/magic-link\?email=/);
      await expect(checkEmail.heading()).toBeVisible();
      await plantCode(
        "forgotPasswordMagicLink",
        account.email,
        KNOWN_MAGIC_TOKEN
      );

      // The page verifies the link from a mount effect, which the dev build's
      // StrictMode runs twice (see TC-PASSWORD-063). Answer any repeat with the
      // first response, as a single production mount would see it.
      await answerRepeatVerifyWithFirst(page);
      await form.goto(account.email, KNOWN_MAGIC_TOKEN, "magic-link");
      await expect(form.newPasswordInput()).toBeEnabled();
      await form.fillNewPassword(NEW_PASSWORD);
      await form.submit();
      await expect(form.message(reset.message.success)).toBeVisible({
        timeout: 15_000
      });
      await expect(page).toHaveURL(/\/login(\?|$)/);
      expect((await loginOverApi(account.email, NEW_PASSWORD)).status).toBe(
        200
      );
    }
  );

  test(
    "Opening a magic link verifies it once",
    { tag: ["@TC-PASSWORD-063"] },
    async ({
      page,
      forgotPasswordPage: options,
      forgotPasswordResetPage: form
    }) => {
      const account = await createAccount({ tag: "fpui-once" });
      await options.goto(account.email);
      // useForgotPasswordReset verifies the link in a mount effect with no
      // once-guard; React StrictMode fires it twice, the two calls race
      // (second may 401 → "link expired", or mint a second reset token that
      // invalidates the first). StrictMode double effects exist in `next dev`
      // only, so the defect is expected against a dev client and absent from
      // a production build.
      // BUG: defects/password.md#bug-password-03
      test.fail(
        await isDevBuild(page),
        "BUG-PASSWORD-03 — dev-only double verify"
      );
      expect((await options.chooseMagicLink()).status()).toBe(200);
      await plantCode(
        "forgotPasswordMagicLink",
        account.email,
        KNOWN_MAGIC_TOKEN
      );
      const verifies = countMagicLinkVerifies(page);
      await form.goto(account.email, KNOWN_MAGIC_TOKEN, "magic-link");
      await expect(form.heading()).toBeVisible();
      await page.waitForLoadState("networkidle");
      expect(verifies.count).toBe(1);
    }
  );

  test(
    "The link in the reset email opens the form",
    { tag: ["@TC-PASSWORD-056", "@smoke"] },
    async ({
      page,
      forgotPasswordPage: options,
      forgotPasswordResetPage: form
    }) => {
      // The email links to `${CLIENT_URL}/reset-password?…` (server
      // send-link.ts) but the client route is /forgot-password/reset, so the
      // emailed link is a 404.
      // BUG: defects/password.md#bug-password-02
      test.fail();
      const account = await createAccount({ tag: "fpui-email" });
      await options.goto(account.email);
      expect((await options.chooseMagicLink()).status()).toBe(200);
      const mail = await readQueuedEmail("MAGIC_LINK", account.email);
      const link = String(mail.magicLinkUrl);
      expect(link).toContain(encodeURIComponent(account.email));

      await page.goto(link);
      await expect(form.heading()).toBeVisible({ timeout: 10_000 });
    }
  );

  test(
    "An invalid or used link shows the expired message",
    { tag: ["@TC-PASSWORD-057"] },
    async ({ forgotPasswordResetPage: form }) => {
      const account = await createAccount({ tag: "fpui-badlink" });
      await form.goto(account.email, "cd".repeat(64), "magic-link");
      await expect(
        form.message(reset.message.error.tokenExpired)
      ).toBeVisible();
      await expect(form.resetButton()).toHaveCount(0);
    }
  );

  test(
    "The magic-link step shows the resend countdown and a way back",
    { tag: ["@TC-PASSWORD-089"] },
    async ({
      page,
      forgotPasswordPage: options,
      forgotPasswordMagicLinkPage: checkEmail
    }) => {
      const account = await createAccount({ tag: "fpui-mlresend" });
      await options.goto(account.email);
      expect((await options.chooseMagicLink()).status()).toBe(200);
      await expect(checkEmail.heading()).toBeVisible();
      await expect(checkEmail.resendCountdown()).toBeVisible();
      await expect(checkEmail.resendCountdown()).toBeDisabled();

      await checkEmail.tryOtherLink().click();
      await expect(page).toHaveURL(/\/forgot-password\?email=/);
      await expect(options.heading()).toBeVisible();
    }
  );
});

test(
  "Recovery screens in Vietnamese",
  { tag: ["@TC-PASSWORD-058"] },
  async ({ page }) => {
    const email = "vi-user@e2e.example.com";
    const options = new ForgotPasswordPage(page, copyVi);
    await options.goto(email, "/vi");
    await expect(options.heading()).toBeVisible();
    await expect(options.otpOption()).toBeVisible();
    await expect(options.magicLinkOption()).toBeVisible();

    const form = new ForgotPasswordResetPage(page, copyVi);
    await form.goto(email, "f".repeat(128), undefined, "/vi");
    await expect(form.heading()).toBeVisible();
    await expect(form.newPasswordInput()).toBeVisible();
    await expect(form.confirmPasswordInput()).toBeVisible();
    await expect(form.resetButton()).toBeVisible();
  }
);

test.describe("as a signed-in user", () => {
  test.use({ role: "user" });

  test(
    "A signed-in user is kept out of the recovery pages",
    { tag: ["@TC-PASSWORD-087"] },
    async ({
      page,
      forgotPasswordPage: options,
      forgotPasswordResetPage: form
    }) => {
      const email = encodeURIComponent("someone@e2e.example.com");
      for (const path of [
        `/forgot-password?email=${email}`,
        `/forgot-password/otp?email=${email}`,
        `/forgot-password/magic-link?email=${email}`,
        `/forgot-password/reset?email=${email}&token=${"f".repeat(128)}`
      ]) {
        await page.goto(path);
        await expect(page, path).toHaveURL(/\/$/);
        await expect(options.heading()).toHaveCount(0);
        await expect(form.heading()).toHaveCount(0);
      }
    }
  );
});
