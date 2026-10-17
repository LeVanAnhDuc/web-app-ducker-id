import type { Locator, Page } from "@playwright/test";
import { copy } from "@/data/copy";

// An app tile — client/src/components/AppCard, rendered by /apps (and reused
// by other launcher screens): a level-3 title, the favourite heart, category
// chips, the description and an "Open <name>" button (aria-label
// `${apps.card.open} ${displayName}`). The icon box falls back to the first
// letter when the app has no iconUrl.
export class AppCard {
  constructor(
    private readonly page: Page,
    private readonly t: Pick<typeof copy, "apps"> = copy
  ) {}

  /** The tile title. `exact: false` matches a title containing `name`. */
  title(name: string, { exact = true }: { exact?: boolean } = {}): Locator {
    return this.page.getByRole("heading", { level: 3, name, exact });
  }

  /** Every tile title on the page — `.first()` is "some card rendered". */
  titles(): Locator {
    return this.page.getByRole("heading", { level: 3 });
  }

  openButton(name: string): Locator {
    return this.page.getByRole("button", {
      name: `${this.t.apps.card.open} ${name}`
    });
  }

  /** The whole tile whose heading names `name`. */
  card(name: string): Locator {
    return this.page
      .locator('[data-slot="card"]')
      .filter({ has: this.page.getByRole("heading", { name }) });
  }

  /** The first-letter fallback shown in the icon box of `name`'s tile. */
  initial(name: string, letter: string): Locator {
    return this.card(name).getByText(letter, { exact: true });
  }

  /** <img> elements inside `name`'s tile (the icon when iconUrl is set). */
  images(name: string): Locator {
    return this.card(name).locator("img");
  }

  async open(name: string): Promise<void> {
    await this.openButton(name).click();
  }
}
