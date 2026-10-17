import type { Locator, Page } from "@playwright/test";
import { Announcer } from "@/components/announcer.component";
import { copy } from "@/data/copy";
import { BasePage } from "../base.page";

// One support request — /admin/contact/[id], client/src/views/AdminContactDetail:
// breadcrumb ("Contact Inbox" → the full id) + title (server component), then
// ContactDetailCard — h2 with the full id, status badge, the status select
// (disabled while a change is in flight) and a <dl> of fields (Email and
// User ID only when present) — and ContactAttachments. A request that fails
// to load renders no card; the global error toast carries the server message.
// A Vietnamese page is `new AdminContactDetailPage(page, copyVi, "/vi")`.

/** The catalogue this screen reads: `copy` (en) or `copyVi`. */
export type AdminContactDetailCopy = Pick<typeof copy, "contactAdmin">;

export class AdminContactDetailPage extends BasePage {
  readonly announcer: Announcer;

  constructor(
    page: Page,
    private readonly t: AdminContactDetailCopy = copy,
    /** Locale prefix of the URL: "" (en, as-needed) or "/vi". */
    private readonly locale = ""
  ) {
    super(page);
    this.announcer = new Announcer(page);
  }

  async goto(id: string): Promise<void> {
    await this.page.goto(`${this.locale}/admin/contact/${id}`);
  }

  /** "Contact Detail" (h1). */
  heading(): Locator {
    return this.page.getByRole("heading", {
      name: this.t.contactAdmin.admin.detail.title,
      level: 1
    });
  }

  /** The card heading (h2): the request's full id. */
  idHeading(id: string): Locator {
    return this.page.getByRole("heading", { level: 2, name: id });
  }

  breadcrumb(): Locator {
    return this.page.getByRole("navigation", { name: "breadcrumb" });
  }

  /** The breadcrumb's current item, matched by its exact text (the full id). */
  breadcrumbCurrent(id: string): Locator {
    return this.breadcrumb().getByText(id, { exact: true });
  }

  /** The breadcrumb's "Contact Inbox" link back to the list. */
  breadcrumbListLink(): Locator {
    return this.breadcrumb().getByRole("link", {
      name: this.t.contactAdmin.admin.detail.breadcrumb.list
    });
  }

  main(): Locator {
    return this.page.getByRole("main");
  }

  /** A field label of the card's <dl>, matched exactly ("Email", "User ID"…). */
  fieldLabel(label: string): Locator {
    return this.main().getByText(label, { exact: true });
  }

  /** Text inside the main region. */
  mainText(text: string | RegExp): Locator {
    return this.main().getByText(text);
  }

  /** Text anywhere on the page — toasts, "never shows X" checks. */
  text(text: string | RegExp, options?: { exact?: boolean }): Locator {
    return this.page.getByText(text, options);
  }

  /**
   * The status select on the card (the header search is a combobox too, but
   * it sits in the banner, not in main). Absent when no card rendered.
   */
  statusSelect(): Locator {
    return this.main().getByRole("combobox");
  }

  /** The status badge (or select value) reading `label`. */
  statusBadge(label: string): Locator {
    return this.main().getByText(label, { exact: true }).first();
  }

  /** Every option of the opened status select. */
  options(): Locator {
    return this.page.getByRole("option");
  }

  option(name: string, exact = false): Locator {
    return this.page.getByRole("option", { name, exact });
  }

  /** Opens the status select and picks `label`. */
  async chooseStatus(label: string): Promise<void> {
    await this.statusSelect().click();
    await this.option(label, true).click();
  }

  /** "No attachments". */
  noAttachments(): Locator {
    return this.mainText(this.t.contactAdmin.admin.detail.attachments.empty);
  }
}
