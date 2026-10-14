import type { Locator, Page } from "@playwright/test";
import { NotificationBell } from "@/components/notification-bell.component";
import { Toast } from "@/components/toast.component";
import { UserMenu } from "@/components/user-menu.component";

// Shared parts of every screen: components that appear everywhere (header,
// toast…) are created here. Relative URLs resolve against the project's
// baseURL (the client origin, config/urls.ts).
export abstract class BasePage {
  /** Header avatar menu — present on every screen, guests included. */
  readonly userMenu: UserMenu;
  readonly toast: Toast;
  /** Header bell + notification panel — signed-in screens only. */
  readonly notificationBell: NotificationBell;

  constructor(readonly page: Page) {
    this.userMenu = new UserMenu(page);
    this.toast = new Toast(page);
    this.notificationBell = new NotificationBell(page);
  }

  /**
   * Every role="alert" except Next's own route announcer — any match is error
   * UI the screen is showing.
   */
  errorAlerts(): Locator {
    return this.page.locator("[role=alert]:not(#__next-route-announcer__)");
  }

  /** `<html>` — carries the theme class (next-themes) and the `lang` attribute. */
  documentRoot(): Locator {
    return this.page.locator("html");
  }
}
