import type { Locator, Page } from "@playwright/test";
import { AdminShell } from "@/components/admin-shell.component";
import { AdminSidebar } from "@/components/admin-sidebar.component";
import { copy } from "@/data/copy";
import { BasePage } from "../base.page";

// Admin console landing — /admin, client/src/views/AdminDashboard. One card
// per admin area (client/src/dataSources/AdminDashboard): a title, a
// description and an "Open" link, all inside the admin shell's #main-content.
// Copy: adminDashboard.json. A Vietnamese page is
// `new AdminDashboardPage(page, copyVi, "/vi")`.

/** The catalogues this screen reads: `copy` (en) or `copyVi`. */
export type AdminDashboardCopy = Pick<typeof copy, "adminDashboard">;

export class AdminDashboardPage extends BasePage {
  readonly shell: AdminShell;
  readonly sidebar: AdminSidebar;

  constructor(
    page: Page,
    private readonly t: AdminDashboardCopy = copy,
    private readonly locale = ""
  ) {
    super(page);
    this.shell = new AdminShell(page);
    this.sidebar = new AdminSidebar(page);
  }

  async goto(): Promise<void> {
    await this.page.goto(`${this.locale}/admin`);
  }

  /** "Admin Console" / "Bảng quản trị". */
  heading(): Locator {
    return this.page.getByRole("heading", {
      name: this.t.adminDashboard.title
    });
  }

  /** A card's title, exact, inside the main landmark. */
  cardTitle(title: string): Locator {
    return this.shell.main().getByText(title, { exact: true });
  }

  /** Every card's "Open" link, in card order. */
  openLinks(): Locator {
    return this.shell
      .main()
      .getByRole("link", { name: this.t.adminDashboard.openCta });
  }

  /** Any link of the landing content pointing at `href`. */
  areaLink(href: string): Locator {
    return this.shell.main().locator(`a[href="${href}"]`);
  }
}
