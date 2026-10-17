import { test, expect as baseExpect } from "@/fixtures";
import { copy } from "@/data/copy";
import { throwawayEmail } from "@/utils/accounts";

// Alternative-methods screen — client/src/views/Logins/LoginAlternative.
// Copy: client/src/locales/en/login.json → form.alternative / form.otp /
// form.magicLink. The address never needs to exist: picking a passwordless
// option sends nothing to an unknown address (server answers a generic 200).

test.use({ role: "guest" });

const expect = baseExpect.configure({ timeout: 15_000 });

const { alternative } = copy.login.form;
const OPTIONS = [
  alternative.magicLink.title,
  alternative.otp.title,
  alternative.password.title,
  alternative.contactAdmin.title
];

test(
  "The alternative screen switches between password, code and magic link",
  { tag: ["@TC-AUTH-041"] },
  async ({
    page,
    loginPasswordPage,
    loginAlternativePage,
    loginOtpPage,
    loginMagicLinkPage
  }) => {
    const email = throwawayEmail("auth-ui-alt");
    const q = `?email=${encodeURIComponent(email)}`;

    // password → alternative
    await loginPasswordPage.goto(email);
    await loginPasswordPage.tryAnotherWayLink().click();
    await expect(page).toHaveURL(`/login/alternative${q}`);
    await expect(loginAlternativePage.heading()).toBeVisible();
    await expect(loginAlternativePage.email(email)).toBeVisible();
    for (const option of OPTIONS) {
      await expect(loginAlternativePage.option(option)).toBeVisible();
    }
    await expect(loginAlternativePage.description()).toBeVisible();

    // alternative → password
    await loginAlternativePage.passwordOption().click();
    await expect(page).toHaveURL(`/login/password${q}`);
    await expect(loginPasswordPage.heading()).toBeVisible();

    // alternative → code → back to alternative
    await loginAlternativePage.goto(email);
    await loginAlternativePage.otpOption().click();
    await expect(page).toHaveURL(`/login/otp${q}`);
    await loginOtpPage.tryAnotherMethodLink().click();
    await expect(page).toHaveURL(`/login/alternative${q}`);

    // alternative → magic link → back to alternative
    await loginAlternativePage.magicLinkOption().click();
    await expect(page).toHaveURL(`/login/magic-link${q}`);
    await expect(loginMagicLinkPage.heading()).toBeVisible();
    await loginMagicLinkPage.tryAnotherMethodLink().click();
    await expect(page).toHaveURL(`/login/alternative${q}`);

    // The email is kept on every hop; "Change email" returns to the start.
    await loginAlternativePage.passwordOption().click();
    await loginPasswordPage.changeEmailLink().click();
    await expect(page).toHaveURL(/\/login$/);
  }
);
