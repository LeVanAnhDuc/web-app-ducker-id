import type { Locator, Page } from "@playwright/test";
import { Announcer } from "@/components/announcer.component";
import { copy, type PasswordCopy } from "@/data/copy";
import { BasePage } from "../base.page";

// The forced change-password screen — /change-password,
// client/src/views/ForceChangePassword. MustChangePasswordGate
// (layouts/AuthGuardLayout) sends every private page here while the session's
// idToken carries `mustChangePassword: true`. `t` = copyVi for /vi.
export class ForceChangePasswordPage extends BasePage {
  /** The live region the gate announces its redirect in. */
  readonly announcer: Announcer;

  constructor(
    page: Page,
    private readonly t: PasswordCopy = copy
  ) {
    super(page);
    this.announcer = new Announcer(page);
  }

  /** `prefix` = "/vi" for the Vietnamese route. */
  async goto(prefix = ""): Promise<void> {
    await this.page.goto(`${prefix}/change-password`);
  }

  heading(): Locator {
    return this.page.getByRole("heading", {
      name: this.t.forceChangePassword.title
    });
  }

  /** The temporary password the admin reset emailed (the "current" password). */
  tempPasswordInput(): Locator {
    return this.page.getByLabel(
      this.t.forceChangePassword.fields.currentPassword,
      { exact: true }
    );
  }

  newPasswordInput(): Locator {
    return this.page.getByLabel(this.t.forceChangePassword.fields.newPassword, {
      exact: true
    });
  }

  confirmPasswordInput(): Locator {
    return this.page.getByLabel(
      this.t.forceChangePassword.fields.confirmPassword,
      { exact: true }
    );
  }

  submitButton(): Locator {
    return this.page.getByRole("button", {
      name: this.t.forceChangePassword.buttons.submit
    });
  }

  /** A field error or any other text on the page. */
  message(text: string | RegExp, options?: { exact?: boolean }): Locator {
    return this.page.getByText(text, options);
  }

  /** Fills the three fields in order; `confirm` defaults to `next`. */
  async fill(temp: string, next: string, confirm = next): Promise<void> {
    await this.tempPasswordInput().fill(temp);
    await this.newPasswordInput().fill(next);
    await this.confirmPasswordInput().fill(confirm);
  }

  async submit(): Promise<void> {
    await this.submitButton().click();
  }
}
