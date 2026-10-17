import type { Locator, Page } from "@playwright/test";
import { copy, type PasswordCopy } from "@/data/copy";
import { BasePage } from "../base.page";

// New-password step of recovery — /forgot-password/reset?email=…&token=…,
// client/src/views/ForgotPasswords/ForgotPasswordReset. With
// `method=magic-link` the token is a link token the page verifies on load
// (and swaps for a reset token); otherwise it is already a reset token.
export class ForgotPasswordResetPage extends BasePage {
  constructor(
    page: Page,
    private readonly t: PasswordCopy = copy
  ) {
    super(page);
  }

  /** The URL the page lives at; `prefix` = "/vi" for the Vietnamese route. */
  static url(email: string, token: string, method?: string, prefix = "") {
    return `${prefix}/forgot-password/reset?email=${encodeURIComponent(email)}&token=${token}${
      method ? `&method=${method}` : ""
    }`;
  }

  async goto(
    email: string,
    token: string,
    method?: string,
    prefix = ""
  ): Promise<void> {
    await this.page.goto(
      ForgotPasswordResetPage.url(email, token, method, prefix)
    );
  }

  heading(): Locator {
    return this.page.getByRole("heading", {
      name: this.t.forgotPasswordReset.form.title
    });
  }

  newPasswordInput(): Locator {
    return this.page.getByLabel(
      this.t.forgotPasswordReset.form.input.labelNewPassword,
      { exact: true }
    );
  }

  confirmPasswordInput(): Locator {
    return this.page.getByLabel(
      this.t.forgotPasswordReset.form.input.labelConfirmPassword,
      { exact: true }
    );
  }

  resetButton(): Locator {
    return this.page.getByRole("button", {
      name: this.t.forgotPasswordReset.form.button.reset
    });
  }

  /** A field error, server error or success line on the page. */
  message(text: string): Locator {
    return this.page.getByText(text);
  }

  async fillNewPassword(value: string, confirm = value): Promise<void> {
    await this.newPasswordInput().fill(value);
    await this.confirmPasswordInput().fill(confirm);
  }

  async submit(): Promise<void> {
    await this.resetButton().click();
  }
}
