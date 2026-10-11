import { test, expect as baseExpect } from "@fixtures";
import type { Page } from "@playwright/test";
import { KNOWN_OTP, createAccount } from "@helpers/accounts";
import {
  KNOWN_MAGIC_TOKEN,
  magicLinkUrl,
  plantWhenIssued,
  typeOtp
} from "@helpers/auth";

// Passwordless sign-in — client/src/views/Logins/{LoginAlternative,LoginOtp,
// LoginMagicLink,LoginMagicLinkVerify}. The code / link is sent when the
// option is picked on the alternative screen; the test waits for the
// server-issued one and plants a known value over it.

test.use({ role: "guest" });

const expect = baseExpect.configure({ timeout: 15_000 });

const EN = {
  otpOption: "Login with OTP",
  magicOption: "Login with Magic Link",
  otpTitle: "Enter verification code",
  magicTitle: "Check your email",
  welcome: "Welcome"
};

async function openAlternative(page: Page, email: string) {
  await page.goto(`/login/alternative?email=${encodeURIComponent(email)}`);
  await expect(
    page.getByRole("heading", { name: "Choose login method" })
  ).toBeVisible();
}

async function expectSignedIn(page: Page, email: string) {
  await expect(page).toHaveURL(/\/$/);
  await page.getByRole("button", { name: "Open user menu" }).click();
  await expect(page.getByRole("menu").getByText(email)).toBeVisible();
}

test(
  "a user signs in with a one-time code from the alternative screen",
  { tag: ["@TC-AUTH-032"] },
  async ({ page }) => {
    const account = await createAccount({ tag: "auth-ui-otp" });
    await openAlternative(page, account.email);
    await page.getByRole("button", { name: new RegExp(EN.otpOption) }).click();

    await expect(page).toHaveURL(/\/login\/otp\?email=/);
    await expect(
      page.getByRole("heading", { name: EN.otpTitle })
    ).toBeVisible();
    await expect(
      page.getByText("Please enter the 6-digit code sent to your email")
    ).toBeVisible();

    await plantWhenIssued("login", account.email, KNOWN_OTP);
    await typeOtp(page, KNOWN_OTP);
    await expectSignedIn(page, account.email);
  }
);

test(
  "a wrong one-time code shows how many attempts remain",
  { tag: ["@TC-AUTH-033"] },
  async ({ page }) => {
    const account = await createAccount({ tag: "auth-ui-otpbad" });
    await openAlternative(page, account.email);
    await page.getByRole("button", { name: new RegExp(EN.otpOption) }).click();
    await plantWhenIssued("login", account.email, KNOWN_OTP);

    await typeOtp(page, "999999");
    await expect(
      page.getByText("Invalid OTP code. 4 attempts remaining")
    ).toBeVisible();
    await expect(page.locator('input[data-slot="input-otp"]')).toHaveValue("");
    await expect(page).toHaveURL(/\/login\/otp\?email=/);
  }
);

test(
  "a user signs in by opening the magic link",
  { tag: ["@TC-AUTH-037"] },
  async ({ page }) => {
    const account = await createAccount({ tag: "auth-ui-ml" });
    await openAlternative(page, account.email);
    await page
      .getByRole("button", { name: new RegExp(EN.magicOption) })
      .click();

    await expect(page).toHaveURL(/\/login\/magic-link\?email=/);
    await expect(
      page.getByRole("heading", { name: EN.magicTitle })
    ).toBeVisible();
    await expect(page.getByText(account.email)).toBeVisible();

    await plantWhenIssued("magicLinkLogin", account.email, KNOWN_MAGIC_TOKEN);
    await page.goto(magicLinkUrl(account.email));
    await expectSignedIn(page, account.email);
  }
);

test(
  "an invalid magic link sends the user back to login",
  { tag: ["@TC-AUTH-038"] },
  async ({ page }) => {
    const account = await createAccount({ tag: "auth-ui-mlbad" });
    // Never issued → invalid. (The error toast lives 4 s and is not asserted:
    // the redirect target may still be compiling when it fades.)
    const verify = page.waitForResponse((r) =>
      r.url().endsWith("/api/v1/auth/login/magic-link/verify")
    );
    await page.goto(magicLinkUrl(account.email, "e".repeat(128)));
    await expect(
      page.getByRole("heading", { name: "Verifying magic link..." })
    ).toBeVisible();
    expect((await verify).status()).toBe(401);
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole("heading", { name: EN.welcome })).toBeVisible();
  }
);
