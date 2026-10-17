import {
  expect,
  type Locator,
  type Page,
  type Response
} from "@playwright/test";
import { copy, fill } from "@/data/copy";
import { BasePage } from "../base.page";

// Admin app access — /admin/entitlements, client/src/views/AdminEntitlements:
// the user picker (UserMultiSelect: search combobox + results listbox, the
// Filters popover with its role select, the selected-user chips) and the
// user × app matrix (EntitlementMatrixToolbar / Table / Cell, OverrideMarker).
// Screen-reader announcements land in the shared `#announcer` live region.
//
// Text comes from adminEntitlements.json. A Vietnamese page is
// `new AdminEntitlementsPage(page, copyVi, "/vi")`.

/** The catalogues this screen reads: `copy` (en) or `copyVi`. */
export type AdminEntitlementsCopy = Pick<typeof copy, "adminEntitlements">;

/** The picker search's accessible name in either locale. */
const PICKER_SEARCH = /Search users|Tìm người dùng/i;

export class AdminEntitlementsPage extends BasePage {
  constructor(
    page: Page,
    private readonly t: AdminEntitlementsCopy = copy,
    /** Locale prefix of the URL: "" (en, as-needed) or "/vi". */
    private readonly locale = ""
  ) {
    super(page);
  }

  private get c() {
    return this.t.adminEntitlements;
  }

  async goto(): Promise<void> {
    await this.page.goto(`${this.locale}/admin/entitlements`);
  }

  heading(): Locator {
    return this.page.getByRole("heading", { name: this.c.title });
  }

  /** Any text of the page — for "this never shows" / "no raw value leaks" checks. */
  text(text: string, { exact = false }: { exact?: boolean } = {}): Locator {
    return this.page.getByText(text, { exact });
  }

  /** An untranslated next-intl key of this screen, `[adminEntitlements.…]`. */
  rawKeys(pattern: RegExp = /\[?adminEntitlements\./): Locator {
    return this.page.getByText(pattern);
  }

  /** `#announcer` — the live region the page announces into. */
  announcer(): Locator {
    return this.page.locator("#announcer");
  }

  tooltip(): Locator {
    return this.page.getByRole("tooltip");
  }

  // ── picker ──────────────────────────────────────────────────────────────

  /**
   * The picker's search combobox. The page renders a GLOBAL header search too;
   * the picker's is told apart by its accessible name (picker.searchPlaceholder).
   */
  pickerSearch(name: string | RegExp = PICKER_SEARCH): Locator {
    return this.page.getByRole("combobox", { name });
  }

  /** The Filters popover trigger; default name matches any "Filters…" label. */
  filtersButton(name: string | RegExp = /Filters/i): Locator {
    return this.page.getByRole("button", { name });
  }

  /** The opened Filters panel (shadcn popover content). */
  filtersPanel(): Locator {
    return this.page.locator('[data-slot="popover-content"]');
  }

  /** The results dropdown (role=listbox). */
  results(): Locator {
    return this.page.getByRole("listbox");
  }

  options(): Locator {
    return this.page.getByRole("option");
  }

  /** The result row whose text contains `text` (an email, a name). */
  option(text: string): Locator {
    return this.options().filter({ hasText: text });
  }

  noResults(): Locator {
    return this.page.getByText(this.c.picker.noResults);
  }

  /** "Showing {shown} of {total} — refine your search". */
  refineHint(shown: number, total: number): Locator {
    return this.page.getByText(fill(this.c.picker.showing, { shown, total }));
  }

  /** A selected user's chip control; with no name, any chip. */
  removeChipButton(name?: string): Locator {
    return name === undefined
      ? this.page.getByRole("button", { name: /^Remove /i })
      : this.page.getByRole("button", {
          name: fill(this.c.picker.removeUser, { name })
        });
  }

  /** "No users selected" — the prompt before anyone is picked. */
  noUsersSelected(): Locator {
    return this.page.getByText(this.c.emptyUser.title);
  }

  /** A `<b>` element containing `text` — proves markup was not rendered. */
  boldText(text: string): Locator {
    return this.page.locator("b", { hasText: text });
  }

  /** Filters → Role → `roleLabel` ("Admin", "User"), then closes the popover. */
  async filterByRole(roleLabel: string): Promise<void> {
    await this.filtersButton().click();
    await this.filtersPanel().getByRole("combobox").click();
    await this.page
      .getByRole("option", { name: roleLabel, exact: true })
      .click();
    await this.page.keyboard.press("Escape");
  }

  /**
   * Types `query` and waits for the /admin/users response that carries it —
   * the picker debounces, so an assertion made earlier could read the
   * previous query's results.
   */
  async search(query: string): Promise<Response> {
    const response = this.page.waitForResponse((res) => {
      const url = new URL(res.url());
      return (
        url.pathname.endsWith("/admin/users") &&
        url.searchParams.get("search") === query
      );
    });
    await this.pickerSearch().fill(query);
    return response;
  }

  /**
   * Picks the user listed under `email`. The multi-select keeps its results
   * open after a pick (to allow picking more); Escape dismisses them so they
   * do not overlay the matrix and intercept pointer events.
   */
  async selectUser(email: string): Promise<void> {
    await this.pickerSearch().fill(email);
    await this.option(email).first().click();
    await this.page.keyboard.press("Escape");
    await expect(this.results()).toHaveCount(0);
  }

  /** Opens the page and picks `email`; ready once the matrix's Edit is there. */
  async openMatrix(email: string): Promise<void> {
    await this.goto();
    await this.selectUser(email);
    await expect(this.editButton()).toBeVisible();
  }

  // ── matrix ──────────────────────────────────────────────────────────────

  editButton(name: string | RegExp = this.c.matrix.edit): Locator {
    return this.page.getByRole("button", { name });
  }

  saveButton(): Locator {
    return this.page.getByRole("button", { name: this.c.matrix.save });
  }

  cancelButton(): Locator {
    return this.page.getByRole("button", { name: this.c.matrix.cancel });
  }

  grantAllButton(): Locator {
    return this.page.getByRole("button", { name: this.c.matrix.checkAll });
  }

  revokeAllButton(): Locator {
    return this.page.getByRole("button", { name: this.c.matrix.uncheckAll });
  }

  checkboxes(): Locator {
    return this.page.getByRole("checkbox");
  }

  /** The edit-mode checkbox "Grant {app} to {user}". */
  cell(app: string, user: string): Locator {
    return this.page.getByRole("checkbox", {
      name: fill(this.c.cell.grantAria, { app, user })
    });
  }

  /** An app column title. */
  appColumn(app: string): Locator {
    return this.page.getByText(app, { exact: true });
  }

  userColumnHeader(): Locator {
    return this.page.getByRole("columnheader", {
      name: this.c.matrix.userColumn,
      exact: true
    });
  }

  /** Row headers — one per selected user; `name` narrows to one. */
  rowHeaders(name?: string): Locator {
    return name === undefined
      ? this.page.getByRole("rowheader")
      : this.page.getByRole("rowheader", { name: new RegExp(name) });
  }

  /** A status icon or exception marker by its exact accessible name. */
  private img(name: string): Locator {
    return this.page.getByRole("img", { name, exact: true });
  }

  /** "Granted" cells (read mode). */
  grantedIcons(): Locator {
    return this.img(this.c.cell.granted);
  }

  /** "Not granted" cells (read mode). */
  notGrantedIcons(): Locator {
    return this.img(this.c.cell.notGranted);
  }

  /** Markers "Exception — revoked despite the role". */
  revokedMarkers(): Locator {
    return this.img(this.c.cell.overrideRevoked);
  }

  /** Markers "Exception — granted beyond the role". */
  grantedMarkers(): Locator {
    return this.img(this.c.cell.overrideGranted);
  }

  noAppsTitle(): Locator {
    return this.page.getByText(this.c.matrix.empty.title);
  }

  noAppsDescription(): Locator {
    return this.page.getByText(this.c.matrix.empty.description);
  }
}
