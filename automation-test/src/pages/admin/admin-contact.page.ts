import type { Locator, Page } from "@playwright/test";
import { copy } from "@/data/copy";
import { BasePage } from "../base.page";

// Admin support inbox — /admin/contact, client/src/views/AdminContact: the
// unified list shell (PageToolbar search box + Filters popover, CustomTable
// whose rows are links, CustomPagination). Filter definitions and columns come
// from client/src/dataSources/ContactAdmin; the ticket cell is the ShortId
// (first 6 hex chars + "...").
//
// Text comes from the catalogues the page renders: contactAdmin.json and the
// shared list.json. A Vietnamese page is `new AdminContactPage(page, copyVi, "/vi")`.

/** The catalogues this screen reads: `copy` (en) or `copyVi`. */
export type AdminContactCopy = Pick<typeof copy, "contactAdmin" | "list">;

const escapeRegExp = (text: string) =>
  text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export class AdminContactPage extends BasePage {
  constructor(
    page: Page,
    private readonly t: AdminContactCopy = copy,
    /** Locale prefix of the URL: "" (en, as-needed) or "/vi". */
    private readonly locale = ""
  ) {
    super(page);
  }

  async goto(): Promise<void> {
    await this.page.goto(`${this.locale}/admin/contact`);
  }

  /** The list with these URL params — the page's source of truth (useListQuery). */
  async gotoWith(params: Record<string, string>): Promise<void> {
    await this.page.goto(
      `${this.locale}/admin/contact?${new URLSearchParams(params).toString()}`
    );
  }

  /** "Contact Requests". */
  heading(): Locator {
    return this.page.getByRole("heading", {
      name: this.t.contactAdmin.admin.list.title,
      level: 1
    });
  }

  // ── toolbar ─────────────────────────────────────────────────────────────

  /** The toolbar search box (subject or email). */
  searchBox(): Locator {
    return this.page.getByRole("search").getByRole("textbox");
  }

  /** The Filters popover trigger (its label carries the active count). */
  filtersButton(): Locator {
    return this.page.getByRole("button", {
      name: new RegExp(`^${escapeRegExp(this.t.list.filters)}`)
    });
  }

  /** The opened Filters panel (shadcn popover content). */
  filtersPanel(): Locator {
    return this.page.locator('[data-slot="popover-content"]');
  }

  /** The opened Filters panel by its role (the popover is a dialog). */
  filtersDialog(): Locator {
    return this.page.getByRole("dialog");
  }

  /** The Status select — the first combobox of the Filters panel. */
  statusFilter(): Locator {
    return this.filtersPanel().getByRole("combobox").first();
  }

  dateRangeSelect(): Locator {
    return this.page.getByRole("combobox", {
      name: this.t.list.dateRange.label
    });
  }

  option(name: string, exact = false): Locator {
    return this.page.getByRole("option", { name, exact });
  }

  /** Filters → Status → `label` (the panel is opened first). */
  async chooseStatus(label: string): Promise<void> {
    await this.filtersButton().click();
    await this.statusFilter().click();
    await this.option(label, true).click();
  }

  /** Filters → Date range → `label` (a preset such as "Today"). */
  async chooseDateRange(label: string): Promise<void> {
    await this.filtersButton().click();
    await this.dateRangeSelect().click();
    await this.option(label).click();
  }

  clearFiltersButton(): Locator {
    return this.page.getByRole("button", { name: this.t.list.clearFilters });
  }

  // ── table ───────────────────────────────────────────────────────────────

  columnHeader(name: string | RegExp): Locator {
    return typeof name === "string"
      ? this.page.getByRole("columnheader", { name, exact: true })
      : this.page.getByRole("columnheader", { name });
  }

  /** Every table row, the header row included. */
  rows(): Locator {
    return this.page.getByRole("row");
  }

  /** The table row that contains `text` (a request's subject). */
  row(text: string): Locator {
    return this.rows().filter({ hasText: text });
  }

  /** The "View details for ticket {id}" link of a row. */
  rowLink(id: string): Locator {
    return this.page.getByRole("link", {
      name: this.t.contactAdmin.admin.list.table.viewDetailFor.replace(
        "{id}",
        id
      )
    });
  }

  /** "No contact requests found" — the empty state. */
  emptyState(): Locator {
    return this.page.getByText(this.t.contactAdmin.admin.list.table.empty);
  }

  /** Text anywhere on the page — ShortId cells (`SHORT_ID_RE`), "never shows X" checks. */
  text(text: string | RegExp, options?: { exact?: boolean }): Locator {
    return this.page.getByText(text, options);
  }
}
