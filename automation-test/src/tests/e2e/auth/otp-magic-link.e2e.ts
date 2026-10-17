import { test, expect as baseExpect } from "@/fixtures";
import { API_PREFIX } from "@/config/urls";
import { copy, fill, serverMessage } from "@/data/copy";
import { KNOWN_MAGIC_TOKEN, KNOWN_OTP } from "@/data/test-data";
import type { LoginAlternativePage } from "@/pages/auth/login-alternative.page";
import type { BasePage } from "@/pages/base.page";
import { createAccount } from "@/utils/accounts";
import { plantWhenIssued, waitForCode } from "@/utils/auth";
import { deleteKeyOnceSet } from "@/utils/redis";

// Passwordless sign-in — client/src/views/Logins/{LoginAlternative,LoginOtp,
// LoginMagicLink,LoginMagicLinkVerify}. The code / link is sent when the
// option is picked on the alternative screen; the test waits for the
// server-issued one and plants a known value over it.

test.use({ role: "guest" });

const expect = baseExpect.configure({ timeout: 15_000 });

async function openAlternative(
  alternativePage: LoginAlternativePage,
  email: string
) {
  await alternativePage.goto(email);
  await expect(alternativePage.heading()).toBeVisible();
}

async function expectSignedIn(screen: BasePage, email: string) {
  await expect(screen.page).toHaveURL(/\/$/);
  await screen.userMenu.open();
  await expect(screen.userMenu.entry(email)).toBeVisible();
}

test(
  "A user signs in with a one-time code from the alternative screen",
  { tag: ["@TC-AUTH-032", "@smoke"] },
  async ({ page, loginAlternativePage, loginOtpPage }) => {
    const account = await createAccount({ tag: "auth-ui-otp" });
    await openAlternative(loginAlternativePage, account.email);
    await loginAlternativePage.otpOption().click();

    await expect(page).toHaveURL(/\/login\/otp\?email=/);
    await expect(loginOtpPage.heading()).toBeVisible();
    await expect(loginOtpPage.instruction()).toBeVisible();

    await plantWhenIssued("login", account.email, KNOWN_OTP);
    await loginOtpPage.otp.enter(KNOWN_OTP);
    await expectSignedIn(loginOtpPage, account.email);
  }
);

test(
  "A wrong one-time code shows how many attempts remain",
  { tag: ["@TC-AUTH-033"] },
  async ({ page, loginAlternativePage, loginOtpPage }) => {
    const account = await createAccount({ tag: "auth-ui-otpbad" });
    await openAlternative(loginAlternativePage, account.email);
    await loginAlternativePage.otpOption().click();
    await plantWhenIssued("login", account.email, KNOWN_OTP);

    await loginOtpPage.otp.enter("999999");
    await expect(
      loginOtpPage.toast.withText(
        fill(serverMessage.login.errors.invalidOtpWithRemaining, {
          remaining: 4
        })
      )
    ).toBeVisible();
    await expect(loginOtpPage.otp.input()).toHaveValue("");
    await expect(page).toHaveURL(/\/login\/otp\?email=/);
  }
);

test(
  "A user signs in by opening the magic link",
  { tag: ["@TC-AUTH-037", "@smoke"] },
  async ({
    page,
    loginAlternativePage,
    loginMagicLinkPage,
    verifyMagicLinkPage
  }) => {
    const account = await createAccount({ tag: "auth-ui-ml" });
    await openAlternative(loginAlternativePage, account.email);
    await loginAlternativePage.magicLinkOption().click();

    await expect(page).toHaveURL(/\/login\/magic-link\?email=/);
    await expect(loginMagicLinkPage.heading()).toBeVisible();
    await expect(loginMagicLinkPage.email(account.email)).toBeVisible();

    await plantWhenIssued("magicLinkLogin", account.email, KNOWN_MAGIC_TOKEN);
    await verifyMagicLinkPage.goto(account.email);
    await expectSignedIn(verifyMagicLinkPage, account.email);
  }
);

test(
  "An invalid magic link sends the user back to login",
  { tag: ["@TC-AUTH-038"] },
  async ({ page, verifyMagicLinkPage, loginPage }) => {
    const account = await createAccount({ tag: "auth-ui-mlbad" });
    // Never issued → invalid. (The error toast lives 4 s and is not asserted:
    // the redirect target may still be compiling when it fades.)
    const verify = page.waitForResponse((r) =>
      r.url().endsWith(`${API_PREFIX}/auth/login/magic-link/verify`)
    );
    await verifyMagicLinkPage.goto(account.email, "e".repeat(128));
    await expect(verifyMagicLinkPage.heading()).toBeVisible();
    expect((await verify).status()).toBe(401);
    await expect(page).toHaveURL(/\/login$/);
    await expect(loginPage.heading()).toBeVisible();
  }
);

test.describe(
  "Resend on the code and magic-link screens waits out the cooldown",
  { tag: ["@TC-AUTH-072"] },
  () => {
    test("the code screen", async ({
      page,
      loginAlternativePage,
      loginOtpPage
    }) => {
      await page.clock.install();
      const account = await createAccount({ tag: "auth-ui-otpresend" });
      await openAlternative(loginAlternativePage, account.email);
      await loginAlternativePage.otpOption().click();
      await expect(page).toHaveURL(/\/login\/otp\?email=/);
      await waitForCode("login", account.email);

      const countdown = loginOtpPage.resendCountdownButton();
      await expect(countdown).toBeVisible();
      await expect(countdown).toBeDisabled();

      // Let the client countdown run out, and the server's 60 s key with it.
      await page.clock.fastForward("01:01");
      await deleteKeyOnceSet(`otp-login-cooldown:${account.email}`);
      const resend = loginOtpPage.resendButton();
      await expect(resend).toBeEnabled();
      await resend.click();

      await expect(
        loginOtpPage.toast.withText(copy.login.form.otp.resendSuccess)
      ).toBeVisible();
      await expect(loginOtpPage.resendCountdownButton()).toBeDisabled();
    });

    test("the magic-link screen", async ({
      page,
      loginAlternativePage,
      loginMagicLinkPage
    }) => {
      await page.clock.install();
      const account = await createAccount({ tag: "auth-ui-mlresend" });
      await openAlternative(loginAlternativePage, account.email);
      await loginAlternativePage.magicLinkOption().click();
      await expect(page).toHaveURL(/\/login\/magic-link\?email=/);
      await waitForCode("magicLinkLogin", account.email);

      const countdown = loginMagicLinkPage.resendCountdownButton();
      await expect(countdown).toBeVisible();
      await expect(countdown).toBeDisabled();

      await page.clock.fastForward("01:01");
      await deleteKeyOnceSet(`magic-link-login-cooldown:${account.email}`);
      const resend = loginMagicLinkPage.resendButton();
      await expect(resend).toBeEnabled();
      await resend.click();

      await expect(
        loginMagicLinkPage.toast.withText(
          copy.login.form.magicLink.resendSuccess
        )
      ).toBeVisible();
      await expect(loginMagicLinkPage.resendCountdownButton()).toBeDisabled();
    });
  }
);
