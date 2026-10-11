import { test, expect } from "@fixtures";

// A signed-out visitor cannot reach /favorites — the AuthGuard swaps in the
// login screen. Uses a truly clean context (no storageState + cleared
// cookies) so a localhost-scoped refresh cookie cannot leak in.
// Test cases: test-cases/favorites.md (TC-FAV-009). The API-level 401 for
// the favourites endpoints is TC-FAV-026 (tests/api/favorites).

test.describe("Favorites — AuthN", () => {
  test(
    "unauthenticated visit to /favorites is gated to the login screen",
    { tag: "@TC-FAV-009" },
    async ({ browser }) => {
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
    }
  );
});
