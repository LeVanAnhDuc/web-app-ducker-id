import type { Locator, Page } from "@playwright/test";
import { copy } from "@/data/copy";
import { BasePage } from "../base.page";

/** The catalogues /profile reads: `copy` (en) or `copyVi`. */
export type ProfileCopy = Pick<typeof copy, "account" | "dashboard">;

/**
 * What a removed route renders: Next's not-found page ("This page could not
 * be found." / 404). Not in any catalogue — Next.js renders it.
 */
const NOT_FOUND_TEXT = /this page could not be found|404|not found/i;

// The Account page at /profile — client/src/views/Profile: the page heading,
// the section cards (Personal Information, Change Password, Danger Zone), the
// profile header (ProfileCard) and the Settings group of the sidebar. The
// Personal Information form (PersonalInfoForm, a card labelled by
// #personal-info-title) is driven from here; the Change Password card has its
// own page object (profile-password.page.ts). `t` = copyVi for /vi.
export class ProfilePage extends BasePage {
  constructor(
    page: Page,
    private readonly t: ProfileCopy = copy
  ) {
    super(page);
  }

  /** `prefix` = "/vi" for the Vietnamese route. */
  async goto(prefix = ""): Promise<void> {
    await this.page.goto(`${prefix}/profile`);
  }

  /** goto(), then waits for the Personal Information form to render. */
  async open(prefix = ""): Promise<void> {
    await this.goto(prefix);
    await this.personalInfoCard().waitFor();
  }

  // ── page ─────────────────────────────────────────────────────────────────

  /** The page heading ("Account"), matched exactly. */
  title(): Locator {
    return this.page.getByRole("heading", {
      name: this.t.account.title,
      exact: true
    });
  }

  /** Any heading by its text — for section names and names that must be absent. */
  heading(name: string | RegExp, options: { exact?: boolean } = {}): Locator {
    return this.page.getByRole("heading", { name, ...options });
  }

  personalInfoHeading(): Locator {
    return this.heading(this.t.account.personalInfo.title);
  }

  changePasswordHeading(): Locator {
    return this.heading(this.t.account.changePassword.title);
  }

  dangerZoneHeading(): Locator {
    return this.heading(this.t.account.dangerZone.title);
  }

  /** Text anywhere on the page (first match) — the profile header shows name and email. */
  text(text: string, options?: { exact?: boolean }): Locator {
    return this.page.getByText(text, options).first();
  }

  /** The whole page body, to read its rendered text. */
  body(): Locator {
    return this.page.locator("body");
  }

  /** Next's not-found message, on a route that no longer exists. */
  notFound(): Locator {
    return this.page.getByText(NOT_FOUND_TEXT).first();
  }

  // ── sidebar: Settings group ──────────────────────────────────────────────

  settingsNav(): Locator {
    const name = this.t.dashboard.sidebar.groups.settings;
    return this.page
      .getByRole("navigation", { name })
      .or(this.page.locator(`[aria-label="${name}"]`))
      .first();
  }

  settingsNavLink(
    name: string | RegExp,
    options: { exact?: boolean } = {}
  ): Locator {
    return this.settingsNav().getByRole("link", { name, ...options });
  }

  /** The "Account" link (→ /profile), matched exactly. */
  accountNavLink(): Locator {
    return this.settingsNavLink(this.t.dashboard.sidebar.nav.profile, {
      exact: true
    });
  }

  billingNavLink(): Locator {
    return this.settingsNavLink(this.t.dashboard.sidebar.nav.billing);
  }

  // ── Personal Information form ────────────────────────────────────────────

  personalInfoCard(): Locator {
    return this.page.locator('[aria-labelledby="personal-info-title"]');
  }

  /** A field of the form by its exact label. */
  field(label: string): Locator {
    return this.personalInfoCard().getByLabel(label, { exact: true });
  }

  firstNameInput(): Locator {
    return this.field(this.t.account.personalInfo.fields.firstName);
  }

  lastNameInput(): Locator {
    return this.field(this.t.account.personalInfo.fields.lastName);
  }

  phoneInput(): Locator {
    return this.field(this.t.account.personalInfo.fields.phone);
  }

  addressInput(): Locator {
    return this.field(this.t.account.personalInfo.fields.address);
  }

  /** CustomDateInput takes typed `dd/MM/yyyy`; found by its placeholder. */
  dateOfBirthInput(): Locator {
    return this.personalInfoCard().getByPlaceholder(
      this.t.account.personalInfo.placeholders.dateOfBirth
    );
  }

  genderSelect(): Locator {
    return this.personalInfoCard().getByRole("combobox", {
      name: this.t.account.personalInfo.fields.gender
    });
  }

  /** An option of the opened gender list (rendered in a portal). */
  genderOption(label: string): Locator {
    return this.page.getByRole("option", { name: label, exact: true });
  }

  saveButton(): Locator {
    return this.personalInfoCard().getByRole("button", {
      name: this.t.account.personalInfo.buttons.save
    });
  }

  cancelButton(): Locator {
    return this.personalInfoCard().getByRole("button", {
      name: this.t.account.personalInfo.buttons.cancel
    });
  }

  /** A field message (or any text) inside the form card. */
  formMessage(text: string, options?: { exact?: boolean }): Locator {
    return this.personalInfoCard().getByText(text, options);
  }

  async selectGender(label: string): Promise<void> {
    await this.genderSelect().click();
    await this.genderOption(label).click();
  }

  async save(): Promise<void> {
    await this.saveButton().click();
  }
}
