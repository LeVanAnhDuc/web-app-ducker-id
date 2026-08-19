import { test, expect } from "@playwright/test";

// ---------------------------------------------------------------------------
// Frontend-cleanup: Admin app status toggle toast deduplication
//
// When the "Unhide" action on an admin app row fails with a 500, EXACTLY ONE
// error toast must appear. The risk being guarded: if both the global
// MutationCache.onError handler (query-client.ts) AND a local onError inside
// useSetAdminAppStatus/AdminAppsTable both fired a toast, the user would see
// a duplicate. The cleanup must not introduce a second toast path.
//
// Strategy:
//   1. Navigate to /admin/apps (admin storageState).
//   2. Find a row with an inactive ("Paused") app and click its "Unhide" row
//      action. Unhide calls setAdminAppStatus(id, "active") → PATCH
//      /api/v1/admin/apps/:id. We intercept that PATCH and return 500.
//   3. Assert that exactly ONE error toast is visible.
//
// If no inactive ("Paused") app exists in the seed, we fall back to the
// "Hide" flow (which uses AdminAppsHideDialog and a confirmation button).
// The Hide PATCH endpoint is the same (/admin/apps/:id), so the intercept
// works for both paths.
//
// This test is classified "A only" (Gate A — deterministic, mutation-path):
// the PATCH is intercepted and returns 500, so no real status change occurs.
// No seed revert is needed.
//
// Runs under the `admin` project (storageState → e2e/.auth/admin.json).
// The `admin` project testMatch covers "admin-apps/**".
//
// Global MutationCache error handler (src/libs/query-client.ts) fires
// confirmErrorToast("Server error. Please try again later.") on 5xx.
// useSetAdminAppStatus has no local onError, so the global handler is the
// single source of the error toast.
// ---------------------------------------------------------------------------

// The error toast text fired by the global MutationCache.onError (5xx path).
// Source: src/libs/query-client.ts → confirmErrorToast("Server error. Please try again later.")
const SERVER_ERROR_TOAST = "Server error. Please try again later.";

test.describe("Admin App status toggle — toast dedup on 500 (frontend-cleanup)", () => {
  // [Error Guessing / mutation-safety] Gate A only: intercept forces a 500.
  test("shows exactly one error toast when the status-toggle PATCH returns 500 [Error Guessing]", async ({
    page
  }) => {
    // Intercept the PATCH that the status-toggle mutation fires.
    // Both Unhide (ACTIVE) and Hide-confirm (INACTIVE) use the same PATCH
    // /api/v1/admin/apps/:id endpoint.
    await page.route("**/api/v1/admin/apps/*", async (route) => {
      if (route.request().method() === "PATCH") {
        await route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({
            code: "INTERNAL",
            message: "forced error for E2E",
            timestamp: new Date().toISOString(),
            path: route.request().url()
          })
        });
        return;
      }
      await route.continue();
    });

    await page.goto("/admin/apps");
    await expect(
      page.getByRole("heading", { name: "App Registry" })
    ).toBeVisible();

    // Determine which status-toggle path is available:
    //   (a) If there is a "Paused" row, click its "App actions" → "Unhide"
    //       (direct mutation, no confirmation dialog).
    //   (b) Otherwise fall back to a "Blog" (active) row: "App actions" →
    //       "Hide" → confirm "Hide App" button.
    //
    // We prefer the Unhide path (a) because it fires the mutation in a single
    // click without a dialog, making it simpler. If the seed does not have an
    // inactive app, the Hide path (b) exercises the same PATCH intercept via
    // AdminAppsHideDialog → useSetAdminAppStatus.

    const pausedRows = page.getByRole("row").filter({ hasText: "Paused" });
    const hasPaused = (await pausedRows.count()) > 0;

    if (hasPaused) {
      // Path (a): Unhide — direct mutation.
      const firstPaused = pausedRows.first();
      await firstPaused.getByRole("button", { name: "App actions" }).click();
      await page.getByRole("menuitem", { name: "Unhide" }).click();
      // Mutation fires immediately (no confirmation dialog for Unhide).
    } else {
      // Path (b): Hide — requires confirmation dialog.
      // Use the "Blog" app row or the first active row.
      const activeRows = page.getByRole("row").filter({ hasText: "Active" });
      const firstActive = activeRows.first();
      await firstActive.getByRole("button", { name: "App actions" }).click();
      await page.getByRole("menuitem", { name: "Hide" }).click();
      // Confirmation dialog appears.
      await expect(page.getByRole("dialog")).toBeVisible();
      await page.getByRole("button", { name: "Hide App" }).click();
      // Mutation fires.
    }

    // Wait for the error toast from the global MutationCache.onError handler.
    await expect(page.getByText(SERVER_ERROR_TOAST).first()).toBeVisible({
      timeout: 8_000
    });

    // Assert EXACTLY ONE instance of the error toast (no duplicate).
    // Sonner renders toasts in a Toaster region; we count all matching text
    // nodes. There must be exactly 1.
    await expect(page.getByText(SERVER_ERROR_TOAST)).toHaveCount(1, {
      timeout: 3_000
    });
  });
});
