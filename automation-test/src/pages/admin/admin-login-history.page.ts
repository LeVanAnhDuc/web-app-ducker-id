import type { Locator, Page } from "@playwright/test";
import { copy } from "@/data/copy";
import { BasePage } from "../base.page";

// Admin login history — /admin/login-history, client/src/views/AdminLoginHistory:
// the unified list shell (PageToolbar Filters popover without a search box,
// CustomTable whose rows are links, CustomPagination). Filter definitions and
// columns come from client/src/dataSources/LoginHistory.
//
// Text comes from the catalogues the page renders: loginHistory.json and the
// shared list.json. A Vietnamese page is
// `new AdminLoginHistoryPage(page, copyVi, "/vi")`.

/** The catalogues this screen reads: `copy` (en) or `copyVi`. */
export type AdminLoginHistoryCopy = Pick<typeof copy, "loginHistory" | "list">;

const escapeRegExp = (text: string) =>
  text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** "View details for {name}" → the text before the name. */
const rowLinkPrefix = (t: AdminLoginHistoryCopy) =>
  t.loginHistory.table.viewDetailFor.split("{name}")[0];

export class AdminLoginHistoryPage extends BasePage {
  constructor(
    page: Page,
    private readonly t: AdminLoginHistoryCopy = copy,
    /** Locale prefix of the URL: "" (en, as-needed) or "/vi". */
    private readonly locale = ""
  ) {
    super(page);
  }

  /** `query` is the raw query string, with its leading "?" (or ""). */
  async goto(query = ""): Promise<void> {
    await this.page.goto(`${this.locale}/admin/login-history${query}`);
  }

  heading(): Locator {
    return this.page.getByRole("heading", {
      name: this.t.loginHistory.admin.title,
      level: 1
    });
  }

  // ── toolbar ─────────────────────────────────────────────────────────────

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

  /** The Status select — the first combobox of the Filters panel. */
  statusSelect(): Locator {
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

  /** Filters → Status → `label`. */
  async chooseStatus(label: string): Promise<void> {
    await this.filtersButton().click();
    await this.statusSelect().click();
    await this.option(label, true).click();
  }

  /** Filters → Date range → `label` (a preset such as "Last 7 days"). */
  async chooseDateRange(label: string): Promise<void> {
    await this.filtersButton().click();
    await this.dateRangeSelect().click();
    await this.option(label).click();
  }

  clearFiltersButton(): Locator {
    return this.page.getByRole("button", { name: this.t.list.clearFilters });
  }

  // ── table ───────────────────────────────────────────────────────────────

  table(): Locator {
    return this.page.getByRole("table");
  }

  columnHeader(name: string): Locator {
    return this.page.getByRole("columnheader", { name, exact: true });
  }

  /** A label inside the table, matched exactly. */
  tableText(text: string): Locator {
    return this.table().getByText(text, { exact: true });
  }

  /** The table row that contains `text`. */
  row(text: string): Locator {
    return this.page.getByRole("row").filter({ hasText: text });
  }

  /** Every row link ("View details for {username}"). */
  rowLinks(): Locator {
    return this.page.getByRole("link", {
      name: new RegExp(`^${escapeRegExp(rowLinkPrefix(this.t))}`)
    });
  }

  /** The first row's link. */
  firstRowLink(): Locator {
    return this.rowLinks().first();
  }

  /** The username every row link names, in table order. */
  async rowUsernames(): Promise<string[]> {
    const prefix = rowLinkPrefix(this.t);
    const labels = await this.rowLinks().evaluateAll((els) =>
      els.map((e) => e.getAttribute("aria-label") ?? "")
    );
    return labels.map((l) =>
      l.startsWith(prefix) ? l.slice(prefix.length) : l
    );
  }

  /** "No login history found" — the empty state. */
  emptyState(): Locator {
    return this.page.getByText(this.t.loginHistory.table.empty);
  }

  /** Text anywhere on the page — for "never shows X" checks. */
  text(text: string | RegExp, exact = false): Locator {
    return this.page.getByText(text, { exact });
  }

  // ── pager (CustomPagination; its labels are hard-coded English) ────────

  pager(): Locator {
    return this.page.getByRole("navigation", { name: "pagination" });
  }

  nextPageLink(): Locator {
    return this.page.getByRole("link", { name: "Go to next page" });
  }
}
