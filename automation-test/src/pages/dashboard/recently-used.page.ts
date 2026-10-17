import type { Locator, Page, Response } from "@playwright/test";
import { FavoriteButton } from "@/components/favorite-button.component";
import { copy, copyVi } from "@/data/copy";
import { BasePage } from "../base.page";

// Recently used — /recently-used, client/src/views/RecentlyUsed
// (RecentAppsBoard): PageHeader with the "Clear History" action (disabled
// while there is nothing to clear), PageToolbar (search only, kept in the
// URL by useListQuery), then one <section aria-labelledby="recent-group-…">
// per day group (Today / Yesterday / This Week / Earlier, h2 + count badge)
// holding <li> rows (RecentAppRow: h3 title, "Opened N times", "Last opened"
// relative time, favourite heart, remove "X", "Open <name>"). Below the rows:
// "Load more" (also clicked by the IntersectionObserver ghost) or "You've
// reached the end of your history.". Removing a row shows a toast with Undo.
// `locale: "vi"` opens /vi/recently-used and reads the vi catalogue.

type Locale = "en" | "vi";
type T = Pick<typeof copy, "recentlyUsed" | "list" | "apps">;

export class RecentlyUsedPage extends BasePage {
  readonly hearts: FavoriteButton;
  readonly clearDialog: ClearHistoryDialog;
  private readonly t: T;

  constructor(
    page: Page,
    readonly locale: Locale = "en"
  ) {
    super(page);
    this.t = locale === "vi" ? copyVi : copy;
    this.hearts = new FavoriteButton(page, this.t);
    this.clearDialog = new ClearHistoryDialog(page, this.t);
  }

  /** `/recently-used` or `/vi/recently-used`, plus `query` as given (`?search=…`). */
  path(query = ""): string {
    return `${this.locale === "vi" ? "/vi" : ""}/recently-used${query}`;
  }

  /** Navigates without waiting for the list (use with a stubbed or failing list). */
  async goto(query = ""): Promise<void> {
    await this.page.goto(this.path(query));
  }

  /** Navigates and waits for the history list to answer 200. */
  async gotoAndWait(query = ""): Promise<void> {
    // Register the wait before navigating: the list can resolve before load does.
    await Promise.all([this.waitForList(), this.goto(query)]);
  }

  async reloadAndWait(): Promise<void> {
    await Promise.all([this.waitForList(), this.page.reload()]);
  }

  /** The next successful GET of the history list (`…/users/me/recent-apps`). */
  waitForList(): Promise<Response> {
    return this.page.waitForResponse(
      (r) =>
        new URL(r.url()).pathname.endsWith("/users/me/recent-apps") &&
        r.request().method() === "GET" &&
        r.status() === 200
    );
  }

  heading(): Locator {
    return this.page.getByRole("heading", {
      name: this.t.recentlyUsed.title,
      level: 1
    });
  }

  // ── header + toolbar ────────────────────────────────────────────────────

  /** "Clear History" — opens the confirmation dialog. */
  clearHistoryButton(): Locator {
    return this.page.getByRole("button", { name: this.t.recentlyUsed.clear });
  }

  /** The toolbar search box (accessible name "Search", list.search). */
  searchInput(): Locator {
    return this.page.getByRole("textbox", { name: this.t.list.search });
  }

  // ── groups and rows ─────────────────────────────────────────────────────

  /** A day group by its title ("Today", "Hôm nay"…). */
  group(name: string): Locator {
    return this.page.getByRole("region", { name });
  }

  /** The row titles of one day group, in render order. */
  groupRowTitles(name: string): Locator {
    return this.group(name).locator("h3");
  }

  /** The title of `name`'s row. */
  rowTitle(name: string): Locator {
    return this.page.getByRole("heading", { name, exact: true });
  }

  /** Every row title of every group, in render order. */
  rowTitles(): Locator {
    return this.page.locator("section[aria-labelledby^='recent-group-'] h3");
  }

  /** The whole row (<li>) of `name`. */
  row(name: string): Locator {
    return this.page.getByRole("listitem").filter({ has: this.rowTitle(name) });
  }

  /** "Remove from history: <name>" — the row's X. */
  removeButton(name: string): Locator {
    return this.page.getByRole("button", {
      name: `${this.t.recentlyUsed.card.remove}: ${name}`
    });
  }

  /** "Open <name>" on the row. */
  openButton(name: string): Locator {
    return this.page.getByRole("button", {
      name: `${this.t.recentlyUsed.card.open} ${name}`
    });
  }

  /** "Undo" on the toast a removal shows. */
  undoButton(): Locator {
    return this.page.getByRole("button", {
      name: this.t.recentlyUsed.toast.undo
    });
  }

  // ── content states ──────────────────────────────────────────────────────

  /** "No recent apps yet" — no history and no search. */
  emptyState(): Locator {
    return this.page.getByText(this.t.recentlyUsed.empty.title);
  }

  /** "Browse apps" — the empty state's link to /apps. */
  browseButton(): Locator {
    return this.page.getByRole("button", {
      name: this.t.recentlyUsed.empty.browse
    });
  }

  /** "No results found" — a search that matched nothing. */
  noResults(): Locator {
    return this.page.getByText(this.t.list.noResultsTitle);
  }

  clearFiltersButton(): Locator {
    return this.page.getByRole("button", { name: this.t.list.clearFilters });
  }

  /** "You've reached the end of your history." */
  allLoaded(): Locator {
    return this.page.getByText(this.t.recentlyUsed.allLoaded);
  }

  loadMoreButton(): Locator {
    return this.page.getByRole("button", {
      name: this.t.recentlyUsed.loadMore
    });
  }

  /** The role="alert" line a failed list request shows. */
  errorAlert(): Locator {
    return this.page
      .getByRole("alert")
      .filter({ hasText: this.t.recentlyUsed.error });
  }

  /** Any text on the page (a toast line, a count badge). */
  text(text: string | RegExp, { exact }: { exact?: boolean } = {}): Locator {
    return this.page.getByText(text, exact === undefined ? {} : { exact });
  }

  // ── actions ─────────────────────────────────────────────────────────────

  async search(text: string): Promise<void> {
    await this.searchInput().fill(text);
  }

  async remove(name: string): Promise<void> {
    await this.removeButton(name).click();
  }

  async openClearDialog(): Promise<void> {
    await this.clearHistoryButton().click();
  }
}

/** The "Clear your recent history?" confirmation (ClearHistoryDialog). */
export class ClearHistoryDialog {
  constructor(
    private readonly page: Page,
    private readonly t: Pick<typeof copy, "recentlyUsed">
  ) {}

  root(): Locator {
    return this.page.getByRole("dialog");
  }

  confirmButton(): Locator {
    return this.root().getByRole("button", {
      name: this.t.recentlyUsed.clearDialog.confirm
    });
  }

  cancelButton(): Locator {
    return this.root().getByRole("button", {
      name: this.t.recentlyUsed.clearDialog.cancel
    });
  }

  async confirm(): Promise<void> {
    await this.confirmButton().click();
  }

  async cancel(): Promise<void> {
    await this.cancelButton().click();
  }
}
