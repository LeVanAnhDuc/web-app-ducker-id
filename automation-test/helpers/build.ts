import type { Page } from "@playwright/test";

/**
 * True when the page was served by `next dev` rather than a production build.
 * Dev serves unhashed chunks (`/_next/static/chunks/webpack.js`); a build
 * serves content-hashed ones (`webpack-<hash>.js`). Call after a navigation.
 *
 * For behaviour that only exists in one mode — e.g. React StrictMode's double
 * effects, which run in dev only (BUG-005).
 */
export async function isDevBuild(page: Page): Promise<boolean> {
  return page.evaluate(() =>
    Array.from(document.scripts).some((s) =>
      /\/_next\/static\/chunks\/webpack\.js(\?|$)/.test(s.src)
    )
  );
}
