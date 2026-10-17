import type { Locator, Page } from "@playwright/test";
import { Announcer } from "@/components/announcer.component";
import { FavoriteButton } from "@/components/favorite-button.component";
import { copy, copyVi } from "@/data/copy";
import { BasePage } from "../base.page";

// Favourites — /favorites, client/src/views/Favorites (FavoritesGrid):
// PageHeader, PageToolbar (search box in role="search", "Filters" popover with
// the category select, and the "Sort: …" dropdown in its filter slot),
// PageContent (skeleton, empty state, AppCard tiles). Search and category live
// in the URL (useListQuery); sort is local state. `locale: "vi"` opens
// /vi/favorites and reads the vi catalogue.

type Locale = "en" | "vi";
type SortKey = "recent" | "name";
const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export class FavoritesPage extends BasePage {
  readonly hearts: FavoriteButton;
  readonly announcer: Announcer;
  private readonly t: Pick<typeof copy, "favorites" | "list" | "apps">;

  constructor(
    page: Page,
    readonly locale: Locale = "en"
  ) {
    super(page);
    this.t = locale === "vi" ? copyVi : copy;
    this.hearts = new FavoriteButton(page, this.t);
    this.announcer = new Announcer(page);
  }

  /** `/favorites` or `/vi/favorites`, plus `query` as given (`?search=…`). */
  path(query = ""): string {
    return `${this.locale === "vi" ? "/vi" : ""}/favorites${query}`;
  }

  async goto(query = ""): Promise<void> {
    await this.page.goto(this.path(query));
  }

  // ── toolbar ─────────────────────────────────────────────────────────────

  /** Toolbar search region — absent when the page did not render. */
  searchRegion(): Locator {
    return this.page.getByRole("search");
  }

  /** Its accessible name is the generic "Search"; the localised text is the placeholder. */
  searchInput(): Locator {
    return this.searchRegion().getByRole("textbox");
  }

  /** "Filters" / "Bộ lọc"; carries the active-filter count as a badge. */
  filtersButton(): Locator {
    return this.page.getByRole("button", {
      name: new RegExp(escape(this.t.list.filters))
    });
  }

  filtersPopover(): Locator {
    return this.page.locator('[data-slot="popover-content"]');
  }

  /** The category select inside the Filters popover. */
  categorySelect(): Locator {
    return this.filtersPopover().getByRole("combobox").first();
  }

  /** An option of the open select (0 = "All"). */
  selectOption(index: number): Locator {
    return this.page.getByRole("option").nth(index);
  }

  /** "Clear all" inside the Filters popover. */
  clearAllButton(): Locator {
    return this.filtersPopover().getByRole("button", {
      name: new RegExp(escape(this.t.list.clearAll), "i")
    });
  }

  /** The "Sort: <value>" / "Sắp xếp: <value>" dropdown trigger. */
  sortButton(): Locator {
    const prefix = this.t.favorites.sort.label.split("{value}")[0];
    return this.page.getByRole("button", {
      name: new RegExp(`^${escape(prefix)}`)
    });
  }

  /** An item of the open sort menu. */
  sortOption(key: SortKey): Locator {
    return this.page.getByRole("menuitem", {
      name: this.t.favorites.sort[key],
      exact: true
    });
  }

  // ── content ─────────────────────────────────────────────────────────────

  /** The title of `name`'s tile. */
  cardTitle(name: string): Locator {
    return this.page.getByRole("heading", { name, exact: true });
  }

  /** Every tile title, in render order. */
  cardTitles(): Locator {
    return this.page.getByRole("heading", { level: 3 });
  }

  emptyState(): Locator {
    return this.page.getByText(this.t.favorites.empty);
  }

  /** "Could not load favorites. Please try again." */
  errorMessage(): Locator {
    return this.page.getByText(this.t.favorites.error);
  }

  /** The whole document body — for "no raw i18n key leaked" checks. */
  body(): Locator {
    return this.page.locator("body");
  }

  /** True when keyboard focus has fallen back to <body> (nothing focused). */
  focusIsOnBody(): Promise<boolean> {
    return this.page.evaluate(() => document.activeElement === document.body);
  }

  // ── actions ─────────────────────────────────────────────────────────────

  async search(text: string): Promise<void> {
    await this.searchInput().fill(text);
  }

  async openFilters(): Promise<void> {
    await this.filtersButton().click();
  }

  async openSort(): Promise<void> {
    await this.sortButton().click();
  }
}
