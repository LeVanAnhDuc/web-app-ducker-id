import type { Locator, Page } from "@playwright/test";
import { AdminSidebar } from "@/components/admin-sidebar.component";
import { Announcer } from "@/components/announcer.component";
import { CategoryNameForm } from "@/components/category-name-form.component";
import { copy, fill } from "@/data/copy";
import { BasePage } from "../base.page";

// Categories — /admin/categories, client/src/views/AdminCategories: the
// ordered table (MoveButtons ↑ / ↓, CategoryRowActions edit / delete), the
// create / edit sheet (mains/CategoryFormSheet) and the delete dialog with its
// reassignment panel (mains/DeleteCategoryDialog, components/ReassignPanel).
//
// Text comes from adminCategories.json. A Vietnamese page is
// `new AdminCategoriesPage(page, copyVi, "/vi")`.

/** The catalogue this screen reads: `copy` (en) or `copyVi`. */
export type AdminCategoriesCopy = Pick<typeof copy, "adminCategories">;

const escapeRegExp = (text: string) =>
  text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export class AdminCategoriesPage extends BasePage {
  readonly sheet: CategoryFormSheet;
  readonly deleteDialog: DeleteCategoryDialog;
  readonly sidebar: AdminSidebar;
  /** The shared `#announcer` live region. */
  readonly announcer: Announcer;

  constructor(
    page: Page,
    private readonly t: AdminCategoriesCopy = copy,
    /** Locale prefix of the URL: "" (en, as-needed) or "/vi". */
    private readonly locale = ""
  ) {
    super(page);
    this.sheet = new CategoryFormSheet(page, t);
    this.deleteDialog = new DeleteCategoryDialog(page, t);
    this.sidebar = new AdminSidebar(page);
    this.announcer = new Announcer(page);
  }

  private get a() {
    return this.t.adminCategories.actions;
  }

  async goto(): Promise<void> {
    await this.page.goto(`${this.locale}/admin/categories`);
  }

  heading(): Locator {
    return this.page.getByRole("heading", {
      name: this.t.adminCategories.title
    });
  }

  /** Text anywhere on the page. */
  text(text: string | RegExp, options?: { exact?: boolean }): Locator {
    return this.page.getByText(text, options);
  }

  emptyTitle(): Locator {
    return this.page.getByText(this.t.adminCategories.empty.title);
  }

  /**
   * "New category" — the header button, plus the empty state's own when the
   * list is empty (`.first()` / `.last()`).
   */
  createButtons(): Locator {
    return this.page.getByRole("button", { name: this.a.create });
  }

  // ── table ───────────────────────────────────────────────────────────────

  /** Body rows (the ones with cells), in display order. */
  dataRows(): Locator {
    return this.page.getByRole("row").filter({ has: this.page.locator("td") });
  }

  /** Every row whose text contains `text` (a name or a slug). */
  row(text: string): Locator {
    return this.page.getByRole("row").filter({ hasText: text });
  }

  /** The Name cell (en / vi, in locale order) of a row. */
  rowNameCell(row: Locator): Locator {
    return row.getByRole("cell").nth(1);
  }

  /** The Name cell of the body row at `index`. */
  nameCell(index: number): Locator {
    return this.rowNameCell(this.dataRows().nth(index));
  }

  /** A button inside `row`, by its accessible name. */
  buttonIn(row: Locator, name: string): Locator {
    return row.getByRole("button", { name });
  }

  /** The cell of `row` whose whole name is `text` (e.g. the app count). */
  cell(row: Locator, text: string): Locator {
    return row.getByRole("cell", { name: text, exact: true });
  }

  /** `text` inside `row`, matched exactly (e.g. the slug). */
  exactText(row: Locator, text: string): Locator {
    return row.getByText(text, { exact: true });
  }

  moveUpButton(name: string): Locator {
    return this.page.getByRole("button", {
      name: fill(this.a.moveUp, { name })
    });
  }

  moveDownButton(name: string): Locator {
    return this.page.getByRole("button", {
      name: fill(this.a.moveDown, { name })
    });
  }

  /** Every "Move … up" button, whatever the category. */
  moveUpButtons(): Locator {
    const [before, after] = this.a.moveUp.split("{name}");
    return this.page.getByRole("button", {
      name: new RegExp(`^${escapeRegExp(before)}.+${escapeRegExp(after)}$`)
    });
  }

  editButton(name: string): Locator {
    return this.page.getByRole("button", { name: fill(this.a.edit, { name }) });
  }

  deleteButton(name: string): Locator {
    return this.page.getByRole("button", {
      name: fill(this.a.delete, { name })
    });
  }

  // ── actions ─────────────────────────────────────────────────────────────

  /** Opens the create sheet from the header and waits for it. */
  async openCreate(): Promise<void> {
    await this.createButtons().first().click();
    await this.sheet.root().waitFor({ state: "visible" });
  }

  /** Opens the edit sheet of one category. */
  async openEdit(name: string): Promise<void> {
    await this.editButton(name).click();
  }

  /** Opens the delete dialog of one category. */
  async openDelete(name: string): Promise<void> {
    await this.deleteButton(name).click();
  }
}

/** Create / edit sheet — mains/CategoryFormSheet. */
export class CategoryFormSheet {
  readonly form: CategoryNameForm;

  constructor(
    private readonly page: Page,
    private readonly t: AdminCategoriesCopy
  ) {
    this.form = new CategoryNameForm(page, t);
  }

  root(): Locator {
    return this.page.getByRole("dialog");
  }

  /** Text inside the sheet (field errors, the edit description). */
  text(text: string | RegExp): Locator {
    return this.root().getByText(text);
  }

  createSubmit(): Locator {
    return this.page.getByRole("button", {
      name: this.t.adminCategories.actions.createSubmit,
      exact: true
    });
  }

  saveButton(): Locator {
    return this.page.getByRole("button", {
      name: this.t.adminCategories.actions.updateSubmit,
      exact: true
    });
  }

  cancelButton(): Locator {
    return this.root().getByRole("button", {
      name: this.t.adminCategories.actions.cancel
    });
  }
}

/** Delete dialog + reassignment panel — mains/DeleteCategoryDialog. */
export class DeleteCategoryDialog {
  constructor(
    private readonly page: Page,
    private readonly t: AdminCategoriesCopy
  ) {}

  private get d() {
    return this.t.adminCategories.delete;
  }

  root(): Locator {
    return this.page.getByRole("dialog");
  }

  text(text: string | RegExp, options?: { exact?: boolean }): Locator {
    return this.root().getByText(text, options);
  }

  /** The impact skeleton while delete-impact loads (it carries aria-busy). */
  skeleton(): Locator {
    return this.root().locator('[aria-busy="true"]');
  }

  /** "Set individually" badges — one per row that overrides the shared target. */
  overrideBadges(): Locator {
    return this.root().getByText(this.d.override, { exact: true });
  }

  /** "Move all to" — the shared target. */
  bulkSelect(): Locator {
    return this.page.getByRole("combobox", { name: this.d.bulkLabel });
  }

  /** "New category for <app>" — one app's own target. */
  rowSelect(appName: string): Locator {
    return this.page.getByRole("combobox", {
      name: fill(this.d.rowLabel, { name: appName })
    });
  }

  /** An option of the open select, matched exactly. */
  option(name: string): Locator {
    return this.page.getByRole("option", { name, exact: true });
  }

  /** Options whose name contains `name` (for "is gone" checks). */
  optionsNamed(name: string): Locator {
    return this.page.getByRole("option", { name });
  }

  /** Opens `select` and picks `option`. */
  async pick(select: Locator, option: string): Promise<void> {
    await select.click();
    await this.option(option).click();
  }

  confirmButton(): Locator {
    return this.page.getByRole("button", {
      name: this.t.adminCategories.actions.confirmDelete
    });
  }

  cancelButton(): Locator {
    return this.page.getByRole("button", {
      name: this.t.adminCategories.actions.cancel
    });
  }

  retryButton(): Locator {
    return this.root().getByRole("button", {
      name: this.t.adminCategories.actions.retry
    });
  }

  understoodButton(): Locator {
    return this.root().getByRole("button", {
      name: this.t.adminCategories.actions.understood
    });
  }
}
