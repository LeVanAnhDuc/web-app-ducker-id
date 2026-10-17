import type { Locator, Page } from "@playwright/test";
import { SupportDialog } from "@/components/support-dialog.component";
import { copy } from "@/data/copy";
import { BasePage } from "../base.page";

/** The catalogues this screen reads: `copy` (en) or `copyVi`. */
export type MyRequestsCopy = Pick<typeof copy, "contactAdmin" | "support">;

// My Requests — /contacts/me, client/src/views/MyContacts (MyContactsTable):
// the unified list shell (PageHeader with "Submit new request", PageToolbar
// with the subject search and a Filters popover holding Status, CustomTable,
// CustomPagination only past one page) and the support dialog the header
// button opens. Columns (client/src/dataSources/MyContacts): Ticket (ShortId),
// Subject, Status badge, Priority, Date (`<time>`). Each row is a link named
// "View details for ticket <id>" that opens /contacts/me/<id>.
// Search, status and page live in the URL (useListQuery).
// A Vietnamese page is `new MyRequestsPage(page, copyVi, "/vi")`.
export class MyRequestsPage extends BasePage {
  /** The support dialog "Submit new request" opens. */
  readonly supportDialog: SupportDialog;

  constructor(
    page: Page,
    private readonly t: MyRequestsCopy = copy,
    /** Locale prefix of the URL: "" (en, as-needed) or "/vi". */
    private readonly locale = ""
  ) {
    super(page);
    this.supportDialog = new SupportDialog(page, t);
  }

  private get my() {
    return this.t.contactAdmin.myContacts;
  }

  /** `query` is the raw query string, with its leading "?" (or ""). */
  async goto(query = ""): Promise<void> {
    await this.page.goto(`${this.locale}/contacts/me${query}`);
  }

  heading(): Locator {
    return this.page.getByRole("heading", { name: this.my.title });
  }

  // ── toolbar ─────────────────────────────────────────────────────────────

  /**
   * The page's own search box. The header carries a global app search too,
   * so this is scoped to the toolbar's role="search" landmark.
   */
  searchInput(): Locator {
    return this.page.getByRole("search").getByRole("textbox");
  }

  filtersButton(): Locator {
    return this.page.getByRole("button", { name: /filters/i });
  }

  /** The opened Filters popover. */
  filtersPopover(): Locator {
    return this.page.getByRole("dialog");
  }

  clearFiltersButton(): Locator {
    return this.page.getByRole("button", { name: /clear filters/i });
  }

  /** "Submit new request" — in the header, and again in the empty state. */
  submitNewButton(): Locator {
    return this.page.getByRole("button", {
      name: new RegExp(this.my.submitNew, "i")
    });
  }

  // ── table ───────────────────────────────────────────────────────────────

  table(): Locator {
    return this.page.getByRole("table");
  }

  columnHeader(name: string): Locator {
    return this.page.getByRole("columnheader", { name });
  }

  /** The row links ("View details for ticket <id>"). */
  rowLinks(): Locator {
    return this.page.getByRole("link", {
      name: /View details for ticket/i
    });
  }

  /** Any exact text on the page — a subject, a status or priority label. */
  exactText(text: string): Locator {
    return this.page.getByText(text, { exact: true });
  }

  /** Text matching a pattern — e.g. the ShortId ticket cells. */
  textMatching(pattern: RegExp): Locator {
    return this.page.getByText(pattern);
  }

  /** Every `<time>` the page renders (FormatTime). */
  times(): Locator {
    return this.page.locator("time");
  }

  /**
   * The loading skeleton (MyContactsTableSkeleton). Its rows carry nothing
   * but Tailwind's pulse animation, so the class is the only handle.
   */
  skeleton(): Locator {
    return this.page.locator(".animate-pulse");
  }

  /** The empty state of an account with no requests ("No requests submitted yet"). */
  emptyHeading(): Locator {
    return this.page.getByRole("heading", { name: this.my.table.empty });
  }

  /** The empty state as text, whatever element carries it. */
  emptyText(): Locator {
    return this.page.getByText(new RegExp(this.my.table.empty, "i"));
  }

  /** The no-match state of a search or filter ("No results found"). */
  noResultsText(): Locator {
    return this.page.getByText(/no results found/i);
  }

  /** A raw, untranslated `contactAdmin.*` key leaking into the page. */
  leakedKey(): Locator {
    return this.page.getByText(/\[contactAdmin\./);
  }

  async openSupportDialog(): Promise<void> {
    await this.submitNewButton().first().click();
  }
}
