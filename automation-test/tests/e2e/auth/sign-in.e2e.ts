import { test, expect as baseExpect } from "@fixtures";
import { createAccount } from "@helpers/accounts";
import { USER_EMAIL, USER_PASSWORD } from "@helpers/env";
import { WRONG_PASSWORD, loginViaUi, setAuthFlags } from "@helpers/auth";

// Email-first sign-in — client/src/views/Logins/{Login,LoginPassword}.
// Copy: client/src/locales/en/{login,common}.json; error toasts carry the
// server message (server/src/i18n/locales/en/login.json) via the
// React Query mutation cache (client/src/libs/query-client.ts).

test.use({ role: "guest" });

// The dev server compiles routes on first hit and is shared with other runs.
const expect = baseExpect.configure({ timeout: 15_000 });

const EN = {
  welcome: "Welcome",
  next: "Continue with email",
  passwordTitle: "Enter your password",
  passwordLabel: "Enter your password",
  signIn: "Sign in",
  invalidCredentials: "Invalid email or password",
  emailRequired: "Please enter email",
  emailInvalid: "Invalid email format",
  inactive: "Your account has been deactivated. Please contact support",
  unverified: "Please verify your email address before logging in"
};

test(
  "a registered email continues to the password step",
  { tag: ["@TC-AUTH-001"] },
  async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: EN.welcome })).toBeVisible();
    await page.getByLabel("Email").fill(USER_EMAIL);
    await page.getByRole("button", { name: EN.next }).click();

    await expect(page).toHaveURL(
      `/login/password?email=${encodeURIComponent(USER_EMAIL)}`
    );
    await expect(
      page.getByRole("heading", { name: EN.passwordTitle })
    ).toBeVisible();
    await expect(page.getByText(USER_EMAIL)).toBeVisible();
    await expect(page.getByLabel(EN.passwordLabel)).toBeVisible();
  }
);

test(
  "the email step validates the address before calling the API",
  { tag: ["@TC-AUTH-002"] },
  async ({ page }) => {
    const calls: string[] = [];
    page.on("request", (r) => {
      if (r.url().includes("/api/v1/auth/signup/")) calls.push(r.url());
    });
    await page.goto("/login");
    const next = page.getByRole("button", { name: EN.next });

    await next.click();
    await expect(page.getByText(EN.emailRequired)).toBeVisible();

    await page.getByLabel("Email").fill("user@");
    await next.click();
    await expect(page.getByText(EN.emailInvalid)).toBeVisible();
    await expect(page.getByLabel("Email")).toHaveAttribute(
      "aria-invalid",
      "true"
    );

    await expect(page).toHaveURL(/\/login$/);
    expect(calls).toEqual([]);
  }
);

test(
  "sign-in sub-steps without their parameters send the user back to /login",
  { tag: ["@TC-AUTH-005"] },
  async ({ page }) => {
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
      await expect(
        page.getByRole("heading", { name: EN.welcome }),
        path
      ).toBeVisible();
      await expect(page, path).toHaveURL(/\/login$/);
    }
  }
);

test(
  "a user signs in with email and password and lands on home",
  { tag: ["@TC-AUTH-024", "@smoke"] },
  async ({ page }) => {
    await loginViaUi(page, USER_EMAIL, USER_PASSWORD);
    await page.getByRole("button", { name: "Open user menu" }).click();
    await expect(page.getByRole("menu").getByText(USER_EMAIL)).toBeVisible();
  }
);

test(
  "a wrong password shows the error and keeps the user on the password step",
  { tag: ["@TC-AUTH-025"] },
  async ({ page }) => {
    const account = await createAccount({ tag: "auth-ui-wrong" });
    await page.goto(
      `/login/password?email=${encodeURIComponent(account.email)}`
    );
    await page.getByLabel(EN.passwordLabel).fill(WRONG_PASSWORD);
    await page.getByRole("button", { name: EN.signIn, exact: true }).click();

    await expect(page.getByText(EN.invalidCredentials)).toBeVisible();
    await expect(page).toHaveURL(/\/login\/password\?email=/);
    // The form is usable again for a retry.
    await expect(
      page.getByRole("button", { name: EN.signIn, exact: true })
    ).toBeEnabled();
  }
);

test(
  "double-clicking Sign in sends a single login request",
  { tag: ["@TC-AUTH-028"] },
  async ({ page }) => {
    let posts = 0;
    page.on("request", (r) => {
      if (r.method() === "POST" && /\/api\/v1\/auth\/login$/.test(r.url()))
        posts += 1;
    });
    await page.goto(`/login/password?email=${encodeURIComponent(USER_EMAIL)}`);
    await page.getByLabel(EN.passwordLabel).fill(USER_PASSWORD);
    await page.getByRole("button", { name: EN.signIn, exact: true }).dblclick();

    await expect(page).toHaveURL(/\/$/);
    await expect(
      page.getByRole("button", { name: "Open user menu" })
    ).toBeVisible();
    expect(posts).toBe(1);
  }
);

test(
  "Back after signing in does not return to the login form",
  { tag: ["@TC-AUTH-029"] },
  async ({ page }) => {
    await loginViaUi(page, USER_EMAIL, USER_PASSWORD);
    await page.goBack();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByLabel(EN.passwordLabel)).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Open user menu" })
    ).toBeVisible();
  }
);

test(
  "inactive and unverified accounts are told why they cannot sign in",
  { tag: ["@TC-AUTH-031"] },
  async ({ page }) => {
    const inactive = await createAccount({ tag: "auth-ui-off" });
    await setAuthFlags(inactive.email, { isActive: false });
    const unverified = await createAccount({ tag: "auth-ui-unver" });
    await setAuthFlags(unverified.email, { verifiedEmail: false });

    for (const [account, message] of [
      [inactive, EN.inactive],
      [unverified, EN.unverified]
    ] as const) {
      // Both still count as "registered" at the email step.
      await page.goto("/login");
      await page.getByLabel("Email").fill(account.email);
      await page.getByRole("button", { name: EN.next }).click();
      await expect(page).toHaveURL(/\/login\/password\?email=/);

      await page.getByLabel(EN.passwordLabel).fill(account.password);
      await page.getByRole("button", { name: EN.signIn, exact: true }).click();
      await expect(page.getByText(message)).toBeVisible();
      await expect(page).toHaveURL(/\/login\/password\?email=/);
    }
  }
);
