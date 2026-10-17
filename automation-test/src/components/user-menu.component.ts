import type { Locator, Page } from "@playwright/test";
import { clientLiteral, copy } from "@/data/copy";

/** The catalogue the menu reads: `copy` (en) or `copyVi` on a /vi page. */
export type UserMenuCopy = {
  common: { userMenu: (typeof copy)["common"]["userMenu"] };
};

/** The three options of the Theme submenu (client ThemeSubmenu). */
export type ThemeChoice = "light" | "dark" | "system";

/** The two locales of the Language submenu (client/src/i18n/config.ts). */
export type LanguageChoice = keyof typeof clientLiteral.localeNames;

const THEME_LABEL = {
  light: "themeLight",
  dark: "themeDark",
  system: "themeSystem"
} as const;

// The avatar menu in the header — client/src/components/UserMenu. The trigger
// renders for guests too; the signed-in proof is the account's own email
// inside the opened menu. Theme and Language are Radix sub-menus whose options
// are `menuitemradio`s (aria-checked marks the active one).
// `new UserMenu(page, copyVi)` on a /vi page.
export class UserMenu {
  constructor(
    private readonly page: Page,
    private readonly t: UserMenuCopy = copy
  ) {}

  trigger(): Locator {
    return this.page.getByRole("button", {
      name: this.t.common.userMenu.trigger
    });
  }

  menu(): Locator {
    return this.page.getByRole("menu");
  }

  /** Text inside the opened menu — the signed-in account's email. */
  entry(text: string): Locator {
    return this.menu().getByText(text);
  }

  signOutItem(): Locator {
    return this.page.getByRole("menuitem", {
      name: new RegExp(copy.common.userMenu.signOut)
    });
  }

  /** "Support" — opens the support dialog (guests included). */
  supportItem(): Locator {
    return this.page.getByRole("menuitem", {
      name: this.t.common.userMenu.support
    });
  }

  async openSupport(): Promise<void> {
    await this.open();
    await this.supportItem().click();
  }

  /** "Admin Console" — rendered for admins only (UserMenu AdminEntryItem). */
  adminConsoleItem(): Locator {
    return this.page.getByRole("menuitem", {
      name: this.t.common.userMenu.adminConsole
    });
  }

  /** The signed-in account's initials (avatar fallback in the header). */
  initials(text: string): Locator {
    return this.page.getByText(text, { exact: true });
  }

  // ── Theme / Language sub-menus ───────────────────────────────────────────

  themeItem(): Locator {
    return this.page.getByRole("menuitem", {
      name: this.t.common.userMenu.theme
    });
  }

  languageItem(): Locator {
    return this.page.getByRole("menuitem", {
      name: this.t.common.userMenu.language
    });
  }

  /** A Theme option (`menuitemradio`) of the opened sub-menu. */
  themeOption(choice: ThemeChoice): Locator {
    return this.page.getByRole("menuitemradio", {
      name: this.t.common.userMenu[THEME_LABEL[choice]]
    });
  }

  /** A Language option — named in its own language ("English", "Tiếng Việt"). */
  languageOption(choice: LanguageChoice): Locator {
    return this.page.getByRole("menuitemradio", {
      name: clientLiteral.localeNames[choice]
    });
  }

  async open(): Promise<void> {
    await this.trigger().click();
  }

  async close(): Promise<void> {
    await this.page.keyboard.press("Escape");
  }

  async signOut(): Promise<void> {
    await this.open();
    await this.signOutItem().click();
  }

  /** Opens the menu and its Theme sub-menu. */
  async openThemeMenu(): Promise<void> {
    await this.open();
    await this.themeItem().click();
  }

  /** Opens the menu and its Language sub-menu. */
  async openLanguageMenu(): Promise<void> {
    await this.open();
    await this.languageItem().click();
  }

  async chooseTheme(choice: ThemeChoice): Promise<void> {
    await this.openThemeMenu();
    await this.themeOption(choice).click();
  }

  async chooseLanguage(choice: LanguageChoice): Promise<void> {
    await this.openLanguageMenu();
    await this.languageOption(choice).click();
  }
}
