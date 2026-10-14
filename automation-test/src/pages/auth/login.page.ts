import { expect, type Locator, type Page } from "@playwright/test";
import { copy, type LoginCopy } from "@/data/copy";
import { BasePage } from "../base.page";
import { LoginPasswordPage } from "./login-password.page";

// Email step of sign-in — /login, client/src/views/Logins/Login. A registered
// address continues to /login/password, an unknown one is sent a sign-up code
// and continues to /signup/otp.

/** Browser waits: routes compile on first hit in the dev server. */
const ready = expect.configure({ timeout: 15_000 });

export class LoginPage extends BasePage {
  constructor(
    page: Page,
    private readonly t: LoginCopy = copy
  ) {
    super(page);
  }

  async goto(): Promise<void> {
    await this.page.goto("/login");
  }

  heading(): Locator {
    return this.page.getByRole("heading", {
      name: this.t.login.form.titleWelcome
    });
  }

  description(): Locator {
    return this.page.getByText(this.t.login.form.description);
  }

  emailInput(): Locator {
    return this.page.getByLabel(this.t.login.form.input.labelEmail);
  }

  continueButton(): Locator {
    return this.page.getByRole("button", {
      name: this.t.login.form.button.next
    });
  }

  /** A client-side validation message under the email field. */
  fieldError(text: string): Locator {
    return this.page.getByText(text);
  }

  async submitEmail(email: string): Promise<void> {
    await this.emailInput().fill(email);
    await this.continueButton().click();
  }

  /**
   * Email step → password step → signed in. Ends once home has loaded and the
   * header menu is there (readiness of the screen it lands on).
   */
  async signIn(email: string, password: string): Promise<void> {
    await this.goto();
    await this.submitEmail(email);
    await ready(this.page).toHaveURL(/\/login\/password\?email=/);
    await new LoginPasswordPage(this.page, this.t).submitPassword(password);
    await ready(this.page).toHaveURL(/\/$/);
    await ready(this.userMenu.trigger()).toBeVisible();
  }
}
