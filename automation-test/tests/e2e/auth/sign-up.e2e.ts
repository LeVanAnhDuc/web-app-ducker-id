import { test, expect as baseExpect } from "@fixtures";
import type { Page } from "@playwright/test";
import { KNOWN_OTP, findUserByEmail, throwawayEmail } from "@helpers/accounts";
import { clearEmailState, deleteKeys, hasCode } from "@helpers/redis";
import { plantWhenIssued, typeOtp } from "@helpers/auth";

// Sign-up — client/src/views/Logins/Login (email step sends the code for an
// unknown address), client/src/views/Signups/{SignupOtp,SignupInfo}.
// Copy: client/src/locales/en/{signup,common}.json; error toasts carry the
// server message (server/src/i18n/locales/en/signup.json).

test.use({ role: "guest" });

// The dev server compiles routes on first hit and is shared with other runs.
const expect = baseExpect.configure({ timeout: 15_000 });

const EN = {
  next: "Continue with email",
  otpTitle: "Verify Email",
  otpInstruction:
    "Please enter the 6-digit code sent to your email to verify your account",
  resend: "Resend OTP",
  resendSuccess: "OTP has been resent!",
  infoTitle: "Personal Information",
  fullName: "Full Name",
  gender: "Select gender",
  birthday: "Select birthday",
  submit: "Create Account"
};

async function startSignup(page: Page, email: string): Promise<void> {
  await clearEmailState(email);
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: EN.next }).click();
  await expect(page).toHaveURL(
    `/signup/otp?email=${encodeURIComponent(email)}`
  );
}

async function fillInfo(page: Page, password = "Signup@123") {
  await page.getByLabel(EN.fullName).fill("Sign Up Tester");
  await page.getByRole("combobox").click();
  await page.getByRole("option", { name: "Other" }).click();
  await page.getByPlaceholder(EN.birthday).fill("15/06/1995");
  await page.getByLabel(/^Password/).fill(password);
  await page.getByLabel(/^Confirm Password/).fill(password);
}

async function signUpViaUi(page: Page, email: string): Promise<void> {
  await startSignup(page, email);
  await plantWhenIssued("signup", email, KNOWN_OTP);
  await typeOtp(page, KNOWN_OTP);
  await expect(page).toHaveURL(
    /\/signup\/info\?sessionToken=[a-f0-9]{64}&email=/
  );
  await fillInfo(page);
  await page.getByRole("button", { name: EN.submit }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(
    page.getByRole("button", { name: "Open user menu" })
  ).toBeVisible();
}

test(
  "an unknown email is sent a sign-up code and continues to verification",
  { tag: ["@TC-AUTH-006"] },
  async ({ page }) => {
    const email = throwawayEmail("auth-ui-new");
    await startSignup(page, email);

    await expect(
      page.getByRole("heading", { name: EN.otpTitle })
    ).toBeVisible();
    await expect(page.getByText(email)).toBeVisible();
    await expect(page.getByText(EN.otpInstruction)).toBeVisible();
    // The code was really issued — and no account exists yet.
    expect(await hasCode("signup", email)).toBe(true);
    expect(await findUserByEmail(email)).toBeNull();
  }
);

test(
  "a new user signs up end to end and lands signed in on home",
  { tag: ["@TC-AUTH-008", "@smoke"] },
  async ({ page }) => {
    const email = throwawayEmail("auth-ui-signup");
    await signUpViaUi(page, email);

    const user = await findUserByEmail(email);
    expect(user).toMatchObject({ email, fullName: "Sign Up Tester" });
  }
);

test(
  "a wrong sign-up code shows the remaining attempts and clears the input",
  { tag: ["@TC-AUTH-009"] },
  async ({ page }) => {
    const email = throwawayEmail("auth-ui-badotp");
    await startSignup(page, email);
    await plantWhenIssued("signup", email, KNOWN_OTP);

    await typeOtp(page, "111111");
    await expect(
      page.getByText("Invalid OTP. You have 4 attempt(s) remaining")
    ).toBeVisible();
    await expect(page.locator('input[data-slot="input-otp"]')).toHaveValue("");
    await expect(page).toHaveURL(/\/signup\/otp\?email=/);

    // The right code still works afterwards.
    await typeOtp(page, KNOWN_OTP);
    await expect(page).toHaveURL(/\/signup\/info\?/);
  }
);

test(
  "resend waits out the 60-second cooldown, then sends a new code",
  { tag: ["@TC-AUTH-010"] },
  async ({ page }) => {
    await page.clock.install();
    const email = throwawayEmail("auth-ui-resend");
    await startSignup(page, email);

    const countdown = page.getByRole("button", { name: /^Resend in \d+s$/ });
    await expect(countdown).toBeVisible();
    await expect(countdown).toBeDisabled();

    // Let the client countdown run out, and the server's 60 s key with it.
    await page.clock.fastForward("01:01");
    await deleteKeys(`otp-signup-cooldown:${email}`);
    const resend = page.getByRole("button", { name: EN.resend, exact: true });
    await expect(resend).toBeEnabled();
    await resend.click();

    await expect(page.getByText(EN.resendSuccess)).toBeVisible();
    await expect(
      page.getByRole("button", { name: /^Resend in \d+s$/ })
    ).toBeDisabled();
  }
);

test(
  "the info step validates every field on the client",
  { tag: ["@TC-AUTH-021"] },
  async ({ page }) => {
    // The form renders for any token; validation runs before any request.
    let completes = 0;
    page.on("request", (r) => {
      if (r.url().includes("/api/v1/auth/signup/complete")) completes += 1;
    });
    await page.goto(
      `/signup/info?sessionToken=${"0".repeat(64)}&email=${encodeURIComponent(throwawayEmail("auth-ui-info"))}`
    );
    await expect(
      page.getByRole("heading", { name: EN.infoTitle })
    ).toBeVisible();

    await page.getByRole("button", { name: EN.submit }).click();
    for (const message of [
      "Please enter full name",
      "Please select birthday",
      "Please enter password",
      "Please confirm your password"
    ]) {
      await expect(page.getByText(message)).toBeVisible();
    }

    // Boundary / class violations.
    await page.getByLabel(EN.fullName).fill("A");
    await page.getByLabel(/^Password/).fill("abcdefgh");
    await page.getByRole("button", { name: EN.submit }).click();
    await expect(
      page.getByText("Full name must be at least 2 characters")
    ).toBeVisible();
    await expect(
      page.getByText(
        "Password must contain uppercase, lowercase, number and special character"
      )
    ).toBeVisible();

    // Everything valid except the confirmation (the cross-field check runs
    // once the fields themselves pass).
    await fillInfo(page);
    await page.getByLabel(/^Confirm Password/).fill("Signup@124");
    await page.getByRole("button", { name: EN.submit }).click();
    await expect(page.getByText("Passwords do not match")).toBeVisible();

    expect(completes).toBe(0);
  }
);

test(
  "the info step asks the user to accept the terms",
  { tag: ["@TC-AUTH-022"] },
  async ({ page }) => {
    // BUG: BUG-017 — REQ-AUTH-04 requires accepting the terms, but the info step has no
    // terms control — InfoStepForm always sends `acceptTerms: true`.
    test.fail();
    await page.goto(
      `/signup/info?sessionToken=${"0".repeat(64)}&email=${encodeURIComponent(throwawayEmail("auth-ui-terms"))}`
    );
    await expect(
      page.getByRole("heading", { name: EN.infoTitle })
    ).toBeVisible();
    await expect(page.getByRole("checkbox", { name: /terms/i })).toBeVisible({
      timeout: 3_000
    });
  }
);

test(
  "a freshly signed-up user stays signed in after a reload",
  { tag: ["@TC-AUTH-023"] },
  async ({ page }) => {
    // BUG: BUG-006 — POST /auth/signup/complete returns the tokens in the body but never
    // sets the refreshToken cookie (SignupController.completeSignup), so the
    // session cannot be restored by SessionGate after a reload.
    test.fail();
    const email = throwawayEmail("auth-ui-reload");
    await signUpViaUi(page, email);

    await page.reload();
    // The avatar button exists for guests too — the signed-in proof is the
    // account's own email in the menu.
    await page.getByRole("button", { name: "Open user menu" }).click();
    await expect(page.getByRole("menu").getByText(email)).toBeVisible({
      timeout: 5_000
    });
    await expect(page).toHaveURL(/\/$/);
  }
);
