import type { Locator, Page } from "@playwright/test";
import { copy, fill } from "@/data/copy";
import { BasePage } from "../base.page";

// Admin user accounts — /admin/users, client/src/views/AdminUsers: the unified
// list shell (PageToolbar search + Filters popover, CustomTable,
// CustomPagination) plus the row menu and its lock / unlock and
// reset-password dialogs (mains/AdminUsers{Lock,ResetPassword}Dialog).
//
// Text comes from the catalogues the page renders: adminUsers.json and the
// shared list.json. A Vietnamese page is `new AdminUsersPage(page, copyVi, "/vi")`.

/** The catalogues this screen reads: `copy` (en) or `copyVi`. */
export type AdminUsersCopy = Pick<typeof copy, "adminUsers" | "list">;

export class AdminUsersPage extends BasePage {
  readonly lockDialog: AdminUserLockDialog;
  readonly resetDialog: AdminUserResetDialog;

  constructor(
    page: Page,
    private readonly t: AdminUsersCopy = copy,
    /** Locale prefix of the URL: "" (en, as-needed) or "/vi". */
    private readonly locale = ""
  ) {
    super(page);
    this.lockDialog = new AdminUserLockDialog(page, t);
    this.resetDialog = new AdminUserResetDialog(page, t);
  }

  /** `query` is the raw query string, with its leading "?" (or ""). */
  async goto(query = ""): Promise<void> {
    await this.page.goto(`${this.locale}/admin/users${query}`);
  }

  /** Opens the list narrowed to one address, so its row is on screen. */
  async gotoRow(email: string): Promise<void> {
    await this.goto(`?search=${encodeURIComponent(email)}`);
  }

  // ── toolbar ─────────────────────────────────────────────────────────────

  /**
   * The list's own search box. The app header renders a GLOBAL search too
   * ("Open search"), so this is scoped to the toolbar's role="search" landmark.
   */
  searchInput(): Locator {
    return this.page.getByRole("search").getByRole("textbox");
  }

  /** The Filters popover trigger; default name matches any "Filters…" label. */
  filtersButton(name: string | RegExp = /Filters/i): Locator {
    return this.page.getByRole("button", { name });
  }

  /** The opened Filters panel (shadcn popover content). */
  filtersPanel(): Locator {
    return this.page.locator('[data-slot="popover-content"]');
  }

  /** The "Filters" heading inside the opened panel (the trigger is the first match). */
  filtersPanelHeading(): Locator {
    return this.page.getByText(this.t.list.filters).nth(1);
  }

  /** The Role select — the first combobox of the Filters panel. */
  roleSelect(): Locator {
    return this.filtersPanel().getByRole("combobox").first();
  }

  option(name: string): Locator {
    return this.page.getByRole("option", { name });
  }

  async filterByRole(roleLabel: string): Promise<void> {
    await this.filtersButton().click();
    await this.roleSelect().click();
    await this.option(roleLabel).click();
  }

  // ── table ───────────────────────────────────────────────────────────────

  table(): Locator {
    return this.page.getByRole("table");
  }

  rows(): Locator {
    return this.page.getByRole("row");
  }

  /** First data row of the table (row 0 is the header). */
  firstDataRow(): Locator {
    return this.rows().nth(1);
  }

  /** The table row of one account. */
  row(email: string): Locator {
    return this.rows().filter({ hasText: email });
  }

  /** An account's email anywhere on the page, matched exactly. */
  email(email: string): Locator {
    return this.page.getByText(email, { exact: true });
  }

  /** A label (badge, "Never"…) inside one account's row, matched exactly. */
  rowText(email: string, text: string): Locator {
    return this.row(email).getByText(text, { exact: true });
  }

  /** A cell of one account's row by its accessible name. */
  rowCell(email: string, name: string): Locator {
    return this.row(email).getByRole("cell", { name, exact: true });
  }

  columnHeader(name: string): Locator {
    return this.page.getByRole("columnheader", { name, exact: true });
  }

  /** The skeleton rows shown while the list loads (shadcn Skeleton). */
  skeleton(): Locator {
    return this.page.locator(".animate-pulse");
  }

  /** "No users match" — the empty state when search / filters exclude everyone. */
  noMatch(): Locator {
    return this.page.getByText(this.t.adminUsers.table.empty);
  }

  /** "Nothing here yet" — the empty state with no filters at all. */
  nothingYet(): Locator {
    return this.page.getByText(this.t.list.emptyTitle);
  }

  clearFiltersButton(): Locator {
    return this.page.getByRole("button", { name: this.t.list.clearFilters });
  }

  /** "Could not load users…" — the load-error state. */
  loadError(): Locator {
    return this.page.getByText(this.t.adminUsers.table.error);
  }

  /** The screen-reader live region (useAnnounce). */
  announcer(): Locator {
    return this.page.locator("#announcer");
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

  // ── row menu ────────────────────────────────────────────────────────────

  rowMenuButton(email: string): Locator {
    return this.row(email).getByRole("button", {
      name: this.t.adminUsers.table.rowMenuLabel
    });
  }

  async openRowMenu(email: string): Promise<void> {
    await this.rowMenuButton(email).click();
  }

  lockItem(): Locator {
    return this.page.getByRole("menuitem", {
      name: this.t.adminUsers.actions.lock
    });
  }

  unlockItem(): Locator {
    return this.page.getByRole("menuitem", {
      name: this.t.adminUsers.actions.unlock
    });
  }

  resetItem(): Locator {
    return this.page.getByRole("menuitem", {
      name: this.t.adminUsers.actions.resetPassword
    });
  }

  /** Any dialog on the page; with a name, the one titled so. */
  dialog(name?: string): Locator {
    return name
      ? this.page.getByRole("dialog", { name })
      : this.page.getByRole("dialog");
  }

  /** Row menu → Lock account (opens the lock dialog). */
  async startLock(email: string): Promise<void> {
    await this.openRowMenu(email);
    await this.lockItem().click();
  }

  /** Row menu → Unlock account (opens the unlock dialog). */
  async startUnlock(email: string): Promise<void> {
    await this.openRowMenu(email);
    await this.unlockItem().click();
  }

  /** Row menu → Reset password (opens the reset dialog). */
  async startReset(email: string): Promise<void> {
    await this.openRowMenu(email);
    await this.resetItem().click();
  }
}

/** Lock / unlock confirmation — mains/AdminUsersLockDialog. */
export class AdminUserLockDialog {
  constructor(
    private readonly page: Page,
    private readonly t: AdminUsersCopy
  ) {}

  lockTitle(name: string): string {
    return fill(this.t.adminUsers.lockDialog.lockTitle, { name });
  }

  unlockTitle(name: string): string {
    return fill(this.t.adminUsers.lockDialog.unlockTitle, { name });
  }

  /**
   * The confirm button. `.last()`: while the row menu is still closing its
   * "Lock account" item can match too; the dialog's button renders last.
   */
  confirmLockButton(): Locator {
    return this.page
      .getByRole("button", { name: this.t.adminUsers.actions.confirmLock })
      .last();
  }

  confirmUnlockButton(): Locator {
    return this.page
      .getByRole("button", { name: this.t.adminUsers.actions.confirmUnlock })
      .last();
  }

  cancelButton(): Locator {
    return this.page.getByRole("button", {
      name: this.t.adminUsers.actions.cancel
    });
  }
}

/** Reset-password confirmation — mains/AdminUsersResetPasswordDialog. */
export class AdminUserResetDialog {
  constructor(
    private readonly page: Page,
    private readonly t: AdminUsersCopy
  ) {}

  title(name: string): string {
    return fill(this.t.adminUsers.resetDialog.title, { name });
  }

  description(email: string): string {
    return fill(this.t.adminUsers.resetDialog.description, { email });
  }

  sendButton(): Locator {
    return this.page.getByRole("button", {
      name: this.t.adminUsers.actions.confirmReset
    });
  }

  cancelButton(): Locator {
    return this.page.getByRole("button", {
      name: this.t.adminUsers.actions.cancel
    });
  }
}
