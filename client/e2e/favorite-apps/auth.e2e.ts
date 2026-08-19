import { test, expect } from "@playwright/test";

// AuthN (matrix group 2): an unauthenticated user cannot reach /favorites — the
// AuthGuard gates them to the login screen. Uses a truly clean context (no
// storageState + proactively cleared cookies) so a localhost-scoped refresh
// cookie from another port/run cannot leak in — same pattern as the
// notifications + admin-login-history auth specs.
//
// The API-level 401 for unauthenticated GET/POST/DELETE /users/me/favorites is
// Gate-A / API-suite territory (no UI path drives a tokenless request — the
// FavoriteButton only renders inside the authed app shell). Documented as a
// deferred gap in docs/specs/favorite-apps/e2e.md.

test.describe("Favorites — AuthN", () => {
  test("unauthenticated visit to /favorites is gated to the login screen", async ({
    browser
  }) => {
    const ctx = await browser.newContext({ storageState: undefined });
    await ctx.clearCookies();
    try {
      const page = await ctx.newPage();
      await page.goto("/favorites");
      // AuthGuard renders the login affordance (it may keep the URL and swap in
      // the login content), so assert the login affordance, not a URL.
      await expect(
        page.getByRole("button", { name: /continue with email/i })
      ).toBeVisible({ timeout: 20_000 });
      // The protected favorites chrome must NOT be present. The unified list
      // toolbar wraps its search in a role="search" landmark, so its absence is
      // the reliable signal the favorites page did not render.
      await expect(page.getByRole("search")).toHaveCount(0);
    } finally {
      await ctx.close();
    }
  });
});
