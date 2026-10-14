import type { Locator, Page } from "@playwright/test";
import { copy } from "@/data/copy";
import { BasePage } from "../base.page";

/** The catalogue this screen reads: `copy` (en) or `copyVi`. */
export type MyRequestDetailCopy = Pick<typeof copy, "contactAdmin">;

// One of my requests — /contacts/me/<id>, client/src/views/MyContactDetail:
// a breadcrumb back to My Requests and the page title (server-rendered), then
// a card with the ticket ShortId as its h2, status badge, Priority, Date,
// Subject and Message (dt/dd). Read-only: no status control. An id that is
// not mine, absent or malformed renders the not-found state, a
// `<p role="alert">`.
// A Vietnamese page is `new MyRequestDetailPage(page, copyVi, "/vi")`.
export class MyRequestDetailPage extends BasePage {
  constructor(
    page: Page,
    private readonly t: MyRequestDetailCopy = copy,
    /** Locale prefix of the URL: "" (en, as-needed) or "/vi". */
    private readonly locale = ""
  ) {
    super(page);
  }

  private get detail() {
    return this.t.contactAdmin.myContacts.detail;
  }

  async goto(id: string): Promise<void> {
    await this.page.goto(`${this.locale}/contacts/me/${id}`);
  }

  heading(): Locator {
    return this.page.getByRole("heading", { name: this.detail.title });
  }

  /** Every heading of the page, in document order. */
  headings(): Locator {
    return this.page.getByRole("heading");
  }

  /** The card's h2 — the ticket ShortId. */
  ticketHeading(): Locator {
    return this.page.getByRole("heading", { level: 2 });
  }

  breadcrumb(): Locator {
    return this.page.getByRole("navigation", { name: "breadcrumb" });
  }

  /** The breadcrumb's "My Requests" entry, as text. */
  breadcrumbListText(): Locator {
    return this.breadcrumb().getByText(this.detail.breadcrumb.list, {
      exact: true
    });
  }

  /** The breadcrumb's link back to the list. */
  breadcrumbListLink(): Locator {
    return this.breadcrumb().getByRole("link", {
      name: new RegExp(this.detail.breadcrumb.list, "i")
    });
  }

  /** The "Message" field label. */
  messageLabel(): Locator {
    return this.page.getByText(this.detail.fields.message, { exact: true });
  }

  /** Any text on the page; `exact` for a whole subject. */
  text(text: string, options?: { exact?: boolean }): Locator {
    return this.page.getByText(text, options);
  }

  /** Every `<time>` the page renders (FormatTime). */
  times(): Locator {
    return this.page.locator("time");
  }

  statusCombobox(): Locator {
    return this.page.getByRole("combobox", { name: /status/i });
  }

  updateStatusButton(): Locator {
    return this.page.getByRole("button", {
      name: /update status|change status/i
    });
  }

  /**
   * The not-found state. Scoped to the app's own `<p role="alert">`: an
   * unscoped `getByRole("alert")` also matches Next.js's route announcer.
   */
  notFoundAlert(): Locator {
    return this.page.locator('p[role="alert"]');
  }

  /** Every `role=alert` on the page, the route announcer included. */
  anyAlert(): Locator {
    return this.page.getByRole("alert");
  }

  /** A raw, untranslated `contactAdmin.*` key leaking into the page. */
  leakedKey(): Locator {
    return this.page.getByText(/\[contactAdmin\./);
  }

  /** An `<img>` with this exact `src` — markup in a request must never become one. */
  imageWithSrc(src: string): Locator {
    return this.page.locator(`img[src="${src}"]`);
  }
}
