import type { Locator, Page } from "@playwright/test";
import { copy, type LoginCopy } from "@/data/copy";
import { BasePage } from "../base.page";

// Password step of sign-in — /login/password?email=…,
// client/src/views/Logins/LoginPassword.
export class LoginPasswordPage extends BasePage {
  constructor(
    page: Page,
    private readonly t: LoginCopy = copy
  ) {
    super(page);
  }

  async goto(email: string): Promise<void> {
    await this.page.goto(`/login/password?email=${encodeURIComponent(email)}`);
  }

  heading(): Locator {
    return this.page.getByRole("heading", {
      name: this.t.login.form.titlePassword
    });
  }

  /** The address the step is for, shown above the field. */
  email(email: string): Locator {
    return this.page.getByText(email);
  }

  passwordInput(): Locator {
    return this.page.getByLabel(this.t.login.form.input.labelEnterPassword);
  }

  signInButton(): Locator {
    return this.page.getByRole("button", {
      name: this.t.login.form.button.signIn,
      exact: true
    });
  }

  tryAnotherWayLink(): Locator {
    return this.page.getByRole("link", {
      name: this.t.login.form.button.tryAnother
    });
  }

  /** "Forgot Password?" — leads to /forgot-password with the same email. */
  forgotPasswordLink(): Locator {
    return this.page.getByRole("link", {
      name: this.t.login.link.forgotPassword
    });
  }

  changeEmailLink(): Locator {
    return this.page.getByRole("link", {
      name: this.t.login.form.button.changeEmail
    });
  }

  /**
   * A way to the self-service unlock (REQ-AUTH-10) — a link or a button. The
   * client has none today (defects/auth.md#bug-auth-03).
   */
  unlockOffer(): Locator {
    return this.page
      .getByRole("link", { name: /unlock/i })
      .or(this.page.getByRole("button", { name: /unlock/i }));
  }

  /** A client-side validation message under the password field. */
  fieldError(text: string): Locator {
    return this.page.getByText(text);
  }

  async fillPassword(password: string): Promise<void> {
    await this.passwordInput().fill(password);
  }

  async submitPassword(password: string): Promise<void> {
    await this.fillPassword(password);
    await this.signInButton().click();
  }
}
