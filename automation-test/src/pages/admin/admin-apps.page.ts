import type { Locator, Page } from "@playwright/test";
import { Announcer } from "@/components/announcer.component";
import { CategoryNameForm } from "@/components/category-name-form.component";
import { copy, fill } from "@/data/copy";
import { BasePage } from "../base.page";

// App registry — /admin/apps, client/src/views/AdminApps: the unified list
// shell (PageToolbar search + Filters popover, CustomTable with client-side
// sort, PageContent empty states), the row menu, and the dialogs it opens:
// the register / edit sheet (mains/AdminAppsFormSheet), the hide confirmation
// (mains/AdminAppsHideDialog) and the one-time credentials dialog
// (mains/AdminAppsSecretDialog).
//
// Text comes from the catalogues the page renders: adminApps.json, the shared
// list.json and common.json (sort labels). A Vietnamese page is
// `new AdminAppsPage(page, copyVi, "/vi")`.

/** The catalogues this screen reads: `copy` (en) or `copyVi`. */
export type AdminAppsCopy = Pick<typeof copy, "adminApps" | "list" | "common">;

const escapeRegExp = (text: string) =>
  text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export class AdminAppsPage extends BasePage {
  readonly sheet: AdminAppFormSheet;
  readonly hideDialog: AdminAppHideDialog;
  readonly secretDialog: AdminAppSecretDialog;
  /** The shared `#announcer` live region. */
  readonly announcer: Announcer;

  constructor(
    page: Page,
    private readonly t: AdminAppsCopy = copy,
    /** Locale prefix of the URL: "" (en, as-needed) or "/vi". */
    private readonly locale = ""
  ) {
    super(page);
    this.sheet = new AdminAppFormSheet(page, t);
    this.hideDialog = new AdminAppHideDialog(page, t);
    this.secretDialog = new AdminAppSecretDialog(page, t);
    this.announcer = new Announcer(page);
  }

  /** `query` is the raw query string, with its leading "?" (or ""). */
  async goto(query = ""): Promise<void> {
    await this.page.goto(`${this.locale}/admin/apps${query}`);
  }

  heading(): Locator {
    return this.page.getByRole("heading", { name: this.t.adminApps.title });
  }

  /** Text anywhere on the page — for messages and "never shows X" checks. */
  text(text: string | RegExp, options?: { exact?: boolean }): Locator {
    return this.page.getByText(text, options);
  }

  // ── toolbar ─────────────────────────────────────────────────────────────

  /** The toolbar's role="search" landmark (the header has a global search too). */
  searchLandmark(): Locator {
    return this.page.getByRole("search");
  }

  searchInput(): Locator {
    return this.searchLandmark().getByRole("textbox");
  }

  /** The Filters trigger; with `count`, only while its badge shows that number. */
  filtersButton(count?: number): Locator {
    const filters = escapeRegExp(this.t.list.filters);
    return this.page.getByRole("button", {
      name: new RegExp(
        count === undefined ? `^${filters}` : `^${filters}\\s*${count}$`
      )
    });
  }

  /** The opened Filters panel (shadcn popover content). */
  filtersPanel(): Locator {
    return this.page.locator('[data-slot="popover-content"]');
  }

  /** Opens the Filters popover and waits for its panel. */
  async openFilters(): Promise<void> {
    await this.filtersButton().click();
    await this.filtersPanel().waitFor({ state: "visible" });
  }

  /** A select of the panel: 0 = Status, 1 = Category (dataSources/AdminApps). */
  filterSelect(index: 0 | 1): Locator {
    return this.filtersPanel().getByRole("combobox").nth(index);
  }

  /** A label inside the panel ("Status", "Category"), matched exactly. */
  filterLabel(text: string): Locator {
    return this.filtersPanel().getByText(text, { exact: true });
  }

  option(name: string): Locator {
    return this.page.getByRole("option", { name, exact: true });
  }

  /** Filters → select `index` → `option`, then closes the popover. */
  async pickFilter(index: 0 | 1, option: string): Promise<void> {
    await this.openFilters();
    await this.filterSelect(index).click();
    await this.option(option).click();
    await this.page.keyboard.press("Escape");
  }

  clearAllButton(): Locator {
    return this.filtersPanel().getByRole("button", {
      name: this.t.list.clearAll
    });
  }

  /** "Clear filters" — the empty state's action when filters / search are on. */
  clearFiltersButton(): Locator {
    return this.page.getByRole("button", { name: this.t.list.clearFilters });
  }

  // ── table ───────────────────────────────────────────────────────────────

  registerButton(): Locator {
    return this.page.getByRole("button", {
      name: this.t.adminApps.actions.create
    });
  }

  /** The register sheet: clicks "Register App" and waits for its title. */
  async openRegister(): Promise<void> {
    await this.registerButton().click();
    await this.sheet
      .heading(this.t.adminApps.form.createTitle)
      .waitFor({ state: "visible" });
  }

  tbody(): Locator {
    return this.page.locator("tbody");
  }

  /** Text anywhere in the table body — for "never shows X" checks. */
  tableText(text: string | RegExp): Locator {
    return this.tbody().getByText(text);
  }

  tableRows(): Locator {
    return this.page.locator("tbody tr");
  }

  /** The display name in the App column of every row, in table order. */
  appNames(): Locator {
    return this.page.locator("tbody tr td:first-child span.font-medium");
  }

  /** The row of one app, by (part of) its accessible name. */
  row(name: string | RegExp): Locator {
    return this.page.getByRole("row", { name });
  }

  /** Text inside one app's row. */
  rowText(
    name: string | RegExp,
    text: string | RegExp,
    options?: { exact?: boolean }
  ): Locator {
    return this.row(name).getByText(text, options);
  }

  /**
   * A category label in one app's row. CategoryChips renders a hidden
   * measuring copy as well — take the first visible one.
   */
  rowCategory(name: string | RegExp, label: string): Locator {
    return this.row(name).getByText(label).filter({ visible: true }).first();
  }

  /** Every row whose text contains `text` (e.g. a status label). */
  rowsWithText(text: string): Locator {
    return this.page.getByRole("row").filter({ hasText: text });
  }

  columnHeader(name: string): Locator {
    return this.page.getByRole("columnheader", { name });
  }

  /** "Sort by <column>" — the header's sort button. */
  sortButton(column: string): Locator {
    return this.page.getByRole("button", {
      name: fill(this.t.common.table.sortBy, { column })
    });
  }

  /** Every "Sort by …" button, whatever the column (case-insensitive). */
  sortButtons(): Locator {
    const prefix = this.t.common.table.sortBy.split("{")[0].trim();
    return this.page.getByRole("button", {
      name: new RegExp(escapeRegExp(prefix), "i")
    });
  }

  /** The column header holding a column's sort button (carries aria-sort). */
  sortableHeader(column: string): Locator {
    return this.page
      .getByRole("columnheader")
      .filter({ has: this.sortButton(column) });
  }

  /** Headers currently sorted either way — at most one at a time. */
  sortedHeaders(): Locator {
    return this.page.locator(
      'th[aria-sort="ascending"], th[aria-sort="descending"]'
    );
  }

  // ── row menu ────────────────────────────────────────────────────────────

  /** One app's "App actions" trigger. */
  rowMenuButton(name: string | RegExp): Locator {
    return this.row(name).getByRole("button", {
      name: this.t.adminApps.actions.rowMenuLabel
    });
  }

  /** The "App actions" trigger of the first row whose text contains `text`. */
  firstRowMenuButton(text: string): Locator {
    return this.rowsWithText(text)
      .first()
      .getByRole("button", { name: this.t.adminApps.actions.rowMenuLabel });
  }

  /** Any open dialog (sheet, confirmation or credentials). */
  dialog(): Locator {
    return this.page.getByRole("dialog");
  }

  /** "App actions" triggers anywhere — none render when the list is empty. */
  rowMenuButtons(): Locator {
    return this.page.getByRole("button", {
      name: this.t.adminApps.actions.rowMenuLabel
    });
  }

  menuItem(name: string, options?: { exact?: boolean }): Locator {
    return this.page.getByRole("menuitem", { name, ...options });
  }

  editItem(): Locator {
    return this.menuItem(this.t.adminApps.actions.edit);
  }

  hideItem(): Locator {
    return this.menuItem(this.t.adminApps.actions.hide, { exact: true });
  }

  unhideItem(): Locator {
    return this.menuItem(this.t.adminApps.actions.unhide);
  }

  /** Row menu → Edit, then waits for the sheet's Display Name field. */
  async openEdit(name: string | RegExp): Promise<void> {
    await this.rowMenuButton(name).click();
    await this.editItem().click();
    await this.sheet.displayNameInput().waitFor({ state: "visible" });
  }

  /** Row menu → Hide (opens the confirmation). */
  async startHide(name: string | RegExp): Promise<void> {
    await this.rowMenuButton(name).click();
    await this.hideItem().click();
  }

  /** Row menu → Unhide (no confirmation: the mutation fires at once). */
  async unhide(name: string | RegExp): Promise<void> {
    await this.rowMenuButton(name).click();
    await this.unhideItem().click();
  }
}

/** Register / edit sheet — mains/AdminAppsFormSheet + components/AppFormFields. */
export class AdminAppFormSheet {
  /** The picker's quick-create dialog (views/AdminApps/components/QuickCreateCategoryDialog). */
  readonly quickCreate: QuickCreateCategoryDialog;

  constructor(
    private readonly page: Page,
    private readonly t: AdminAppsCopy
  ) {
    this.quickCreate = new QuickCreateCategoryDialog(page);
  }

  private get fields() {
    return this.t.adminApps.form.fields;
  }

  /** The open sheet (a dialog). */
  root(): Locator {
    return this.page.getByRole("dialog");
  }

  /** The sheet labelled by its title ("Edit App", "Register New App"). */
  labelled(title: string): Locator {
    return this.page.getByLabel(title);
  }

  heading(title: string): Locator {
    return this.page.getByRole("heading", { name: title });
  }

  /**
   * Text inside the sheet labelled `title` — an inline field error, kept
   * apart from a toast that may carry the same words.
   */
  textIn(title: string, text: string | RegExp): Locator {
    return this.labelled(title).getByText(text);
  }

  /** Text inside the sheet (inline field errors). */
  text(text: string | RegExp): Locator {
    return this.root().getByText(text);
  }

  /** Name — its accessible name carries the required "*"; exact avoids "Display Name *". */
  nameInput(): Locator {
    return this.page.getByRole("textbox", {
      name: `${this.fields.name.label} *`,
      exact: true
    });
  }

  displayNameInput(): Locator {
    return this.page.getByRole("textbox", {
      name: this.fields.displayName.label
    });
  }

  descriptionInput(): Locator {
    return this.page.getByRole("textbox", {
      name: this.fields.description.label
    });
  }

  iconUrlInput(): Locator {
    return this.page.getByRole("textbox", { name: this.fields.iconUrl.label });
  }

  homeUrlInput(): Locator {
    return this.page.getByRole("textbox", { name: this.fields.homeUrl.label });
  }

  /** The category picker trigger ("Categories: …"). */
  categoriesPicker(): Locator {
    return this.page.getByRole("combobox", {
      name: new RegExp(`^${escapeRegExp(this.fields.categoryIds.label)}:`)
    });
  }

  /** A picker option whose name contains `category`. */
  categoryOption(category: string): Locator {
    return this.page.getByRole("option", {
      name: new RegExp(escapeRegExp(category))
    });
  }

  /** The first option of the opened picker. */
  firstCategoryOption(): Locator {
    return this.page.getByRole("option").first();
  }

  /** Opens the picker, ticks each category in order, closes it. */
  async pickCategories(categories: string[]): Promise<void> {
    await this.categoriesPicker().click();
    for (const category of categories) {
      await this.categoryOption(category).click();
    }
    await this.page.keyboard.press("Escape");
  }

  /** The chips of the chosen categories, in order (first = Primary). */
  categoriesList(): Locator {
    return this.root().getByRole("list", {
      name: this.fields.categoryIds.label
    });
  }

  /** Every option of the opened picker, in list order. */
  categoryOptions(): Locator {
    return this.page.getByRole("option");
  }

  /** The search box inside the opened picker. */
  categorySearchInput(): Locator {
    return this.page.getByRole("textbox", {
      name: this.fields.categoryIds.searchPlaceholder
    });
  }

  /** "Remove <name>" on a chosen category's chip. */
  removeCategoryButton(name: string): Locator {
    return this.page.getByRole("button", {
      name: fill(this.fields.categoryIds.remove, { name })
    });
  }

  /** The picker's quick-create button(s): "Create category" (substring match). */
  createCategoryButtons(): Locator {
    return this.page.getByRole("button", {
      name: this.fields.categoryIds.create
    });
  }

  /** `Create category "<name>"` — offered when the search matches nothing exactly. */
  createNamedCategoryButton(name: string): Locator {
    return this.page.getByRole("button", {
      name: fill(this.fields.categoryIds.createNamed, { name })
    });
  }

  /** The redirect URI draft input (its aria-label is the placeholder). */
  redirectUriDraft(): Locator {
    return this.page.getByRole("textbox", {
      name: this.fields.redirectUris.placeholder
    });
  }

  addUriButton(): Locator {
    return this.page.getByRole("button", {
      name: this.t.adminApps.actions.addUri
    });
  }

  /** Types a redirect URI into the draft and adds it as a pill. */
  async addRedirectUri(uri: string): Promise<void> {
    await this.redirectUriDraft().fill(uri);
    await this.addUriButton().click();
  }

  removeUriButton(uri: string): Locator {
    return this.page.getByRole("button", {
      name: `${this.t.adminApps.actions.removeUri}: ${uri}`
    });
  }

  /** Every pill's remove button — one per redirect URI. */
  removeUriButtons(): Locator {
    return this.page.getByRole("button", {
      name: new RegExp(`^${escapeRegExp(this.t.adminApps.actions.removeUri)}:`)
    });
  }

  /** The Active switch — the only switch in the sheet. */
  statusSwitch(): Locator {
    return this.root().getByRole("switch");
  }

  roleCheckbox(label: string): Locator {
    return this.root().getByRole("checkbox", { name: label });
  }

  authMethodSelect(): Locator {
    return this.page.getByRole("combobox", {
      name: new RegExp(escapeRegExp(this.fields.tokenEndpointAuthMethod.label))
    });
  }

  authMethodOption(name: string): Locator {
    return this.page.getByRole("option", { name });
  }

  registerButton(): Locator {
    return this.page.getByRole("button", {
      name: this.t.adminApps.actions.createSubmit,
      exact: true
    });
  }

  saveButton(): Locator {
    return this.page.getByRole("button", {
      name: this.t.adminApps.actions.updateSubmit
    });
  }

  cancelButton(): Locator {
    return this.page.getByRole("button", {
      name: this.t.adminApps.actions.cancel
    });
  }
}

/** Hide confirmation — mains/AdminAppsHideDialog. */
export class AdminAppHideDialog {
  constructor(
    private readonly page: Page,
    private readonly t: AdminAppsCopy
  ) {}

  /** The confirmation, whichever role the dialog primitive gives it. */
  root(): Locator {
    return this.page.getByRole("alertdialog").or(this.page.getByRole("dialog"));
  }

  title(name: string): string {
    return fill(this.t.adminApps.hide.title, { name });
  }

  /** The "Hide <name>?" question inside the confirmation. */
  question(name: string): Locator {
    return this.root().getByText(this.title(name));
  }

  confirmButton(): Locator {
    return this.page.getByRole("button", {
      name: this.t.adminApps.actions.confirmHide
    });
  }

  cancelButton(): Locator {
    return this.root().getByRole("button", {
      name: this.t.adminApps.actions.cancel
    });
  }
}

/** One-time credentials — mains/AdminAppsSecretDialog + components/SecretField. */
export class AdminAppSecretDialog {
  constructor(
    private readonly page: Page,
    private readonly t: AdminAppsCopy
  ) {}

  root(): Locator {
    return this.page.getByRole("dialog", {
      name: this.t.adminApps.secretDialog.title
    });
  }

  text(text: string | RegExp, options?: { exact?: boolean }): Locator {
    return this.root().getByText(text, options);
  }

  /** The Client ID value: `client_` + 12 hex. */
  clientIdValue(): Locator {
    return this.root().getByText(/^client_[0-9a-f]{12}$/);
  }

  /** The Client Secret value: 64 hex. */
  secretValue(): Locator {
    return this.root()
      .getByText(/^[0-9a-f]{64}$/)
      .first();
  }

  copyButtons(): Locator {
    return this.root().getByRole("button", {
      name: this.t.adminApps.actions.copy
    });
  }

  /**
   * The Copy button of the SecretField showing `value`. Both fields' buttons
   * are named "Copy", and once one flips to "Copied" a name-based `.first()`
   * re-resolves to the other — anchoring on the field's value text stays
   * stable across the label flip. The class is SecretField's wrapper; the
   * markup offers nothing better.
   */
  copyButtonFor(value: string): Locator {
    return this.root()
      .locator("div.space-y-1\\.5", { hasText: value })
      .getByRole("button");
  }

  doneButton(): Locator {
    return this.root().getByRole("button", {
      name: this.t.adminApps.secretDialog.done
    });
  }
}

/**
 * Quick create from the category picker — the shared category name fields
 * (adminCategories catalogue) in a dialog over the app sheet.
 */
export class QuickCreateCategoryDialog {
  readonly form: CategoryNameForm;

  constructor(
    private readonly page: Page,
    private readonly t: Pick<typeof copy, "adminCategories"> = copy
  ) {
    this.form = new CategoryNameForm(page, t);
  }

  /** "Create and select". */
  submitButton(): Locator {
    return this.page.getByRole("button", {
      name: this.t.adminCategories.quickCreate.submit
    });
  }

  /** Its Cancel — the last "Cancel" on the page (the app sheet has one too). */
  cancelButton(): Locator {
    return this.page
      .getByRole("button", { name: this.t.adminCategories.actions.cancel })
      .last();
  }
}
