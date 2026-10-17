import { test, expect as baseExpect } from "@/fixtures";
import { USER_EMAIL, USER_PASSWORD } from "@/config/accounts";
import { API_PREFIX } from "@/config/urls";
import { copy, serverMessage } from "@/data/copy";
import { WRONG_PASSWORD } from "@/data/test-data";
import { createAccount, throwawayEmail } from "@/utils/accounts";
import { setAuthFlags } from "@/utils/auth";

// Email-first sign-in — client/src/views/Logins/{Login,LoginPassword}.
// Copy: client/src/locales/en/{login,common}.json; error toasts carry the
// server message (server/src/i18n/locales/en/login.json) via the
// React Query mutation cache (client/src/libs/query-client.ts).

test.use({ role: "guest" });

// The dev server compiles routes on first hit and is shared with other runs.
const expect = baseExpect.configure({ timeout: 15_000 });

const emailErrors = copy.common.validation.email;
const loginErrors = serverMessage.login.errors;

test(
  "A registered email continues to the password step",
  { tag: ["@TC-AUTH-001", "@smoke"] },
  async ({ page, loginPage, loginPasswordPage }) => {
    await loginPage.goto();
    await expect(loginPage.heading()).toBeVisible();
    await loginPage.submitEmail(USER_EMAIL);

    await expect(page).toHaveURL(
      `/login/password?email=${encodeURIComponent(USER_EMAIL)}`
    );
    await expect(loginPasswordPage.heading()).toBeVisible();
    await expect(loginPasswordPage.email(USER_EMAIL)).toBeVisible();
    await expect(loginPasswordPage.passwordInput()).toBeVisible();
  }
);

test(
  "The email step validates the address before calling the API",
  { tag: ["@TC-AUTH-002"] },
  async ({ page, loginPage }) => {
    const calls: string[] = [];
    page.on("request", (r) => {
      if (r.url().includes(`${API_PREFIX}/auth/signup/`)) calls.push(r.url());
    });
    await loginPage.goto();
    const next = loginPage.continueButton();

    await next.click();
    await expect(loginPage.fieldError(emailErrors.required)).toBeVisible();

    await loginPage.emailInput().fill("user@");
    await next.click();
    await expect(loginPage.fieldError(emailErrors.invalid)).toBeVisible();
    await expect(loginPage.emailInput()).toHaveAttribute(
      "aria-invalid",
      "true"
    );

    await expect(page).toHaveURL(/\/login$/);
    expect(calls).toEqual([]);
  }
);

test(
  "Flow sub-steps without their parameters send the user back to login",
  { tag: ["@TC-AUTH-005"] },
  async ({ page, loginPage }) => {
    for (const path of [
      "/login/password",
      "/login/otp",
      "/login/magic-link",
      "/login/alternative",
      "/login/verify-magic-link?email=a%40b.com",
      "/signup",
      "/signup/otp",
      "/signup/info?email=a%40b.com"
    ]) {
      await page.goto(path);
      // The server component redirects while streaming; under a busy dev
      // server the client-side URL replace can lag the rendered form.
      await expect(loginPage.heading(), path).toBeVisible();
      await expect(page, path).toHaveURL(/\/login$/);
    }
  }
);

test(
  "A user signs in with email and password and lands on home",
  { tag: ["@TC-AUTH-024", "@smoke"] },
  async ({ loginPage }) => {
    await loginPage.signIn(USER_EMAIL, USER_PASSWORD);
    await loginPage.userMenu.open();
    await expect(loginPage.userMenu.entry(USER_EMAIL)).toBeVisible();
  }
);

test(
  "A wrong password shows the error and keeps the user on the step",
  { tag: ["@TC-AUTH-025"] },
  async ({ page, loginPasswordPage }) => {
    const account = await createAccount({ tag: "auth-ui-wrong" });
    await loginPasswordPage.goto(account.email);
    await loginPasswordPage.submitPassword(WRONG_PASSWORD);

    await expect(
      loginPasswordPage.toast.withText(loginErrors.invalidCredentials)
    ).toBeVisible();
    await expect(page).toHaveURL(/\/login\/password\?email=/);
    // The form is usable again for a retry.
    await expect(loginPasswordPage.signInButton()).toBeEnabled();
  }
);

test(
  "Double-clicking Sign in sends a single login request",
  { tag: ["@TC-AUTH-028"] },
  async ({ page, loginPasswordPage }) => {
    let posts = 0;
    page.on("request", (r) => {
      if (r.method() === "POST" && r.url().endsWith(`${API_PREFIX}/auth/login`))
        posts += 1;
    });
    await loginPasswordPage.goto(USER_EMAIL);
    await loginPasswordPage.fillPassword(USER_PASSWORD);
    await loginPasswordPage.signInButton().dblclick();

    await expect(page).toHaveURL(/\/$/);
    await expect(loginPasswordPage.userMenu.trigger()).toBeVisible();
    expect(posts).toBe(1);
  }
);

test(
  "Back after signing in does not return to the login form",
  { tag: ["@TC-AUTH-029"] },
  async ({ page, loginPage, loginPasswordPage }) => {
    await loginPage.signIn(USER_EMAIL, USER_PASSWORD);
    await page.goBack();
    await expect(page).toHaveURL(/\/$/);
    await expect(loginPasswordPage.passwordInput()).toHaveCount(0);
    await expect(loginPage.userMenu.trigger()).toBeVisible();
  }
);

test(
  "Inactive and unverified accounts are told why they cannot sign in",
  { tag: ["@TC-AUTH-031"] },
  async ({ page, loginPage, loginPasswordPage }) => {
    const inactive = await createAccount({ tag: "auth-ui-off" });
    await setAuthFlags(inactive.email, { isActive: false });
    const unverified = await createAccount({ tag: "auth-ui-unver" });
    await setAuthFlags(unverified.email, { verifiedEmail: false });

    for (const [account, message] of [
      [inactive, loginErrors.accountInactive],
      [unverified, loginErrors.emailNotVerified]
    ] as const) {
      // Both still count as "registered" at the email step.
      await loginPage.goto();
      await loginPage.submitEmail(account.email);
      await expect(page).toHaveURL(/\/login\/password\?email=/);

      await loginPasswordPage.submitPassword(account.password);
      await expect(loginPasswordPage.toast.withText(message)).toBeVisible();
      await expect(page).toHaveURL(/\/login\/password\?email=/);
    }
  }
);

test(
  "The password step validates the field before calling the API",
  { tag: ["@TC-AUTH-071"] },
  async ({ page, loginPasswordPage }) => {
    let posts = 0;
    page.on("request", (r) => {
      if (r.method() === "POST" && r.url().endsWith(`${API_PREFIX}/auth/login`))
        posts += 1;
    });
    const email = throwawayEmail("auth-ui-pwempty");
    await loginPasswordPage.goto(email);
    await expect(loginPasswordPage.heading()).toBeVisible();

    await loginPasswordPage.signInButton().click();
    await expect(
      loginPasswordPage.fieldError(copy.common.validation.password.required)
    ).toBeVisible();

    await loginPasswordPage.submitPassword("abc");
    await expect(
      loginPasswordPage.fieldError(copy.common.validation.password.minLength)
    ).toBeVisible();

    await expect(page).toHaveURL(/\/login\/password\?email=/);
    expect(posts).toBe(0);
  }
);
