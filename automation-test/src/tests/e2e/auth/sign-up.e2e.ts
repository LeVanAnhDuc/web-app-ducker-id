import { test, expect as baseExpect } from "@/fixtures";
import { API_PREFIX } from "@/config/urls";
import { copy, fill, serverMessage } from "@/data/copy";
import { KNOWN_OTP } from "@/data/test-data";
import type { LoginPage } from "@/pages/auth/login.page";
import type { SignupInfoPage } from "@/pages/auth/signup-info.page";
import type { SignupOtpPage } from "@/pages/auth/signup-otp.page";
import { findUserByEmail, throwawayEmail } from "@/utils/accounts";
import { plantWhenIssued } from "@/utils/auth";
import { clearEmailState, deleteKeys, hasCode } from "@/utils/redis";

// Sign-up — client/src/views/Logins/Login (email step sends the code for an
// unknown address), client/src/views/Signups/{SignupOtp,SignupInfo}.
// Copy: client/src/locales/en/{signup,common}.json; error toasts carry the
// server message (server/src/i18n/locales/en/signup.json).

test.use({ role: "guest" });

// The dev server compiles routes on first hit and is shared with other runs.
const expect = baseExpect.configure({ timeout: 15_000 });

const validation = copy.common.validation;

async function startSignup(loginPage: LoginPage, email: string): Promise<void> {
  await clearEmailState(email);
  await loginPage.goto();
  await loginPage.submitEmail(email);
  await expect(loginPage.page).toHaveURL(
    `/signup/otp?email=${encodeURIComponent(email)}`
  );
}

async function fillInfo(infoPage: SignupInfoPage, password = "Signup@123") {
  await infoPage.fillForm({
    fullName: "Sign Up Tester",
    gender: copy.signup.infoStep.input.gender.other,
    birthday: "15/06/1995",
    password,
    confirmPassword: password
  });
}

async function signUpViaUi(
  loginPage: LoginPage,
  otpPage: SignupOtpPage,
  infoPage: SignupInfoPage,
  email: string
): Promise<void> {
  await startSignup(loginPage, email);
  await plantWhenIssued("signup", email, KNOWN_OTP);
  await otpPage.otp.enter(KNOWN_OTP);
  await expect(otpPage.page).toHaveURL(
    /\/signup\/info\?sessionToken=[a-f0-9]{64}&email=/
  );
  await fillInfo(infoPage);
  await infoPage.submit();
  await expect(infoPage.page).toHaveURL(/\/$/);
  await expect(infoPage.userMenu.trigger()).toBeVisible();
}

test(
  "An unknown email is sent a sign-up code and continues to verification",
  { tag: ["@TC-AUTH-006", "@smoke"] },
  async ({ loginPage, signupOtpPage }) => {
    const email = throwawayEmail("auth-ui-new");
    await startSignup(loginPage, email);

    await expect(signupOtpPage.heading()).toBeVisible();
    await expect(signupOtpPage.email(email)).toBeVisible();
    await expect(signupOtpPage.instruction()).toBeVisible();
    // The code was really issued — and no account exists yet.
    expect(await hasCode("signup", email)).toBe(true);
    expect(await findUserByEmail(email)).toBeNull();
  }
);

test(
  "A new user signs up end to end and lands signed in on home",
  { tag: ["@TC-AUTH-008", "@smoke"] },
  async ({ loginPage, signupOtpPage, signupInfoPage }) => {
    const email = throwawayEmail("auth-ui-signup");
    await signUpViaUi(loginPage, signupOtpPage, signupInfoPage, email);

    const user = await findUserByEmail(email);
    expect(user).toMatchObject({ email, fullName: "Sign Up Tester" });
  }
);

test(
  "A wrong sign-up code shows the remaining attempts and clears the input",
  { tag: ["@TC-AUTH-009"] },
  async ({ page, loginPage, signupOtpPage }) => {
    const email = throwawayEmail("auth-ui-badotp");
    await startSignup(loginPage, email);
    await plantWhenIssued("signup", email, KNOWN_OTP);

    await signupOtpPage.otp.enter("111111");
    await expect(
      signupOtpPage.toast.withText(
        fill(serverMessage.signup.errors.invalidOtpWithRemaining, {
          remaining: 4
        })
      )
    ).toBeVisible();
    await expect(signupOtpPage.otp.input()).toHaveValue("");
    await expect(page).toHaveURL(/\/signup\/otp\?email=/);

    // The right code still works afterwards.
    await signupOtpPage.otp.enter(KNOWN_OTP);
    await expect(page).toHaveURL(/\/signup\/info\?/);
  }
);

test(
  "Resend waits out the 60-second cooldown, then sends a new code",
  { tag: ["@TC-AUTH-010"] },
  async ({ page, loginPage, signupOtpPage }) => {
    await page.clock.install();
    const email = throwawayEmail("auth-ui-resend");
    await startSignup(loginPage, email);

    const countdown = signupOtpPage.resendCountdownButton();
    await expect(countdown).toBeVisible();
    await expect(countdown).toBeDisabled();

    // Let the client countdown run out, and the server's 60 s key with it.
    await page.clock.fastForward("01:01");
    await deleteKeys(`otp-signup-cooldown:${email}`);
    const resend = signupOtpPage.resendButton();
    await expect(resend).toBeEnabled();
    await resend.click();

    await expect(
      signupOtpPage.toast.withText(copy.signup.otpStep.resendSuccess)
    ).toBeVisible();
    await expect(signupOtpPage.resendCountdownButton()).toBeDisabled();
  }
);

test(
  "The info step validates every field on the client",
  { tag: ["@TC-AUTH-021"] },
  async ({ page, signupInfoPage }) => {
    // The form renders for any token; validation runs before any request.
    let completes = 0;
    page.on("request", (r) => {
      if (r.url().includes(`${API_PREFIX}/auth/signup/complete`))
        completes += 1;
    });
    await signupInfoPage.goto("0".repeat(64), throwawayEmail("auth-ui-info"));
    await expect(signupInfoPage.heading()).toBeVisible();

    await signupInfoPage.submit();
    for (const message of [
      validation.fullName.required,
      validation.birthday.required,
      validation.password.required,
      validation.passwordConfirm.required
    ]) {
      await expect(signupInfoPage.fieldError(message)).toBeVisible();
    }

    // Boundary / class violations.
    await signupInfoPage.fullNameInput().fill("A");
    await signupInfoPage.passwordInput().fill("abcdefgh");
    await signupInfoPage.submit();
    await expect(
      signupInfoPage.fieldError(validation.fullName.minLength)
    ).toBeVisible();
    await expect(
      signupInfoPage.fieldError(validation.password.requirements)
    ).toBeVisible();

    // Everything valid except the confirmation (the cross-field check runs
    // once the fields themselves pass).
    await fillInfo(signupInfoPage);
    await signupInfoPage.confirmPasswordInput().fill("Signup@124");
    await signupInfoPage.submit();
    await expect(
      signupInfoPage.fieldError(validation.passwordConfirm.mismatch)
    ).toBeVisible();

    expect(completes).toBe(0);
  }
);

test(
  "The info step asks the user to accept the terms",
  { tag: ["@TC-AUTH-022"] },
  async ({ signupInfoPage }) => {
    // REQ-AUTH-04 requires accepting the terms: the info step has a
    // required terms checkbox (fixed BUG-AUTH-04).
    await signupInfoPage.goto("0".repeat(64), throwawayEmail("auth-ui-terms"));
    await expect(signupInfoPage.heading()).toBeVisible();
    await expect(signupInfoPage.termsCheckbox()).toBeVisible({
      timeout: 3_000
    });
  }
);

test(
  "A freshly signed-up user stays signed in after a reload",
  { tag: ["@TC-AUTH-023"] },
  async ({ page, loginPage, signupOtpPage, signupInfoPage }) => {
    // signup/complete sets the refreshToken cookie like login, so SessionGate
    // restores the session (fixed BUG-AUTH-02).
    const email = throwawayEmail("auth-ui-reload");
    await signUpViaUi(loginPage, signupOtpPage, signupInfoPage, email);

    await page.reload();
    // The avatar button exists for guests too — the signed-in proof is the
    // account's own email in the menu.
    await signupInfoPage.userMenu.open();
    await expect(signupInfoPage.userMenu.entry(email)).toBeVisible({
      timeout: 5_000
    });
    await expect(page).toHaveURL(/\/$/);
  }
);

test(
  "Re-entering an unknown email during the code cooldown still continues to verification",
  { tag: ["@TC-AUTH-073"] },
  async ({ page, loginPage, signupOtpPage }) => {
    // Inside the 60 s cooldown send-otp answers 400 SIGNUP_OTP_COOLDOWN;
    // useLoginEmail treats that as "code already sent" and continues
    // (decisions Q6, fixed BUG-AUTH-08).
    const email = throwawayEmail("auth-ui-reenter");
    await startSignup(loginPage, email);

    await signupOtpPage.changeEmailLink().click();
    await expect(page).toHaveURL(/\/login$/);
    await expect(loginPage.heading()).toBeVisible();

    await loginPage.submitEmail(email);
    await expect(page).toHaveURL(
      `/signup/otp?email=${encodeURIComponent(email)}`
    );
    await expect(signupOtpPage.heading()).toBeVisible();
  }
);

test(
  "Submitting the info step with an expired session shows the error and stays on the step",
  { tag: ["@TC-AUTH-074"] },
  async ({ page, signupInfoPage }) => {
    const email = throwawayEmail("auth-ui-nosession");
    // Right shape, never issued — the same as one that has expired.
    await signupInfoPage.goto("0".repeat(64), email);
    await expect(signupInfoPage.heading()).toBeVisible();

    await fillInfo(signupInfoPage);
    await signupInfoPage.submit();

    await expect(
      signupInfoPage.toast.withText(serverMessage.signup.errors.invalidSession)
    ).toBeVisible();
    await expect(page).toHaveURL(/\/signup\/info\?/);
    expect(await findUserByEmail(email)).toBeNull();
  }
);
