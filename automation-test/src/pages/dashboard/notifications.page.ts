import type { Locator, Page } from "@playwright/test";
import { copy, copyVi } from "@/data/copy";
import { BasePage } from "../base.page";

// /notifications — client/src/views/Notifications: All / Unread / Read tabs,
// the "Filter by type" chips, rows grouped Today / Yesterday / Earlier
// (components/NotificationItem renders each row as an <article>), Load more,
// and the empty / error / loading states. `new NotificationsPage(page, "vi")`
// opens /vi/notifications and reads the Vietnamese catalogue.

type Locale = "en" | "vi";
type TabKey = keyof typeof copy.notifications.tabs;
type CategoryKey = keyof typeof copy.notifications.categories;
type GroupKey = keyof typeof copy.notifications.groups;

export class NotificationsPage extends BasePage {
  private readonly t: (typeof copy)["notifications"];

  constructor(
    page: Page,
    private readonly locale: Locale = "en"
  ) {
    super(page);
    this.t = locale === "vi" ? copyVi.notifications : copy.notifications;
  }

  async goto(): Promise<void> {
    await this.page.goto(`${this.locale === "vi" ? "/vi" : ""}/notifications`);
  }

  // ── tabs and filters ─────────────────────────────────────────────────────

  tab(key: TabKey, { exact = true }: { exact?: boolean } = {}): Locator {
    return this.page.getByRole("tab", { name: this.t.tabs[key], exact });
  }

  categoryGroup(): Locator {
    return this.page.getByRole("group", { name: this.t.categories.label });
  }

  /** A chip inside the "Filter by type" group. */
  categoryChip(key: CategoryKey, pressed?: boolean): Locator {
    return this.categoryGroup().getByRole("button", {
      name: this.t.categories[key],
      pressed
    });
  }

  /** A chip found by its name anywhere on the page. */
  chip(key: CategoryKey, pressed?: boolean): Locator {
    return this.page.getByRole("button", {
      name: this.t.categories[key],
      pressed
    });
  }

  // ── rows ─────────────────────────────────────────────────────────────────

  rows(): Locator {
    return this.page.locator("article");
  }

  /** Rows by read state (`data-read` on the article). */
  rowsRead(isRead: boolean): Locator {
    return this.page.locator(`article[data-read='${isRead}']`);
  }

  /** The row whose text contains `text`. */
  row(text: string): Locator {
    return this.rows().filter({ hasText: text });
  }

  /** A row by its accessible name (the article is labelled by its title). */
  rowNamed(title: string): Locator {
    return this.page.getByRole("article", { name: title });
  }

  /** Any link whose text contains `text` (a row's sentence is its link). */
  link(text: string): Locator {
    return this.page.getByRole("link").filter({ hasText: text });
  }

  /** The anchors inside rows (a row's link to what it is about). */
  rowLinks(): Locator {
    return this.page.locator("article a");
  }

  /** Rendered text anywhere on the page — a row's sentence or title. */
  text(text: string | RegExp, { exact }: { exact?: boolean } = {}): Locator {
    return exact === undefined
      ? this.page.getByText(text)
      : this.page.getByText(text, { exact });
  }

  /** The "Mark as read" button of the row containing `text`. */
  markReadButtonIn(text: string): Locator {
    return this.row(text).getByRole("button", {
      name: this.t.actions.markRead
    });
  }

  markReadButtons(): Locator {
    return this.page.getByRole("button", { name: this.t.actions.markRead });
  }

  notMeLink(): Locator {
    return this.page.getByRole("link", { name: this.t.actions.notMe });
  }

  /** The rows of one day group (Today / Yesterday / Earlier). */
  dayGroup(key: GroupKey): Locator {
    return this.page.locator(
      `section[aria-label="${this.t.groups[key]}"] article`
    );
  }

  /** Any of the three day-group headings. */
  dayHeadings(): Locator {
    const { today, yesterday, earlier } = this.t.groups;
    return this.page.getByText(
      new RegExp(`^(${today}|${yesterday}|${earlier})$`)
    );
  }

  /** A raw ISO timestamp leaking into the page (`2026-10-07T10:00`). */
  isoTimestamps(): Locator {
    return this.page.getByText(/\dT\d\d:\d\d/);
  }

  // ── actions and states ───────────────────────────────────────────────────

  markAllButton(): Locator {
    return this.page.getByRole("button", { name: this.t.actions.markAllRead });
  }

  loadMoreButton(): Locator {
    return this.page.getByRole("button", { name: this.t.actions.loadMore });
  }

  retryButton(): Locator {
    return this.page.getByRole("button", { name: this.t.actions.retry });
  }

  emptyTitle(): Locator {
    return this.page.getByText(this.t.states.emptyTitle);
  }

  emptyText(): Locator {
    return this.page.getByText(this.t.states.empty);
  }

  errorText(): Locator {
    return this.page.getByText(this.t.states.error);
  }

  /** The polite live region (`useAnnounce`). */
  announcer(): Locator {
    return this.page.locator("#announcer");
  }

  /**
   * NotificationListSkeleton is wrapped in an aria-hidden div; this is the
   * first aria-hidden node on the page while the list is pending.
   */
  skeleton(): Locator {
    return this.page.locator("[aria-hidden='true']").first();
  }

  /**
   * The skeleton's title bars. The `w-40` class is the only thing that tells
   * the skeleton apart from icon wrappers, which are aria-hidden too.
   */
  skeletonTitleBars(): Locator {
    return this.page.locator("[aria-hidden='true'] .w-40");
  }
}
