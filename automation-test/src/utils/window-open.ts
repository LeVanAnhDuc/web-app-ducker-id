import type { Page } from "@playwright/test";

// Opening an app (useOpenApp in the client) calls window.open with the app's
// own, usually external, homeUrl. A test captures the call instead of letting
// the browser open a tab. Install before the page's scripts run (before goto).

type Spied = Window & { __opened: string[] };

/** Replaces window.open with a recorder, for every document the page loads. */
export async function stubWindowOpen(page: Page): Promise<void> {
  await page.addInitScript(() => {
    (window as unknown as Spied).__opened = [];
    window.open = (url?: string | URL) => {
      (window as unknown as Spied).__opened.push(String(url ?? ""));
      return null;
    };
  });
}

/** Every URL window.open was called with since the current document loaded. */
export const openedUrls = (page: Page): Promise<string[]> =>
  page.evaluate(() => (window as unknown as Spied).__opened);
