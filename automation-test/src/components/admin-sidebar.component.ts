import type { Locator, Page } from "@playwright/test";
import { copy } from "@/data/copy";

// The admin console sidebar (client/src/layouts — admin shell), on every
// /admin/* screen. Labels: admin.sidebar.nav. The group heading "App Registry"
// and its link share a name, hence `.first()` where a test needs one.
export class AdminSidebar {
  constructor(
    private readonly page: Page,
    private readonly t: Pick<typeof copy, "admin"> = copy
  ) {}

  /** A sidebar link by its label (substring match, like the user reads it). */
  link(name: string): Locator {
    return this.page.getByRole("link", { name });
  }

  categoriesLink(): Locator {
    return this.link(this.t.admin.sidebar.nav.categories);
  }

  appsLink(): Locator {
    return this.link(this.t.admin.sidebar.nav.apps);
  }

  /** "Dashboard" — exact, so "Back to User Dashboard" does not match too. */
  dashboardLink(): Locator {
    return this.page.getByRole("link", {
      name: this.t.admin.sidebar.nav.dashboard,
      exact: true
    });
  }
}
