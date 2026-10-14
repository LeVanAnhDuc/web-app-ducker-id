import type { Locator, Page } from "@playwright/test";
import { OtpInput } from "@/components/otp-input.component";
import { copy, pattern } from "@/data/copy";
import { BasePage } from "../base.page";

// Sign-up email verification — /signup/otp?email=…,
// client/src/views/Signups/SignupOtp. Reached from the /login email step with
// an unknown address; six digits submit on their own.
const t = copy.signup.otpStep;

export class SignupOtpPage extends BasePage {
  readonly otp: OtpInput;

  constructor(page: Page) {
    super(page);
    this.otp = new OtpInput(page);
  }

  async goto(email: string): Promise<void> {
    await this.page.goto(`/signup/otp?email=${encodeURIComponent(email)}`);
  }

  heading(): Locator {
    return this.page.getByRole("heading", { name: t.title });
  }

  email(email: string): Locator {
    return this.page.getByText(email);
  }

  instruction(): Locator {
    return this.page.getByText(t.instruction);
  }

  /** "Resend in Ns" — the button while the cooldown runs. */
  resendCountdownButton(): Locator {
    return this.page.getByRole("button", {
      name: pattern(t.button.resendIn, {}, { exact: true })
    });
  }

  /** "Change email" — back to the email step (via /signup → /login). */
  changeEmailLink(): Locator {
    return this.page.getByRole("link", { name: t.button.changeEmail });
  }

  resendButton(): Locator {
    return this.page.getByRole("button", {
      name: t.button.resend,
      exact: true
    });
  }
}
