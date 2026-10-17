import type { Locator, Page } from "@playwright/test";
import { copy } from "@/data/copy";

// The admin console shell around every /admin/* screen:
//   - the "Admin Mode" badge in the header — client/src/layouts/AppHeader,
//     rendered from the pathname alone (/admin or /admin/…), not from the role;
//   - the sidebar's "Back to User Dashboard" link —
//     client/src/layouts/AdminLayout/components/BackToDashboardLink;
//   - the `#main-content` landmark — client/src/layouts/AdminLayout.
// Labels: admin.json (modeBadge, sidebar.backToDashboard). Sidebar navigation
// links live in AdminSidebar.
export class AdminShell {
  constructor(
    private readonly page: Page,
    private readonly t: Pick<typeof copy, "admin"> = copy
  ) {}

  /** "Admin Mode" — header badge (hidden below the md breakpoint). */
  modeBadge(): Locator {
    return this.page.getByText(this.t.admin.modeBadge);
  }

  /** "Back to User Dashboard" — sidebar link to the user home page. */
  backToDashboardLink(): Locator {
    return this.page.getByRole("link", {
      name: this.t.admin.sidebar.backToDashboard
    });
  }

  /** The admin layout's main landmark (`#main-content`). */
  main(): Locator {
    return this.page.locator("#main-content");
  }

  /** Text anywhere on the page — empty states and "never renders X" checks. */
  text(text: string | RegExp, options?: { exact?: boolean }): Locator {
    return this.page.getByText(text, options);
  }
}
