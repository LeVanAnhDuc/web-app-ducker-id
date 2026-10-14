import type { Locator, Page } from "@playwright/test";
import { Announcer } from "@/components/announcer.component";
import { clientLiteral, copy } from "@/data/copy";
import { BasePage } from "../base.page";

// One login attempt — /admin/login-history/[id],
// client/src/views/AdminLoginHistoryDetail: breadcrumb + title (server
// component), then LoginHistoryDetailCard with its loading skeleton,
// not-found / error state (400 and 404 both read "not found") and a <dl> of
// fields. A Vietnamese page is
// `new AdminLoginHistoryDetailPage(page, copyVi, "/vi")`.

/** The catalogue this screen reads: `copy` (en) or `copyVi`. */
export type AdminLoginHistoryDetailCopy = Pick<typeof copy, "loginHistory">;

export class AdminLoginHistoryDetailPage extends BasePage {
  readonly announcer: Announcer;

  constructor(
    page: Page,
    private readonly t: AdminLoginHistoryDetailCopy = copy,
    /** Locale prefix of the URL: "" (en, as-needed) or "/vi". */
    private readonly locale = ""
  ) {
    super(page);
    this.announcer = new Announcer(page);
  }

  async goto(id: string): Promise<void> {
    await this.page.goto(`${this.locale}/admin/login-history/${id}`);
  }

  /** The detail URL of any record, for `waitForURL` / `toHaveURL`. */
  urlPattern(): RegExp {
    return /\/admin\/login-history\/[a-f0-9]{24}/;
  }

  heading(): Locator {
    return this.page.getByRole("heading", {
      name: this.t.loginHistory.admin.detail.title
    });
  }

  /** A field label of the <dl>, matched exactly ("IP Address", "User ID"…). */
  fieldLabel(label: string): Locator {
    return this.page.getByText(label, { exact: true });
  }

  /** Text anywhere on the page. */
  text(text: string | RegExp, exact = false): Locator {
    return this.page.getByText(text, { exact });
  }

  /** "Login history record not found." — 400 and 404. */
  notFound(): Locator {
    return this.page.getByText(this.t.loginHistory.admin.detail.notFound);
  }

  /** "Could not load this login record…" — any other failure. */
  loadError(): Locator {
    return this.page.getByText(this.t.loginHistory.admin.detail.error);
  }

  /** The skeleton shown while the record loads (shadcn Skeleton). */
  skeleton(): Locator {
    return this.page.locator(".animate-pulse");
  }

  breadcrumb(): Locator {
    return this.page.getByRole("navigation", { name: "breadcrumb" });
  }

  /** The breadcrumb's "Login History" link back to the list. */
  breadcrumbListLink(): Locator {
    return this.breadcrumb().getByRole("link", {
      name: this.t.loginHistory.admin.detail.breadcrumb.list
    });
  }

  /** The blocking "Unable to connect to server…" toast (no response). */
  networkErrorToast(): Locator {
    return this.toast.withText(clientLiteral.networkErrorToast);
  }

  /** The toast's OK button, which releases the failed request. */
  toastOkButton(): Locator {
    return this.page.getByRole("button", {
      name: new RegExp(`^${clientLiteral.toastOk}$`)
    });
  }
}
