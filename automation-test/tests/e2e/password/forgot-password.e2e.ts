import { test, expect } from "@fixtures";
import type { Page } from "@playwright/test";
import { createAccount, KNOWN_OTP } from "@helpers/accounts";
import { plantCode } from "@helpers/redis";
import {
  KNOWN_MAGIC_TOKEN,
  loginOverApi,
  readQueuedEmail
} from "@helpers/password";

// Forgot password in the browser — options → OTP or magic link → new
// password → login. Test cases: test-cases/password.md (TC-PWD-050 …
// TC-PWD-061). Runs as `guest`; accounts are throwaways, codes are planted
// after the real send call. Copy is verbatim from
// client/src/locales/{en,vi}/{forgotPassword,forgotPasswordReset}.json.

test.use({ role: "guest" });

const NEW_PASSWORD = "Recovered@123";

const EN = {
  optionsTitle: "Password Recovery",
  otpOption: "Send OTP via email",
  magicOption: "Send Magic Link",
  twoFactor: "Two-Factor Authentication (2FA)",
  unavailable: "Unavailable",
  contactAdmin: "Contact administrator",
  changeEmail: "Change email",
  otpTitle: "Enter verification code",
  magicTitle: "Check your email",
  tryOther: "Try another method",
  resetTitle: "Set new password",
  newPassword: "New password",
  confirmPassword: "Confirm password",
  resetButton: "Reset password",
  resetSuccess: "Password reset successfully! Redirecting to login...",
  linkInvalid: "This link is invalid or has expired. Please request a new one.",
  invalidResetToken: "Invalid or expired reset token. Please start over",
  mismatch: "Passwords do not match",
  requirements:
    "Password must contain uppercase, lowercase, number and special character",
  minLength: "Password must be at least 8 characters"
} as const;

const VI = {
  optionsTitle: "Khôi phục mật khẩu",
  otpOption: "Gửi mã OTP qua email",
  magicOption: "Gửi Magic Link",
  resetTitle: "Tạo mật khẩu mới",
  newPassword: "Mật khẩu mới",
  confirmPassword: "Xác nhận mật khẩu",
  resetButton: "Đặt lại mật khẩu"
} as const;

const enc = encodeURIComponent;
const optionsUrl = (email: string, prefix = "") =>
  `${prefix}/forgot-password?email=${enc(email)}`;
const resetUrl = (email: string, token: string, method?: string) =>
  `/forgot-password/reset?email=${enc(email)}&token=${token}${
    method ? `&method=${method}` : ""
  }`;

const otpInput = (page: Page) => page.locator("input[data-input-otp]");

async function chooseOption(page: Page, name: string, endpoint: string) {
  const sent = page.waitForResponse(
    (r) => r.url().includes(endpoint) && r.request().method() === "POST"
  );
  await page.getByRole("button", { name: new RegExp(name) }).click();
  expect((await sent).status()).toBe(200);
}

/** Lets the first magic-link verify through and replays its answer for repeats. */
async function answerRepeatVerifyWithFirst(page: Page) {
  let first: Promise<{ status: number; body: string }> | null = null;
  await page.route("**/forgot-password/magic-link/verify", async (route) => {
    if (!first) {
      first = route.fetch().then(async (r) => ({
        status: r.status(),
        body: await r.text()
      }));
    }
    const { status, body } = await first;
    await route.fulfill({ status, contentType: "application/json", body });
  });
}

async function fillNewPassword(page: Page, value: string, confirm = value) {
  await page.getByLabel(EN.newPassword, { exact: true }).fill(value);
  await page.getByLabel(EN.confirmPassword, { exact: true }).fill(confirm);
}

test.describe("Forgot password — entry and options", () => {
  test(
    "opening /forgot-password without an email sends the user to /login",
    { tag: ["@TC-PWD-050"] },
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
    "the options page lists the recovery methods; 2FA is unavailable",
    { tag: ["@TC-PWD-051"] },
    async ({ page }) => {
      const email = "someone@e2e.example.com";
      await page.goto(optionsUrl(email));
      await expect(
        page.getByRole("heading", { name: EN.optionsTitle })
      ).toBeVisible();
      await expect(page.getByText(email).first()).toBeVisible();
      await expect(
        page.getByRole("button", { name: new RegExp(EN.otpOption) })
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: new RegExp(EN.magicOption) })
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: new RegExp(EN.contactAdmin) })
      ).toBeVisible();
      // 2FA is shown but is not an actionable control.
      await expect(page.getByText(EN.twoFactor)).toBeVisible();
      await expect(page.getByText(EN.unavailable)).toBeVisible();
      await expect(
        page.getByRole("button", { name: new RegExp(EN.twoFactor) })
      ).toHaveCount(0);

      await page.getByRole("link", { name: EN.changeEmail }).click();
      await expect(page).toHaveURL(/\/login(\?|$)/);
    }
  );

  test(
    "the unavailable 2FA option exposes its disabled state to assistive tech",
    { tag: ["@TC-PWD-062"] },
    async ({ page }) => {
      // BUG: BUG-031 — RecoveryOptionTwoFactor passes aria-label/aria-disabled to
      // FadeSlideLeft, which drops every prop but className — the card has no
      // accessible name or disabled state.
      test.fail();
      await page.goto(optionsUrl("someone@e2e.example.com"));
      await expect(
        page.getByLabel(`${EN.twoFactor} - ${EN.unavailable}`)
      ).toHaveAttribute("aria-disabled", "true", { timeout: 5_000 });
    }
  );

  test(
    "the Forgot Password link on the password step carries the email",
    { tag: ["@TC-PWD-061"] },
    async ({ page }) => {
      const email = "carry-me@e2e.example.com";
      await page.goto(`/login/password?email=${enc(email)}`);
      await page.getByRole("link", { name: "Forgot Password?" }).click();
      await expect(page).toHaveURL(
        new RegExp(
          `/forgot-password\\?email=${enc(email).replace(/\./g, "\\.")}`
        )
      );
      await expect(
        page.getByRole("heading", { name: EN.optionsTitle })
      ).toBeVisible();
    }
  );
});

test.describe("Forgot password — by one-time code", () => {
  test(
    "OTP happy path: code → new password → sign in with it",
    { tag: ["@TC-PWD-052", "@smoke"] },
    async ({ page }) => {
      const account = await createAccount({ tag: "fpui-otp" });
      await page.goto(optionsUrl(account.email));
      await chooseOption(page, EN.otpOption, "/forgot-password/otp/send");
      await expect(page).toHaveURL(/\/forgot-password\/otp\?email=/);
      await expect(
        page.getByRole("heading", { name: EN.otpTitle })
      ).toBeVisible();
      await plantCode("forgotPasswordOtp", account.email, KNOWN_OTP);

      await otpInput(page).fill(KNOWN_OTP);
      await expect(page).toHaveURL(
        /\/forgot-password\/reset\?email=.*&token=/,
        {
          timeout: 15_000
        }
      );
      await expect(
        page.getByRole("heading", { name: EN.resetTitle })
      ).toBeVisible();

      await fillNewPassword(page, NEW_PASSWORD);
      await page.getByRole("button", { name: EN.resetButton }).click();
      await expect(page.getByText(EN.resetSuccess)).toBeVisible({
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
    "a wrong code clears the boxes, keeps the user on the step and says how many tries remain",
    { tag: ["@TC-PWD-053"] },
    async ({ page }) => {
      const account = await createAccount({ tag: "fpui-otpbad" });
      await page.goto(optionsUrl(account.email));
      await chooseOption(page, EN.otpOption, "/forgot-password/otp/send");
      await expect(page).toHaveURL(/\/forgot-password\/otp/);
      await plantCode("forgotPasswordOtp", account.email, KNOWN_OTP);

      const verified = page.waitForResponse((r) =>
        r.url().includes("/forgot-password/otp/verify")
      );
      await otpInput(page).fill("000000");
      expect((await verified).status()).toBe(401);
      await expect(
        page.getByText("Invalid OTP. 4 attempts remaining")
      ).toBeVisible({ timeout: 10_000 });
      await expect(otpInput(page)).toHaveValue("");
      await expect(page).toHaveURL(/\/forgot-password\/otp/);
    }
  );

  test(
    "the code step shows the resend countdown and links back to the options",
    { tag: ["@TC-PWD-060"] },
    async ({ page }) => {
      const account = await createAccount({ tag: "fpui-resend" });
      await page.goto(optionsUrl(account.email));
      await chooseOption(page, EN.otpOption, "/forgot-password/otp/send");
      const resend = page.getByRole("button", { name: /Resend in \d+s/ });
      await expect(resend).toBeVisible();
      await expect(resend).toBeDisabled();

      await page.getByRole("link", { name: EN.tryOther }).click();
      await expect(page).toHaveURL(/\/forgot-password\?email=/);
      await expect(
        page.getByRole("heading", { name: EN.optionsTitle })
      ).toBeVisible();
    }
  );
});

test.describe("Forgot password — new password form", () => {
  // The OTP path puts the reset token straight in the URL, so the form can be
  // opened with any token; client validation must block before any request.
  const FAKE_TOKEN = "f".repeat(128);
  const cases: ReadonlyArray<{
    label: string;
    value: string;
    confirm?: string;
    message: string;
  }> = [
    { label: "7 characters", value: "Ab@3xyz", message: EN.minLength },
    { label: "no uppercase", value: "recover@123", message: EN.requirements },
    { label: "no digit", value: "Recover@abc", message: EN.requirements },
    {
      label: "no special character",
      value: "Recover1234",
      message: EN.requirements
    },
    {
      label: "a mismatched confirmation",
      value: NEW_PASSWORD,
      confirm: "Different@123",
      message: EN.mismatch
    }
  ];
  for (const c of cases) {
    test(
      `rejects ${c.label} without calling the API`,
      { tag: ["@TC-PWD-054"] },
      async ({ page }) => {
        let resetCalls = 0;
        page.on("request", (r) => {
          if (
            r.url().includes("/forgot-password/reset") &&
            r.method() === "POST"
          )
            resetCalls += 1;
        });
        await page.goto(resetUrl("form@e2e.example.com", FAKE_TOKEN));
        await fillNewPassword(page, c.value, c.confirm ?? c.value);
        await page.getByRole("button", { name: EN.resetButton }).click();
        await expect(page.getByText(c.message)).toBeVisible();
        expect(resetCalls).toBe(0);
      }
    );
  }

  test(
    "a reset token the server no longer holds is refused with an error and no redirect",
    { tag: ["@TC-PWD-059"] },
    async ({ page }) => {
      const account = await createAccount({ tag: "fpui-stale" });
      await page.goto(resetUrl(account.email, FAKE_TOKEN));
      await fillNewPassword(page, NEW_PASSWORD);
      await page.getByRole("button", { name: EN.resetButton }).click();
      await expect(page.getByText(EN.invalidResetToken)).toBeVisible({
        timeout: 10_000
      });
      await expect(page).toHaveURL(/\/forgot-password\/reset/);
      expect((await loginOverApi(account.email, account.password)).status).toBe(
        200
      );
    }
  );
});

test.describe("Forgot password — by magic link", () => {
  test(
    "magic-link happy path: link → new password → sign in with it",
    { tag: ["@TC-PWD-055", "@smoke"] },
    async ({ page }) => {
      const account = await createAccount({ tag: "fpui-magic" });
      await page.goto(optionsUrl(account.email));
      await chooseOption(
        page,
        EN.magicOption,
        "/forgot-password/magic-link/send"
      );
      await expect(page).toHaveURL(/\/forgot-password\/magic-link\?email=/);
      await expect(
        page.getByRole("heading", { name: EN.magicTitle })
      ).toBeVisible();
      await plantCode(
        "forgotPasswordMagicLink",
        account.email,
        KNOWN_MAGIC_TOKEN
      );

      // The page verifies the link from a mount effect, which the dev build's
      // StrictMode runs twice (see TC-PWD-063). Answer any repeat with the
      // first response, as a single production mount would see it.
      await answerRepeatVerifyWithFirst(page);
      await page.goto(resetUrl(account.email, KNOWN_MAGIC_TOKEN, "magic-link"));
      await expect(
        page.getByLabel(EN.newPassword, { exact: true })
      ).toBeEnabled();
      await fillNewPassword(page, NEW_PASSWORD);
      await page.getByRole("button", { name: EN.resetButton }).click();
      await expect(page.getByText(EN.resetSuccess)).toBeVisible({
        timeout: 15_000
      });
      await expect(page).toHaveURL(/\/login(\?|$)/);
      expect((await loginOverApi(account.email, NEW_PASSWORD)).status).toBe(
        200
      );
    }
  );

  test(
    "opening a magic link verifies it exactly once",
    { tag: ["@TC-PWD-063"] },
    async ({ page }) => {
      // BUG: BUG-005 — useForgotPasswordReset verifies the link in a mount effect with
      // no once-guard; React StrictMode (dev) fires it twice, the two calls
      // race (second may 401 → "link expired", or mint a second reset token
      // that invalidates the first).
      test.fail();
      const account = await createAccount({ tag: "fpui-once" });
      await page.goto(optionsUrl(account.email));
      await chooseOption(
        page,
        EN.magicOption,
        "/forgot-password/magic-link/send"
      );
      await plantCode(
        "forgotPasswordMagicLink",
        account.email,
        KNOWN_MAGIC_TOKEN
      );
      let verifies = 0;
      page.on("request", (r) => {
        if (r.url().includes("/magic-link/verify")) verifies += 1;
      });
      await page.goto(resetUrl(account.email, KNOWN_MAGIC_TOKEN, "magic-link"));
      await expect(
        page.getByRole("heading", { name: EN.resetTitle })
      ).toBeVisible();
      await page.waitForLoadState("networkidle");
      expect(verifies).toBe(1);
    }
  );

  test(
    "the link in the reset email opens the new-password form",
    { tag: ["@TC-PWD-056"] },
    async ({ page }) => {
      // BUG: BUG-004 — the email links to `${CLIENT_URL}/reset-password?…`
      // (server send-link.ts) but the client route is /forgot-password/reset,
      // so the emailed link is a 404.
      test.fail();
      const account = await createAccount({ tag: "fpui-email" });
      await page.goto(optionsUrl(account.email));
      await chooseOption(
        page,
        EN.magicOption,
        "/forgot-password/magic-link/send"
      );
      const mail = await readQueuedEmail("MAGIC_LINK", account.email);
      const link = String(mail.magicLinkUrl);
      expect(link).toContain(enc(account.email));

      await page.goto(link);
      await expect(
        page.getByRole("heading", { name: EN.resetTitle })
      ).toBeVisible({ timeout: 10_000 });
    }
  );

  test(
    "an invalid or already-used link shows the expired-link message instead of the form",
    { tag: ["@TC-PWD-057"] },
    async ({ page }) => {
      const account = await createAccount({ tag: "fpui-badlink" });
      await page.goto(resetUrl(account.email, "cd".repeat(64), "magic-link"));
      await expect(page.getByText(EN.linkInvalid)).toBeVisible();
      await expect(
        page.getByRole("button", { name: EN.resetButton })
      ).toHaveCount(0);
    }
  );
});

test.describe("Forgot password — Vietnamese", () => {
  test(
    "options and new-password screens render in Vietnamese under /vi",
    { tag: ["@TC-PWD-058"] },
    async ({ page }) => {
      await page.goto(optionsUrl("vi-user@e2e.example.com", "/vi"));
      await expect(
        page.getByRole("heading", { name: VI.optionsTitle })
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: new RegExp(VI.otpOption) })
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: new RegExp(VI.magicOption) })
      ).toBeVisible();

      await page.goto(
        `/vi${resetUrl("vi-user@e2e.example.com", "f".repeat(128))}`
      );
      await expect(
        page.getByRole("heading", { name: VI.resetTitle })
      ).toBeVisible();
      await expect(
        page.getByLabel(VI.newPassword, { exact: true })
      ).toBeVisible();
      await expect(
        page.getByLabel(VI.confirmPassword, { exact: true })
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: VI.resetButton })
      ).toBeVisible();
    }
  );
});
