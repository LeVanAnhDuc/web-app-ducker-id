import type { Locator, Page } from "@playwright/test";
import { copy } from "@/data/copy";

// The app search in the header of every signed-in screen —
// client/src/layouts/AppHeader/components/HeaderSearch. SearchInput forwards
// role="combobox" + aria-* to the <input>; the popover holds a role="listbox"
// whose rows are role="option" ("Open <name>"). Empty query → "Suggested
// apps" (5 apps); a query → debounced 300 ms search, "Apps" or the empty state;
// "View All" when the total exceeds the 5 rows shown. Labels come from
// `dashboard.header` — pass copyVi for /vi.
export class HeaderSearch {
  /** useDebouncedValue(query.trim(), 300) in HeaderSearch. */
  static readonly DEBOUNCE_MS = 300;

  constructor(
    private readonly page: Page,
    private readonly t: Pick<typeof copy, "dashboard"> = copy
  ) {}

  input(): Locator {
    return this.page.getByRole("combobox");
  }

  listbox(): Locator {
    return this.page.getByRole("listbox");
  }

  options(): Locator {
    return this.page.getByRole("option");
  }

  option(name: string | RegExp): Locator {
    return this.page.getByRole("option", { name });
  }

  /** Exact text inside the popover list (section label, empty state). */
  inList(text: string): Locator {
    return this.listbox().getByText(text, { exact: true });
  }

  suggestedLabel(): Locator {
    return this.inList(this.t.dashboard.header.suggestedLabel);
  }

  resultsLabel(): Locator {
    return this.inList(this.t.dashboard.header.resultsLabel);
  }

  noResults(): Locator {
    return this.inList(this.t.dashboard.header.noResults);
  }

  noResultsHint(): Locator {
    return this.inList(this.t.dashboard.header.noResultsHint);
  }

  viewAllButton(): Locator {
    return this.page.getByRole("button", {
      name: this.t.dashboard.header.viewAll
    });
  }

  /**
   * Click / focus opens the popover. The suggested list may come from the
   * React Query cache, so readiness is the rendered rows, not a response.
   */
  async open(): Promise<void> {
    await this.input().click();
    await this.listbox().waitFor();
    await this.options().first().waitFor();
  }

  /** Resolves after the browser painted two more frames (nothing pending). */
  async afterNextPaint(): Promise<void> {
    await this.page.evaluate(
      () =>
        new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
        )
    );
  }
}
