import type { Locator } from "@playwright/test";
import { copy } from "@/data/copy";
import { BasePage } from "../base.page";

// Alternative sign-in methods — /login/alternative?email=…,
// client/src/views/Logins/LoginAlternative. Picking the code or magic-link
// option sends it (nothing for an address that cannot sign in).
const t = copy.login.form;

export class LoginAlternativePage extends BasePage {
  /** `prefix` = "/vi" for the Vietnamese route. */
  async goto(email: string, prefix = ""): Promise<void> {
    await this.page.goto(
      `${prefix}/login/alternative?email=${encodeURIComponent(email)}`
    );
  }

  heading(): Locator {
    return this.page.getByRole("heading", { name: t.titleChooseMethod });
  }

  description(): Locator {
    return this.page.getByText(t.descriptionChooseMethod);
  }

  email(email: string): Locator {
    return this.page.getByText(email);
  }

  /** An option by its exact title. */
  option(title: string): Locator {
    return this.page.getByText(title, { exact: true });
  }

  passwordOption(): Locator {
    return this.page.getByRole("link", {
      name: new RegExp(t.alternative.password.title)
    });
  }

  otpOption(): Locator {
    return this.page.getByRole("button", {
      name: new RegExp(t.alternative.otp.title)
    });
  }

  magicLinkOption(): Locator {
    return this.page.getByRole("button", {
      name: new RegExp(t.alternative.magicLink.title)
    });
  }

  /**
   * "Contact administrator" — opens the support dialog with the address
   * filled in. `name` overrides the label (e.g. the Vietnamese one).
   */
  contactAdminOption(
    name: RegExp = new RegExp(t.alternative.contactAdmin.title)
  ): Locator {
    return this.page.getByRole("button", { name });
  }
}
