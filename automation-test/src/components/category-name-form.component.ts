import type { Locator, Page } from "@playwright/test";
import { copy } from "@/data/copy";

// The two category name fields and the slug preview —
// client/src/components/CategoryNameField + CategorySlugPreview. Rendered by
// the create / edit sheet on /admin/categories and by the quick-create dialog
// of the app sheet's category picker (/admin/apps). Labels come from
// adminCategories.form.fields; a Vietnamese page passes `copyVi`.

export type CategoryNameCopy = Pick<typeof copy, "adminCategories">;

export class CategoryNameForm {
  constructor(
    private readonly page: Page,
    private readonly t: CategoryNameCopy = copy
  ) {}

  private get fields() {
    return this.t.adminCategories.form.fields;
  }

  enInput(): Locator {
    return this.page.getByRole("textbox", { name: this.fields.nameEn.label });
  }

  viInput(): Locator {
    return this.page.getByRole("textbox", { name: this.fields.nameVi.label });
  }

  /**
   * The slug preview box (aria-labelledby its "Slug" label). The markup gives
   * it no role, so the id reference is the hook.
   */
  slugPreview(): Locator {
    return this.page
      .getByRole("dialog")
      .locator('[aria-labelledby="category-slug-label"]');
  }

  /**
   * The struck-through current slug the preview shows while an edit would
   * change it (`old → new`). Only its strike-through style tells it apart.
   */
  oldSlug(): Locator {
    return this.slugPreview().locator(".line-through");
  }

  async fillNames(en: string, vi: string): Promise<void> {
    await this.enInput().fill(en);
    await this.viInput().fill(vi);
  }
}
