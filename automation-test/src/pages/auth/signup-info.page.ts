import type { Locator } from "@playwright/test";
import { copy } from "@/data/copy";
import { BasePage } from "../base.page";

// Sign-up personal information — /signup/info?sessionToken=…&email=…,
// client/src/views/Signups/SignupInfo (InfoStepForm). The form renders for any
// token; validation runs on the client before any request.
const t = copy.signup.infoStep;

export interface SignupInfo {
  fullName: string;
  /** The option's visible name, e.g. copy.signup.infoStep.input.gender.other. */
  gender: string;
  /** As typed into the date field, dd/mm/yyyy. */
  birthday: string;
  password: string;
  confirmPassword: string;
  /** Tick the terms checkbox (REQ-AUTH-04); default true. */
  acceptTerms?: boolean;
}

export class SignupInfoPage extends BasePage {
  async goto(sessionToken: string, email: string): Promise<void> {
    await this.page.goto(
      `/signup/info?sessionToken=${sessionToken}&email=${encodeURIComponent(email)}`
    );
  }

  heading(): Locator {
    return this.page.getByRole("heading", { name: t.title });
  }

  fullNameInput(): Locator {
    return this.page.getByLabel(t.input.labelFullName);
  }

  genderSelect(): Locator {
    return this.page.getByRole("combobox");
  }

  genderOption(name: string): Locator {
    return this.page.getByRole("option", { name });
  }

  birthdayInput(): Locator {
    return this.page.getByPlaceholder(t.input.placeholderBirthday);
  }

  passwordInput(): Locator {
    return this.page.getByLabel(new RegExp(`^${t.input.labelPassword}`));
  }

  confirmPasswordInput(): Locator {
    return this.page.getByLabel(new RegExp(`^${t.input.labelPasswordConfirm}`));
  }

  submitButton(): Locator {
    return this.page.getByRole("button", { name: t.button.submit });
  }

  /** The terms-acceptance control REQ-AUTH-04 asks for. */
  termsCheckbox(): Locator {
    return this.page.getByRole("checkbox", { name: /terms/i });
  }

  /** A client-side validation message under a field. */
  fieldError(text: string): Locator {
    return this.page.getByText(text);
  }

  async fillForm(info: SignupInfo): Promise<void> {
    await this.fullNameInput().fill(info.fullName);
    await this.genderSelect().click();
    await this.genderOption(info.gender).click();
    await this.birthdayInput().fill(info.birthday);
    await this.passwordInput().fill(info.password);
    await this.confirmPasswordInput().fill(info.confirmPassword);
    if (info.acceptTerms ?? true) await this.termsCheckbox().check();
  }

  async submit(): Promise<void> {
    await this.submitButton().click();
  }
}
