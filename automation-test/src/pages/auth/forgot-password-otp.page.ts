import type { Locator, Page, Response } from "@playwright/test";
import { copy, pattern, type PasswordCopy } from "@/data/copy";
import { BasePage } from "../base.page";

// Code step of recovery — /forgot-password/otp?email=…,
// client/src/views/ForgotPasswords/ForgotPasswordOtp. The 6-slot input submits
// on the 6th digit and moves on to /forgot-password/reset with the token.
export class ForgotPasswordOtpPage extends BasePage {
  constructor(
    page: Page,
    private readonly t: PasswordCopy = copy
  ) {
    super(page);
  }

  async goto(email: string): Promise<void> {
    await this.page.goto(
      `/forgot-password/otp?email=${encodeURIComponent(email)}`
    );
  }

  heading(): Locator {
    return this.page.getByRole("heading", {
      name: this.t.forgotPassword.form.otp.title
    });
  }

  codeInput(): Locator {
    return this.page.locator("input[data-input-otp]");
  }

  /** The resend button while its countdown runs ("Resend in Ns"). */
  resendCountdown(): Locator {
    return this.page.getByRole("button", {
      name: pattern(this.t.forgotPassword.form.otp.button.resendIn)
    });
  }

  tryOtherLink(): Locator {
    return this.page.getByRole("link", {
      name: this.t.forgotPassword.form.otp.button.tryOther
    });
  }

  /** A server or field message on the page. */
  message(text: string): Locator {
    return this.page.getByText(text);
  }

  async enterCode(code: string): Promise<void> {
    await this.codeInput().fill(code);
  }

  /** Enters a code; resolves with the verify response. */
  async enterCodeAndWait(code: string): Promise<Response> {
    const verified = this.page.waitForResponse((r) =>
      r.url().includes("/forgot-password/otp/verify")
    );
    await this.enterCode(code);
    return verified;
  }
}
