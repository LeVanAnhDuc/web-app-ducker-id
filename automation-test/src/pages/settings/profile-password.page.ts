import type { Locator, Page } from "@playwright/test";
import { copy, type PasswordCopy } from "@/data/copy";
import { BasePage } from "../base.page";

// The change-password card of /profile — client/src/views/Profile/mains/
// ChangePasswordCard (labels programmatically tied to their inputs by
// PasswordInput, so fields are found by label). Only the card: the rest of
// /profile belongs to the profile module's page object. `t` = copyVi for /vi.
export class ProfilePasswordPage extends BasePage {
  constructor(
    page: Page,
    private readonly t: PasswordCopy = copy
  ) {
    super(page);
  }

  /** `prefix` = "/vi" for the Vietnamese route. */
  async goto(prefix = ""): Promise<void> {
    await this.page.goto(`${prefix}/profile`);
  }

  heading(): Locator {
    return this.page.getByRole("heading", {
      name: this.t.account.changePassword.title
    });
  }

  card(): Locator {
    return this.page.locator('[aria-labelledby="change-password-title"]');
  }

  currentPasswordInput(): Locator {
    return this.page.getByLabel(
      this.t.account.changePassword.fields.currentPassword,
      { exact: true }
    );
  }

  newPasswordInput(): Locator {
    return this.page.getByLabel(
      this.t.account.changePassword.fields.newPassword,
      { exact: true }
    );
  }

  confirmPasswordInput(): Locator {
    return this.page.getByLabel(
      this.t.account.changePassword.fields.confirmPassword,
      { exact: true }
    );
  }

  saveButton(): Locator {
    return this.page.getByRole("button", {
      name: this.t.account.changePassword.buttons.save
    });
  }

  cancelButton(): Locator {
    return this.card().getByRole("button", {
      name: this.t.account.changePassword.buttons.cancel
    });
  }

  /** A field error or any other text on the page. */
  message(text: string): Locator {
    return this.page.getByText(text);
  }

  /** Fills the three fields in order; `confirm` defaults to `next`. */
  async fill(current: string, next: string, confirm = next): Promise<void> {
    await this.currentPasswordInput().fill(current);
    await this.newPasswordInput().fill(next);
    await this.confirmPasswordInput().fill(confirm);
  }

  async submit(): Promise<void> {
    await this.saveButton().click();
  }
}
