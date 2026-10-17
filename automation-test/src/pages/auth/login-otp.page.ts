import type { Locator, Page } from "@playwright/test";
import { OtpInput } from "@/components/otp-input.component";
import { copy, pattern } from "@/data/copy";
import { BasePage } from "../base.page";

// Sign-in with a one-time code — /login/otp?email=…,
// client/src/views/Logins/LoginOtp. Six digits submit on their own.
const t = copy.login.form.otp;

export class LoginOtpPage extends BasePage {
  readonly otp: OtpInput;

  constructor(page: Page) {
    super(page);
    this.otp = new OtpInput(page);
  }

  async goto(email: string): Promise<void> {
    await this.page.goto(`/login/otp?email=${encodeURIComponent(email)}`);
  }

  heading(): Locator {
    return this.page.getByRole("heading", { name: t.title });
  }

  instruction(): Locator {
    return this.page.getByText(t.instruction);
  }

  tryAnotherMethodLink(): Locator {
    return this.page.getByRole("link", { name: t.button.tryOther });
  }

  /** "Resend in Ns" — the resend button while the cooldown runs. */
  resendCountdownButton(): Locator {
    return this.page.getByRole("button", {
      name: pattern(t.button.resendIn, {}, { exact: true })
    });
  }

  resendButton(): Locator {
    return this.page.getByRole("button", {
      name: t.button.resend,
      exact: true
    });
  }
}
