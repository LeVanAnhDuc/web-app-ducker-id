import type { Locator, Page } from "@playwright/test";

// The shared `#announcer` live region (client/src/hooks/useAnnounce) every
// screen writes to. It is overwritten by whichever screen announces last, so
// asserting its current text races; record() keeps the whole history instead.
export class Announcer {
  constructor(private readonly page: Page) {}

  /** The live region itself — its current text (last announcement wins). */
  region(): Locator {
    return this.page.locator("#announcer");
  }

  /** Starts recording every text the region holds. Call before `page.goto`. */
  async record(): Promise<void> {
    await this.page.addInitScript(() => {
      const w = window as unknown as { __announcements: string[] };
      w.__announcements = [];
      const observe = () => {
        const el = document.getElementById("announcer");
        if (!el) return false;
        const push = () => {
          const text = el.textContent?.trim();
          if (text) w.__announcements.push(text);
        };
        push();
        new MutationObserver(push).observe(el, {
          childList: true,
          characterData: true,
          subtree: true
        });
        return true;
      };
      if (!observe()) {
        const mo = new MutationObserver(() => {
          if (observe()) mo.disconnect();
        });
        document.addEventListener("DOMContentLoaded", () => {
          if (!observe())
            mo.observe(document.documentElement, {
              childList: true,
              subtree: true
            });
        });
      }
    });
  }

  /** Everything the region has said since record(). */
  async history(): Promise<string[]> {
    return this.page.evaluate(
      () =>
        (window as unknown as { __announcements?: string[] }).__announcements ??
        []
    );
  }
}
