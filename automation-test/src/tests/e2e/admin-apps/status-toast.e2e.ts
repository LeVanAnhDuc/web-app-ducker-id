import { test, expect } from "@/fixtures";
import { clientLiteral, copy } from "@/data/copy";
import { APP_ITEM_ROUTE } from "./helpers";

test.use({ role: "admin" });

// ---------------------------------------------------------------------------
// Admin app status toggle — toast deduplication (REQ-ADMINAPPS-05).
// Test case: test-cases/admin-apps.md (TC-ADMINAPPS-058).
//
// When the "Unhide" action on an admin app row fails with a 500, EXACTLY ONE
// error toast must appear. The risk being guarded: if both the global
// MutationCache.onError handler (query-client.ts) AND a local onError inside
// useSetAdminAppStatus/AdminAppsTable both fired a toast, the user would see
// a duplicate. The cleanup must not introduce a second toast path.
//
// Strategy:
//   1. Navigate to /admin/apps as admin (role fixture).
//   2. Find a row with an inactive ("Paused") app and click its "Unhide" row
//      action. Unhide calls setAdminAppStatus(id, "active") → PATCH
//      /admin/apps/:id. We intercept that PATCH and return 500.
//   3. Assert that exactly ONE error toast is visible.
//
// If no inactive ("Paused") app exists in the seed, we fall back to the
// "Hide" flow (which uses AdminAppsHideDialog and a confirmation button).
// The Hide PATCH endpoint is the same (/admin/apps/:id), so the intercept
// works for both paths.
//
// The PATCH is intercepted and answers 500, so no real status change
// occurs and nothing needs restoring.
//
// Global MutationCache error handler (src/libs/query-client.ts) fires
// confirmErrorToast("Server error. Please try again later.") on 5xx.
// useSetAdminAppStatus has no local onError, so the global handler is the
// single source of the error toast.
// ---------------------------------------------------------------------------

const t = copy.adminApps;

test.describe("Admin App status toggle — toast dedup on 500", () => {
  // [Error Guessing / mutation-safety] Gate A only: intercept forces a 500.
  test(
    "A failing status change shows exactly one error toast",
    { tag: "@TC-ADMINAPPS-058" },
    async ({ page, adminAppsPage }) => {
      // Intercept the PATCH that the status-toggle mutation fires.
      // Both Unhide (ACTIVE) and Hide-confirm (INACTIVE) use the same PATCH
      // /admin/apps/:id endpoint.
      await page.route(APP_ITEM_ROUTE, async (route) => {
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

      await adminAppsPage.goto();
      await expect(adminAppsPage.heading()).toBeVisible();

      // Determine which status-toggle path is available:
      //   (a) If there is a "Paused" row, click its "App actions" → "Unhide"
      //       (direct mutation, no confirmation dialog).
      //   (b) Otherwise fall back to the first active row: "App actions" →
      //       "Hide" → confirm "Hide App" button.
      const pausedRows = adminAppsPage.rowsWithText(t.status.inactive);
      const hasPaused = (await pausedRows.count()) > 0;

      if (hasPaused) {
        // Path (a): Unhide — direct mutation (no confirmation dialog).
        await adminAppsPage.firstRowMenuButton(t.status.inactive).click();
        await adminAppsPage.unhideItem().click();
      } else {
        // Path (b): Hide — requires confirmation dialog.
        await adminAppsPage.firstRowMenuButton(t.status.active).click();
        await adminAppsPage.hideItem().click();
        await expect(adminAppsPage.dialog()).toBeVisible();
        await adminAppsPage.hideDialog.confirmButton().click();
      }

      // Wait for the error toast from the global MutationCache.onError handler.
      const errorToast = adminAppsPage.toast.withText(
        clientLiteral.serverErrorToast
      );
      await expect(errorToast.first()).toBeVisible({ timeout: 8_000 });

      // Assert EXACTLY ONE instance of the error toast (no duplicate).
      await expect(errorToast).toHaveCount(1, { timeout: 3_000 });
    }
  );
});
