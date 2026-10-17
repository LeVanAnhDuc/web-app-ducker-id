import type { Locator, Page } from "@playwright/test";
import { AppCard } from "@/components/app-card.component";
import { Announcer } from "@/components/announcer.component";
import { HeaderSearch } from "@/components/header-search.component";
import { copy, copyVi, fill } from "@/data/copy";
import { BasePage } from "../base.page";

// The app catalogue — /apps, client/src/views/Apps (AppsBoard): PageHeader,
// PageToolbar (search box in role="search", "Filters" popover with the
// category select, grid / list toggle), PageContent (skeleton, empty state,
// AppCard tiles) and CustomPagination when there is more than one page.
// Search, category and page live in the URL (useListQuery); the view toggle
// is local state. `locale: "vi"` opens /vi/apps and reads the vi catalogue.

type Locale = "en" | "vi";
const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export class AppsPage extends BasePage {
  readonly cards: AppCard;
  readonly headerSearch: HeaderSearch;
  readonly announcer: Announcer;
  private readonly t: Pick<
    typeof copy,
    "apps" | "list" | "dashboard" | "common"
  >;

  constructor(
    page: Page,
    readonly locale: Locale = "en"
  ) {
    super(page);
    this.t = locale === "vi" ? copyVi : copy;
    this.cards = new AppCard(page, this.t);
    this.headerSearch = new HeaderSearch(page, this.t);
    this.announcer = new Announcer(page);
  }

  /** `/apps` or `/vi/apps`, plus `query` as given (`?search=…`). */
  path(query = ""): string {
    return `${this.locale === "vi" ? "/vi" : ""}/apps${query}`;
  }

  async goto(query = ""): Promise<void> {
    await this.page.goto(this.path(query));
  }

  heading(): Locator {
    return this.page.getByRole("heading", {
      name: this.t.apps.title,
      exact: true
    });
  }

  // ── toolbar ─────────────────────────────────────────────────────────────

  searchInput(): Locator {
    return this.page.getByRole("search").getByRole("textbox");
  }

  /** Toolbar search region — absent when the page did not render. */
  searchRegion(): Locator {
    return this.page.getByRole("search");
  }

  /** "Filters" / "Bộ lọc"; carries the active-filter count as a badge. */
  filtersButton(): Locator {
    return this.page.getByRole("button", {
      name: new RegExp(escape(this.t.list.filters), "i")
    });
  }

  filtersPopover(): Locator {
    return this.page.locator('[data-slot="popover-content"]');
  }

  /** The category select inside the Filters popover. */
  categorySelect(): Locator {
    return this.filtersPopover().getByRole("combobox");
  }

  categoryGroupLabel(): Locator {
    return this.page.getByText(this.t.apps.categories.groupLabel);
  }

  /** An option of the open select (0 = "All"). */
  selectOption(index: number): Locator {
    return this.page.getByRole("option").nth(index);
  }

  gridButton(): Locator {
    return this.page.getByRole("button", { name: this.t.list.viewGrid });
  }

  listButton(): Locator {
    return this.page.getByRole("button", { name: this.t.list.viewList });
  }

  // ── content states ──────────────────────────────────────────────────────

  emptyState(): Locator {
    return this.page.getByRole("heading", { name: this.t.apps.empty });
  }

  clearFiltersButton(): Locator {
    return this.page.getByRole("button", { name: this.t.list.clearFilters });
  }

  errorAlert(): Locator {
    return this.page.getByRole("alert").filter({ hasText: this.t.apps.error });
  }

  /** AppCardSkeleton placeholders (Skeleton has no role or label). */
  skeletons(): Locator {
    return this.page.locator(".animate-pulse");
  }

  /** Any text on the page (a stubbed app name, a category chip). */
  text(text: string, { exact }: { exact?: boolean } = {}): Locator {
    return this.page.getByText(text, exact === undefined ? {} : { exact });
  }

  /**
   * The category chips of one app's tile (components/CategoryChips) — the
   * list inside the region labelled by the tile's title.
   */
  categoryChipList(appName: string): Locator {
    return this.page
      .locator("[aria-labelledby^='apps-'][aria-labelledby$='-title']")
      .filter({ hasText: appName })
      .getByRole("list", { name: this.t.common.categoryChips.title });
  }

  /** The chips of one app's tile, in order (first = primary). */
  categoryChipItems(appName: string): Locator {
    return this.categoryChipList(appName).getByRole("listitem");
  }

  /** "Show N more categories" — the "+N" chip of a compact tile. */
  moreCategoriesButtons(count: number): Locator {
    return this.page.getByRole("button", {
      name: fill(this.t.common.categoryChips.more, { count })
    });
  }

  /** The popover the "+N" chip opens (a dialog). */
  categoriesPopover(): Locator {
    return this.page.getByRole("dialog");
  }

  /** Text inside that popover. */
  categoriesPopoverText(text: string): Locator {
    return this.categoriesPopover().getByText(text);
  }

  /** The whole document body — for "no raw i18n key leaked" checks. */
  body(): Locator {
    return this.page.locator("body");
  }

  // ── pagination (components/ui/pagination: labels are not localised) ────

  pager(): Locator {
    return this.page.getByRole("navigation", { name: "pagination" });
  }

  previousPage(): Locator {
    return this.pager().getByRole("link", { name: "Go to previous page" });
  }

  nextPage(): Locator {
    return this.pager().getByRole("link", { name: "Go to next page" });
  }

  pageLink(n: number): Locator {
    return this.pager().getByRole("link", { name: String(n), exact: true });
  }

  // ── actions ─────────────────────────────────────────────────────────────

  async search(text: string): Promise<void> {
    await this.searchInput().fill(text);
  }

  async openFilters(): Promise<void> {
    await this.filtersButton().click();
  }

  // ── sidebar ─────────────────────────────────────────────────────────────

  /** A sidebar link by its catalogue key ("home" → "Home" / "Trang chủ"). */
  sidebarLink(
    key: keyof (typeof copy)["dashboard"]["sidebar"]["nav"]
  ): Locator {
    return this.page
      .getByRole("link", { name: this.t.dashboard.sidebar.nav[key] })
      .first();
  }
}
