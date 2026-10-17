import type { Locator, Page } from "@playwright/test";
import { copy, pattern, type PasswordCopy } from "@/data/copy";
import { BasePage } from "../base.page";

// "Check your email" after choosing the magic link —
// /forgot-password/magic-link?email=…,
// client/src/views/ForgotPasswords/ForgotPasswordMagicLink.
export class ForgotPasswordMagicLinkPage extends BasePage {
  constructor(
    page: Page,
    private readonly t: PasswordCopy = copy
  ) {
    super(page);
  }

  async goto(email: string): Promise<void> {
    await this.page.goto(
      `/forgot-password/magic-link?email=${encodeURIComponent(email)}`
    );
  }

  heading(): Locator {
    return this.page.getByRole("heading", {
      name: this.t.forgotPassword.form.magicLink.title
    });
  }

  /** The resend button while its countdown runs ("Resend in Ns"). */
  resendCountdown(): Locator {
    return this.page.getByRole("button", {
      name: pattern(this.t.forgotPassword.form.magicLink.button.resendIn)
    });
  }

  tryOtherLink(): Locator {
    return this.page.getByRole("link", {
      name: this.t.forgotPassword.form.magicLink.button.tryOther
    });
  }
}
