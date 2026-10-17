import type { Locator, Page } from "@playwright/test";

// Messages the app shows after an action — the sonner toast that carries the
// server's error message (React Query mutation cache, client/src/libs/
// query-client.ts) or a success line. Matched by text anywhere on the page,
// not inside the toaster region: the text is what the user reads, wherever
// it lands.
export class Toast {
  constructor(private readonly page: Page) {}

  withText(text: string | RegExp, options?: { exact?: boolean }): Locator {
    return this.page.getByText(text, options);
  }
}
