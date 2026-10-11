import { test, expect as baseExpect } from "@fixtures";
import { throwawayEmail } from "@helpers/accounts";

// Alternative-methods screen — client/src/views/Logins/LoginAlternative.
// Copy: client/src/locales/en/login.json → form.alternative / form.otp /
// form.magicLink. The address never needs to exist: picking a passwordless
// option sends nothing to an unknown address (server answers a generic 200).

test.use({ role: "guest" });

const expect = baseExpect.configure({ timeout: 15_000 });

const OPTIONS = [
  "Login with Magic Link",
  "Login with OTP",
  "Login with password",
  "Contact administrator"
];

test(
  "the alternative screen switches between password, code and magic link",
  { tag: ["@TC-AUTH-041"] },
  async ({ page }) => {
    const email = throwawayEmail("auth-ui-alt");
    const q = `?email=${encodeURIComponent(email)}`;

    // password → alternative
    await page.goto(`/login/password${q}`);
    await page.getByRole("link", { name: "Try another way" }).click();
    await expect(page).toHaveURL(`/login/alternative${q}`);
    await expect(
      page.getByRole("heading", { name: "Choose login method" })
    ).toBeVisible();
    await expect(page.getByText(email)).toBeVisible();
    for (const option of OPTIONS) {
      await expect(page.getByText(option, { exact: true })).toBeVisible();
    }
    await expect(
      page.getByText("Choose the login method that suits you")
    ).toBeVisible();

    // alternative → password
    await page.getByRole("link", { name: /Login with password/ }).click();
    await expect(page).toHaveURL(`/login/password${q}`);
    await expect(
      page.getByRole("heading", { name: "Enter your password" })
    ).toBeVisible();

    // alternative → code → back to alternative
    await page.goto(`/login/alternative${q}`);
    await page.getByRole("button", { name: /Login with OTP/ }).click();
    await expect(page).toHaveURL(`/login/otp${q}`);
    await page.getByRole("link", { name: "Try another method" }).click();
    await expect(page).toHaveURL(`/login/alternative${q}`);

    // alternative → magic link → back to alternative
    await page.getByRole("button", { name: /Login with Magic Link/ }).click();
    await expect(page).toHaveURL(`/login/magic-link${q}`);
    await expect(
      page.getByRole("heading", { name: "Check your email" })
    ).toBeVisible();
    await page.getByRole("link", { name: "Try another method" }).click();
    await expect(page).toHaveURL(`/login/alternative${q}`);

    // The email is kept on every hop; "Change email" returns to the start.
    await page.getByRole("link", { name: /Login with password/ }).click();
    await page.getByRole("link", { name: "Change email" }).click();
    await expect(page).toHaveURL(/\/login$/);
  }
);
