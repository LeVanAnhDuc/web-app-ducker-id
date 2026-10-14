import type { Locator, Page } from "@playwright/test";
import { clientLiteral } from "@/data/copy";

// What client/src/components/FormatTime renders wherever the app shows an
// absolute or relative time (login history, admin tables, my requests, recent
// apps): `<time dateTime="<ISO>">text in the app's locale</time>`, or the
// "—" fallback for a value it cannot parse. Scoped to the whole page, or to
// one region with within() (a notification row, a table).
export class FormattedTime {
  constructor(private readonly scope: Page | Locator) {}

  /** The same component inside one region of the page. */
  within(region: Locator): FormattedTime {
    return new FormattedTime(region);
  }

  /** Every `<time>` carrying a `datetime` attribute. */
  all(): Locator {
    return this.scope.locator("time[datetime]");
  }

  first(): Locator {
    return this.all().first();
  }

  /** `<time datetime>` cells of a data table. */
  inTable(): Locator {
    return this.scope.locator("table time[datetime]");
  }

  /** A table cell holding only the "—" fallback. */
  fallbackCell(): Locator {
    return this.scope
      .getByRole("cell", { name: clientLiteral.invalidDateDisplay })
      .first();
  }

  /** What `new Date("garbage").toString()` would leak — must never render. */
  invalidDate(): Locator {
    return this.scope.getByText("Invalid Date");
  }
}
