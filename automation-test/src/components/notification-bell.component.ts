import type { Locator, Page } from "@playwright/test";
import { copy } from "@/data/copy";

// The bell in the header of every signed-in screen and the panel it opens —
// client/src/layouts/AppHeader (badge, popover) and
// layouts/AppHeader/components/NotificationPanel (All / Unread, Mark all,
// View all, the 8 newest rows).
export class NotificationBell {
  constructor(private readonly page: Page) {}

  trigger(): Locator {
    return this.page.getByRole("button", {
      name: copy.dashboard.header.notificationsLabel
    });
  }

  /**
   * Text on the bell: the unread badge. A string matches exactly ("3"); a
   * RegExp (`/^\d+$/`) finds any number.
   */
  badge(text: string | RegExp): Locator {
    return typeof text === "string"
      ? this.trigger().getByText(text, { exact: true })
      : this.trigger().getByText(text);
  }

  /** The opened panel (a popover with role dialog). */
  panel(): Locator {
    return this.page.getByRole("dialog");
  }

  /** Text inside the panel — a row's sentence, the empty or error state. */
  panelText(text: string): Locator {
    return this.panel().getByText(text);
  }

  markAllButton(): Locator {
    return this.panel().getByRole("button", {
      name: copy.dashboard.notifications.markAllRead
    });
  }

  viewAllButton(): Locator {
    return this.panel().getByRole("button", {
      name: copy.dashboard.notifications.viewAll
    });
  }

  /** The panel's All / Unread switch (toggle buttons with aria-pressed). */
  tab(name: "all" | "unread", pressed?: boolean): Locator {
    return this.panel().getByRole("button", {
      name: copy.dashboard.notifications[name],
      exact: true,
      pressed
    });
  }

  async open(): Promise<void> {
    await this.trigger().click();
  }
}
