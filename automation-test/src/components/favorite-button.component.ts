import type { Locator, Page } from "@playwright/test";
import { copy } from "@/data/copy";

// The favourite heart — client/src/components/FavoriteButton, rendered on every
// app tile (/apps, /favorites, Home's Jump back in + Recommended, the rows of
// /recently-used). A toggle button: `aria-pressed` carries the state and the
// accessible name is `<label>: <displayName>`, the label being "Add to
// favorites" while the app is not starred and "Remove from favorites" while it
// is (apps.card.addFavorite / removeFavorite, favorites.card.add / remove —
// the same text). Disabled while a toggle is in flight.

const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export class FavoriteButton {
  constructor(
    private readonly page: Page,
    private readonly t: Pick<typeof copy, "apps"> = copy
  ) {}

  /** The heart of `name`'s tile, whichever state it is in. */
  forApp(name: string): Locator {
    const { addFavorite, removeFavorite } = this.t.apps.card;
    return this.page.getByRole("button", {
      name: new RegExp(
        `(${escape(addFavorite)}|${escape(removeFavorite)}): ${escape(name)}`
      )
    });
  }

  /** The heart of `name`'s tile while it is not starred ("Add to favorites: <name>"). */
  add(name: string): Locator {
    return this.page.getByRole("button", {
      name: `${this.t.apps.card.addFavorite}: ${name}`,
      exact: true
    });
  }

  /** Every heart on the page that is not starred, in DOM order. */
  allUnstarred(): Locator {
    return this.page.getByRole("button", {
      name: new RegExp(`^${escape(this.t.apps.card.addFavorite)}: `)
    });
  }

  /** The app a heart belongs to, read from its accessible name. */
  async appNameOf(heart: Locator): Promise<string> {
    const label = (await heart.getAttribute("aria-label")) ?? "";
    return label.slice(label.indexOf(": ") + 2);
  }

  async toggle(name: string): Promise<void> {
    await this.forApp(name).click();
  }
}
