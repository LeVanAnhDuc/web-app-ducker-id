import type { Locator } from "@playwright/test";
import { copy, pattern } from "@/data/copy";
import { BasePage } from "../base.page";

// "Check your email" after a magic link was sent — /login/magic-link?email=…,
// client/src/views/Logins/LoginMagicLink.
const t = copy.login.form.magicLink;

export class LoginMagicLinkPage extends BasePage {
  async goto(email: string): Promise<void> {
    await this.page.goto(
      `/login/magic-link?email=${encodeURIComponent(email)}`
    );
  }

  heading(): Locator {
    return this.page.getByRole("heading", { name: t.title });
  }

  email(email: string): Locator {
    return this.page.getByText(email);
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
