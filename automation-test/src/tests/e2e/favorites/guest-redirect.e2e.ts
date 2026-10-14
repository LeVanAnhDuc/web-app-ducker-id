import { test, expect } from "@/fixtures";

// A signed-out visitor cannot reach /favorites — the AuthGuard swaps in the
// login screen. Role: guest (a clean context, no storage state, no cookies),
// so a localhost-scoped refresh cookie cannot leak in.
// Test cases: test-cases/favorites.md (TC-FAVORITES-009). The API-level 401 for
// the favourites endpoints is TC-FAVORITES-026 (tests/api/favorites).

test.use({ role: "guest" });

test.describe("Favorites — AuthN", () => {
  test(
    "A guest cannot reach `/favorites`",
    { tag: ["@TC-FAVORITES-009", "@smoke"] },
    async ({ favoritesPage, loginPage }) => {
      await favoritesPage.goto();
      // AuthGuard renders the login affordance (it may keep the URL and swap in
      // the login content), so assert the login affordance, not a URL.
      await expect(loginPage.continueButton()).toBeVisible({
        timeout: 20_000
      });
      // The protected favorites chrome must NOT be present. The unified list
      // toolbar wraps its search in a role="search" landmark, so its absence is
      // the reliable signal the favorites page did not render.
      await expect(favoritesPage.searchRegion()).toHaveCount(0);
    }
  );
});
