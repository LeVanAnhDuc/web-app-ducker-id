import type { Locator, Page } from "@playwright/test";
import { FavoriteButton } from "@/components/favorite-button.component";
import { copy, fill } from "@/data/copy";
import { escapeRegExp } from "@/utils/regex";
import { BasePage } from "../base.page";

// Home — `/`, client/src/views/Home, top to bottom:
//   GreetingSection     h1 "<greeting>, <fullName>" + "You have N apps…"
//   StatsSection        four StatCard links, aria-label "<label>: <value>. <viewDetails>"
//   ActivitySection     Card[aria-labelledby=home-activity-title]: RangeToggle
//                       (aria-pressed buttons), the chart (role=img) + a
//                       screen-reader table, empty / sparse / day-hint / error text
//   BreakdownSection    Card[aria-labelledby=home-methods-title|home-devices-title]
//   TopAppsSection      Card[aria-labelledby=home-top-apps]: CountBarList rows
//   QuickAccessSection  <section> "Jump back in" (a region): QuickAccessCard tiles
//                       (a button named after the app + the favourite heart)
//   RecommendedSection  <section> "Explore" (a region) + the explore CTA card
// The Cards are plain divs with aria-labelledby (no landmark role), so they are
// found by that attribute. Every app tile carries the favourite heart.
//
// Text comes from home.json (+ apps.json for the hearts). A Vietnamese page is
// `new HomePage(page, copyVi, "/vi")`.

/** The catalogues this screen reads: `copy` (en) or `copyVi`. */
export type HomeCopy = Pick<typeof copy, "home" | "apps">;

export type StatKey =
  | "totalApps"
  | "activeApps"
  | "successfulLogins"
  | "failedLogins";

export type StatsRange = "7d" | "30d" | "90d";

export class HomePage extends BasePage {
  readonly hearts: FavoriteButton;

  constructor(
    page: Page,
    private readonly t: HomeCopy = copy,
    /** Locale prefix of the URL: "" (en, as-needed) or "/vi". */
    private readonly locale = ""
  ) {
    super(page);
    this.hearts = new FavoriteButton(page, t);
  }

  /** `query` is the raw query string with its leading "?" (or ""). */
  async goto(query = ""): Promise<void> {
    await this.page.goto(`${this.locale || "/"}${query}`);
  }

  // ── greeting ────────────────────────────────────────────────────────────

  /** The h1, whose name starts with `greeting` ("Good morning", …). */
  greetingHeading(greeting: string): Locator {
    return this.page.getByRole("heading", {
      level: 1,
      name: new RegExp(`^${escapeRegExp(greeting)}`)
    });
  }

  /** "You have <count> apps in your collection." — or the empty variant at 0. */
  greetingSubtitle(count: number): Locator {
    const { subtitle, subtitleEmpty } = this.t.home.greeting;
    return this.page.getByText(
      count > 0 ? fill(subtitle, { count }) : subtitleEmpty,
      { exact: true }
    );
  }

  // ── stat cards ──────────────────────────────────────────────────────────

  /**
   * The stat card link of `key`. With `value` its name must carry
   * "<label>: <value>"; without, any value.
   */
  statCard(key: StatKey, value?: number): Locator {
    const label = escapeRegExp(this.t.home.stats[key]);
    return this.page.getByRole("link", {
      name: new RegExp(
        value === undefined ? `^${label}: ` : `${label}: ${value}`
      )
    });
  }

  /** The small line under a card's label (its window, "All time", …). */
  statHint(key: StatKey, hint: string): Locator {
    return this.statCard(key).getByText(hint, { exact: true });
  }

  // ── sign-in activity ────────────────────────────────────────────────────

  activityHeading(): Locator {
    return this.page.getByRole("heading", { name: this.t.home.activity.title });
  }

  /** The range toggle's button for `range` (`aria-pressed` = selected). */
  rangeButton(range: StatsRange): Locator {
    return this.page.getByRole("button", { name: this.t.home.range[range] });
  }

  async selectRange(range: StatsRange): Promise<void> {
    await this.rangeButton(range).click();
  }

  /** The chart figure: role=img named "Sign-in activity over the last <days> days…". */
  activityChart(days: number): Locator {
    const summary = fill(this.t.home.activity.chartLabel, { days }).split(
      ":"
    )[0];
    return this.page.getByRole("img", {
      name: new RegExp(escapeRegExp(summary))
    });
  }

  /** The screen-reader table behind the chart ("Sign-ins per day"). */
  dayTable(): Locator {
    return this.page.getByRole("table", {
      name: this.t.home.activity.tableCaption
    });
  }

  /** One body row per day of the range. */
  dayRows(): Locator {
    return this.dayTable().locator("tbody tr");
  }

  /** "Last <days> days · <timezone>" under the activity heading. */
  activitySubtitle(days: number, timezone: string): Locator {
    return this.page.getByText(
      fill(this.t.home.activity.subtitle, { days, timezone }),
      { exact: true }
    );
  }

  activityEmpty(): Locator {
    return this.page.getByText(this.t.home.activity.empty);
  }

  /** "Only <count> sign-ins in this period…" (matched on its first sentence). */
  activitySparse(count: number): Locator {
    const first = fill(this.t.home.activity.sparse, { count }).split(".")[0];
    return this.page.getByText(new RegExp(escapeRegExp(first)));
  }

  activityDayHint(): Locator {
    return this.page.getByText(this.t.home.activity.dayHint);
  }

  activityError(): Locator {
    return this.page.getByText(this.t.home.activity.error);
  }

  /** "View history" at the foot of the activity card. */
  seeHistoryLink(): Locator {
    return this.page.getByRole("link", {
      name: this.t.home.activity.seeHistory
    });
  }

  // ── breakdown ───────────────────────────────────────────────────────────

  methodsPanel(): Locator {
    return this.page.locator('[aria-labelledby="home-methods-title"]');
  }

  devicesPanel(): Locator {
    return this.page.locator('[aria-labelledby="home-devices-title"]');
  }

  /** The first link whose name contains a method's label ("Password"). */
  methodLink(label: string): Locator {
    return this.page
      .getByRole("link", { name: new RegExp(escapeRegExp(label)) })
      .first();
  }

  /** Every method link of the donut's legend. */
  methodLinks(): Locator {
    return this.methodsPanel().getByRole("link");
  }

  /** A device row, named "<label>: <count>". */
  deviceLink(label: string, count: number): Locator {
    return this.page.getByRole("link", {
      name: new RegExp(`${escapeRegExp(label)}: ${count}`)
    });
  }

  /** Every device row link. */
  deviceLinks(): Locator {
    return this.devicesPanel().getByRole("link");
  }

  methodsEmpty(): Locator {
    return this.methodsPanel().getByText(this.t.home.methods.empty);
  }

  devicesEmpty(): Locator {
    return this.devicesPanel().getByText(this.t.home.devices.empty);
  }

  // ── most used apps ──────────────────────────────────────────────────────

  topAppsCard(): Locator {
    return this.page.locator('[aria-labelledby="home-top-apps"]');
  }

  /** "Most used apps" — page-wide, so it is found even if the card moves. */
  topAppsHeading(): Locator {
    return this.page.getByRole("heading", { name: this.t.home.topApps.title });
  }

  /** The ranking rows, best first. */
  topAppRows(): Locator {
    return this.topAppsCard().getByRole("listitem");
  }

  /** The link of ranking row `index` (0 = most opened). */
  topAppLink(index: number): Locator {
    return this.topAppRows().nth(index).getByRole("link");
  }

  topAppsEmpty(): Locator {
    return this.page.getByText(this.t.home.topApps.empty);
  }

  topAppsSeeAll(): Locator {
    return this.topAppsCard().getByRole("link", {
      name: this.t.home.topApps.seeAll
    });
  }

  // ── jump back in ────────────────────────────────────────────────────────

  quickAccess(): Locator {
    return this.page.getByRole("region", {
      name: this.t.home.quickAccess.title
    });
  }

  /** Every tile button (and heart) in the section. */
  quickAccessButtons(): Locator {
    return this.quickAccess().getByRole("button");
  }

  /** The tile of `name` — the button named after the app (no categories). */
  quickAccessTile(name: string): Locator {
    return this.quickAccess().getByRole("button", { name, exact: true });
  }

  /** Text inside the section — tile names are aria-hidden spans. */
  quickAccessText(text: string | RegExp): Locator {
    return this.quickAccess().getByText(text);
  }

  /** "Where you left off" — the subtitle while there is a history. */
  quickAccessSubtitle(): Locator {
    return this.quickAccessText(this.t.home.quickAccess.subtitle);
  }

  /** "No apps opened yet — here is what is available." */
  quickAccessEmpty(): Locator {
    return this.quickAccessText(this.t.home.quickAccess.empty);
  }

  quickAccessError(): Locator {
    return this.quickAccessText(this.t.home.quickAccess.error);
  }

  quickAccessSeeAll(): Locator {
    return this.quickAccess().getByRole("link", {
      name: this.t.home.quickAccess.seeAll
    });
  }

  async openQuickAccessTile(name: string): Promise<void> {
    await this.quickAccessTile(name).click();
  }

  // ── explore ─────────────────────────────────────────────────────────────

  exploreHeading(): Locator {
    return this.page.getByRole("heading", { name: this.t.home.explore.title });
  }

  explore(): Locator {
    return this.page.getByRole("region", { name: this.t.home.explore.title });
  }

  /** The section's "See all apps" (first: in vi it shares the CTA's text). */
  exploreSeeAll(): Locator {
    return this.explore()
      .getByRole("link", { name: this.t.home.explore.seeAll })
      .first();
  }

  /** The CTA card's "Browse all apps" (last link of that name in the section). */
  exploreCtaLink(): Locator {
    return this.explore()
      .getByRole("link", { name: this.t.home.exploreCTA.cta })
      .last();
  }

  /** "<count> apps available — find your next favourite." */
  exploreCtaSubtitle(count: number): Locator {
    return this.page.getByText(
      fill(this.t.home.exploreCTA.subtitle, { count })
    );
  }

  // ── anything ────────────────────────────────────────────────────────────

  /** Any text on the page — for text that must be ABSENT (removed metrics). */
  text(text: string): Locator {
    return this.page.getByText(text);
  }
}
