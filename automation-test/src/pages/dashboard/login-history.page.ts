import type { Locator, Page } from "@playwright/test";
import { copy } from "@/data/copy";
import { escapeRegExp } from "@/utils/regex";
import { BasePage } from "../base.page";

// My login history — /login-history, client/src/views/LoginHistory
// (LoginHistoryTable): page title + description, the unified list shell
// (PageToolbar Filters popover without a search box, CustomTable, and
// CustomPagination only when there is more than one page). Filter definitions
// and columns come from client/src/dataSources/LoginHistory
// (buildLoginHistoryFilterDefs + buildLoginAppFilterDefs,
// buildLoginHistoryColumns). The Filters panel holds, in order: Status,
// Method, Device (selects), Date range (select named "Date range"), App
// (select). Its labels are not tied to the selects, so they are found by
// position.
//
// Text comes from the catalogues the page renders: loginHistory.json and the
// shared list.json. A Vietnamese page is
// `new LoginHistoryPage(page, copyVi, "/vi")`.

/** The catalogues this screen reads: `copy` (en) or `copyVi`. */
export type LoginHistoryCopy = Pick<typeof copy, "loginHistory" | "list">;

export class LoginHistoryPage extends BasePage {
  constructor(
    page: Page,
    private readonly t: LoginHistoryCopy = copy,
    /** Locale prefix of the URL: "" (en, as-needed) or "/vi". */
    private readonly locale = ""
  ) {
    super(page);
  }

  /** `query` is the raw query string, with its leading "?" (or ""). */
  async goto(query = ""): Promise<void> {
    await this.page.goto(`${this.locale}/login-history${query}`);
  }

  heading(): Locator {
    return this.page.getByRole("heading", {
      name: this.t.loginHistory.title,
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

  /** The App select — the last combobox of the Filters panel. */
  appSelect(): Locator {
    return this.filtersPanel().getByRole("combobox").last();
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

  /** Filters → App → `label` (Ducker ID or a catalogue app's name). */
  async chooseApp(label: string): Promise<void> {
    await this.filtersButton().click();
    await this.appSelect().click();
    await this.option(label, true).click();
  }

  /** Filters → Date range → `label` (a preset such as "Last 7 days"). */
  async chooseDateRange(label: string): Promise<void> {
    await this.filtersButton().click();
    await this.dateRangeSelect().click();
    await this.option(label).click();
  }

  /** "Clear filters" — the empty state's reset when a filter is active. */
  clearFiltersButton(): Locator {
    return this.page.getByRole("button", { name: this.t.list.clearFilters });
  }

  // ── table ───────────────────────────────────────────────────────────────

  table(): Locator {
    return this.page.getByRole("table");
  }

  columnHeader(name: string): Locator {
    return this.page.getByRole("columnheader", { name });
  }

  /** Every table row (header row included). */
  rows(): Locator {
    return this.page.getByRole("row");
  }

  /** The table rows that contain `text`. */
  row(text: string): Locator {
    return this.rows().filter({ hasText: text });
  }

  /** A label inside `scope` (default: the page), matched exactly. */
  exactText(text: string, scope: Page | Locator = this.page): Locator {
    return scope.getByText(text, { exact: true });
  }

  /** The first inline element of a row — the Date cell's formatted time. */
  timeIn(row: Locator): Locator {
    return row.locator("time, span").first();
  }

  /** Text anywhere on the page — for "shows / never shows X" checks. */
  text(text: string | RegExp, exact = false): Locator {
    return this.page.getByText(text, { exact });
  }

  /** "No login history found" — the empty state. */
  emptyState(): Locator {
    return this.page.getByText(this.t.loginHistory.table.empty);
  }

  /**
   * The summary stat group the page used to render ("Total Logins: N"),
   * moved to Home. The label is no longer in any catalogue.
   */
  legacyStatsGroup(): Locator {
    return this.page.getByRole("group", { name: /^Total Logins:/ });
  }

  // ── pager (CustomPagination; its labels are hard-coded English) ────────

  pager(): Locator {
    return this.page.getByRole("navigation", { name: "pagination" });
  }

  previousPageLink(): Locator {
    return this.pager().getByRole("link", { name: "Go to previous page" });
  }

  nextPageLink(): Locator {
    return this.pager().getByRole("link", { name: "Go to next page" });
  }
}
