import type { Locator, Page, Response } from "@playwright/test";
import { SupportDialog } from "@/components/support-dialog.component";
import { copy, type PasswordCopy } from "@/data/copy";
import { BasePage } from "../base.page";

// Recovery options — /forgot-password?email=…,
// client/src/views/ForgotPasswords/ForgotPassword. Each option card is a
// button (OTP, magic link, contact admin); 2FA is shown but not actionable.
// Without an email in the URL the page sends the visitor to /login.
export class ForgotPasswordPage extends BasePage {
  /** The support dialog "Contact administrator" opens. */
  readonly supportDialog: SupportDialog;

  constructor(
    page: Page,
    private readonly t: PasswordCopy = copy
  ) {
    super(page);
    this.supportDialog = new SupportDialog(page, t);
  }

  /** `prefix` = "/vi" for the Vietnamese route. */
  async goto(email: string, prefix = ""): Promise<void> {
    await this.page.goto(
      `${prefix}/forgot-password?email=${encodeURIComponent(email)}`
    );
  }

  private get options() {
    return this.t.forgotPassword.form.options;
  }

  heading(): Locator {
    return this.page.getByRole("heading", { name: this.options.title });
  }

  /** The address the page is for. */
  email(email: string): Locator {
    return this.page.getByText(email).first();
  }

  otpOption(): Locator {
    return this.page.getByRole("button", {
      name: new RegExp(this.options.otp.title)
    });
  }

  magicLinkOption(): Locator {
    return this.page.getByRole("button", {
      name: new RegExp(this.options.magicLink.title)
    });
  }

  contactAdminOption(): Locator {
    return this.page.getByRole("button", {
      name: new RegExp(this.options.contactAdmin.title)
    });
  }

  twoFactorTitle(): Locator {
    return this.page.getByText(this.options.twoFactor.title);
  }

  unavailableBadge(): Locator {
    return this.page.getByText(this.t.forgotPassword.badge.unavailable);
  }

  /** The 2FA card as a button — it must not be one. */
  twoFactorButton(): Locator {
    return this.page.getByRole("button", {
      name: new RegExp(this.options.twoFactor.title)
    });
  }

  /** The 2FA card by the accessible name it should expose. */
  twoFactorCard(): Locator {
    return this.page.getByLabel(
      `${this.options.twoFactor.title} - ${this.t.forgotPassword.badge.unavailable}`
    );
  }

  changeEmailLink(): Locator {
    return this.page.getByRole("link", { name: this.options.changeEmail });
  }

  /** Picks the code option; resolves with the send response. */
  async chooseOtp(): Promise<Response> {
    return this.choose(this.otpOption(), "/forgot-password/otp/send");
  }

  /** Picks the magic-link option; resolves with the send response. */
  async chooseMagicLink(): Promise<Response> {
    return this.choose(
      this.magicLinkOption(),
      "/forgot-password/magic-link/send"
    );
  }

  private async choose(option: Locator, endpoint: string): Promise<Response> {
    const sent = this.page.waitForResponse(
      (r) => r.url().includes(endpoint) && r.request().method() === "POST"
    );
    await option.click();
    return sent;
  }
}
