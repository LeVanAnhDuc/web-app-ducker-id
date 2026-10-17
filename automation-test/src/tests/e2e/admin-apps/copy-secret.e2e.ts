import { test, expect } from "@/fixtures";
import type { Page } from "@playwright/test";
import { copy } from "@/data/copy";
import type { AdminAppsPage } from "@/pages/admin/admin-apps.page";
import { APPS_COLLECTION_ROUTE } from "./helpers";

// Admin session from the role fixture; clipboard permissions on the same
// context so navigator.clipboard.readText() works.
test.use({
  role: "admin",
  permissions: ["clipboard-read", "clipboard-write"]
});

// ---------------------------------------------------------------------------
// SecretField copy button in the post-create credentials dialog
// (REQ-ADMINAPPS-03). Test cases: test-cases/admin-apps.md (TC-ADMINAPPS-033 …
// TC-ADMINAPPS-035).
//
// SecretField (src/views/AdminApps/components/SecretField/index.tsx) is used
// inside AdminAppsSecretDialog which opens after registering a new app.
// The copy button:
//   - copies the field value to the clipboard via navigator.clipboard.writeText
//   - immediately shows a Check icon + aria-label "Copied" (copiedLabel)
//   - reverts to "Copy" (copyLabel) after ~2000ms (useCopyToClipboard timeout)
//   - rapid repeated clicks reset the single timer (stays "Copied", one revert)
//
// Strategy for reaching the dialog: intercept the POST /admin/apps endpoint
// and return a fake AdminAppCreateResult so the dialog opens deterministically
// without a real DB write (no seed mutation).
//
// Each test gets a fresh context from Playwright, so clipboard state is
// isolated per test.
// ---------------------------------------------------------------------------

// Fake create response. Values are chosen to be visually distinct so we can
// assert clipboard content without ambiguity.
const FAKE_APP = {
  _id: "copy-e2e-000000000000",
  name: "copy-e2e-app",
  displayName: "Copy E2E App",
  clientId: "copy-e2e-client-id-abc123",
  clientSecret: "copy-e2e-client-secret-xyz789",
  status: "active" as const,
  categoryIds: ["cat-000000000000"],
  description: null,
  iconUrl: null,
  homeUrl: "https://copy-e2e.example.com",
  requiredRoles: ["user"],
  redirectUris: ["https://copy-e2e.example.com/callback"],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

const CREATE_RESPONSE = {
  timestamp: new Date().toISOString(),
  path: "/admin/apps",
  message: "Created",
  data: FAKE_APP
};

// adminApps.actions.copy / .copied (client/src/locales/en/adminApps.json).
const COPY_LABEL = copy.adminApps.actions.copy;
const COPIED_LABEL = copy.adminApps.actions.copied;

// Opens the credentials dialog on the test's own (admin) page.
async function openSecretDialog(page: Page, adminAppsPage: AdminAppsPage) {
  const { sheet, secretDialog } = adminAppsPage;
  // Deterministic clipboard: the real navigator.clipboard.writeText only
  // resolves when the document is focused, which is unreliable in headless
  // Chromium and would leave the button stuck in "Copy". We stub it with a
  // focus-independent, always-resolving implementation so the test verifies
  // the BUTTON UX (icon/label flip, revert, rapid-click) and that our hook
  // writes the correct value — not the browser's clipboard internals.
  await page.addInitScript(() => {
    const store = { value: "" };
    const stub = {
      writeText: (text: string) => {
        store.value = String(text);
        return Promise.resolve();
      },
      readText: () => Promise.resolve(store.value)
    };
    // navigator.clipboard is a read-only getter on the prototype, so a `value`
    // descriptor throws. Install via a getter; fall back to overriding methods.
    try {
      Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        get: () => stub
      });
    } catch {
      try {
        navigator.clipboard.writeText = stub.writeText;
        navigator.clipboard.readText = stub.readText;
      } catch {
        /* leave real clipboard in place */
      }
    }
  });

  // Intercept the POST to create a fake app (no real DB write).
  await page.route(APPS_COLLECTION_ROUTE, async (route) => {
    if (route.request().method() === "POST") {
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify(CREATE_RESPONSE)
      });
      return;
    }
    await route.continue();
  });

  await adminAppsPage.goto();
  await expect(adminAppsPage.heading()).toBeVisible();

  // Open the "Register App" sheet.
  await adminAppsPage.openRegister();

  // Fill the minimum required fields to reach the submit. We use values that
  // pass FE validation but the POST is intercepted, so they never reach the DB.
  await sheet.nameInput().fill("copy-e2e-app");
  await sheet.displayNameInput().fill("Copy E2E App");
  await sheet.homeUrlInput().fill("https://copy-e2e.example.com");

  // Select a category (required): open the picker, tick the first option.
  await sheet.categoriesPicker().click();
  await sheet.firstCategoryOption().click();
  await page.keyboard.press("Escape");

  // Add one redirect URI.
  await sheet.addRedirectUri("https://copy-e2e.example.com/callback");

  // Submit → POST is intercepted → dialog opens with FAKE_APP credentials.
  await sheet.registerButton().click();

  // Wait for the secret dialog.
  await expect(secretDialog.root()).toBeVisible({ timeout: 10_000 });

  // navigator.clipboard.writeText() resolves only when the document is focused.
  // In headless Chromium a freshly-opened context/page can lack focus, which
  // would reject the write and leave the button stuck in the "Copy" state.
  await page.bringToFront();
}

test.describe("SecretField copy button — AdminAppsSecretDialog", () => {
  test.describe.configure({ mode: "serial" });

  // [Happy path] Clicking Copy: clipboard receives the value, button shows
  // "Copied" aria-label + Copied text.
  test(
    "Copy puts the value on the clipboard and shows Copied",
    { tag: "@TC-ADMINAPPS-033" },
    async ({ page, adminAppsPage }) => {
      await openSecretDialog(page, adminAppsPage);
      // The dialog has two SecretField rows: Client ID and Client Secret.
      // Scope to the Client ID field.
      const copyBtn = adminAppsPage.secretDialog.copyButtonFor(
        FAKE_APP.clientId
      );

      // Before click: button is in "Copy" state.
      await expect(copyBtn).toBeVisible();
      await expect(copyBtn).toHaveAttribute("aria-label", COPY_LABEL);

      await copyBtn.click();

      // After click: button transitions to "Copied" state (aria-label changes).
      await expect(copyBtn).toHaveAttribute("aria-label", COPIED_LABEL, {
        timeout: 3_000
      });
      await expect(copyBtn).toContainText(COPIED_LABEL);

      // Clipboard contains the Client ID value.
      const clipboardContent = await page.evaluate(() =>
        navigator.clipboard.readText()
      );
      expect(clipboardContent).toBe(FAKE_APP.clientId);
    }
  );

  // [BVA ~2000ms] Button reverts to "Copy" after the timeout (~2000ms).
  // We wait up to 3500ms to account for timer jitter in CI.
  test(
    "The Copy button reverts after about two seconds",
    { tag: "@TC-ADMINAPPS-034" },
    async ({ page, adminAppsPage }) => {
      await openSecretDialog(page, adminAppsPage);
      const copyBtn = adminAppsPage.secretDialog.copyButtonFor(
        FAKE_APP.clientId
      );
      await copyBtn.click();

      // In copied state.
      await expect(copyBtn).toHaveAttribute("aria-label", COPIED_LABEL, {
        timeout: 2_000
      });

      // After the revert timeout (default 2000ms + CI buffer).
      await expect(copyBtn).toHaveAttribute("aria-label", COPY_LABEL, {
        timeout: 3_500
      });
      await expect(copyBtn).toContainText(COPY_LABEL);
    }
  );

  // [Error Guessing] Rapid repeated clicks reset the single timer: the button
  // stays in "Copied" state throughout and only reverts once, after the
  // debounced 2000ms from the last click. We click 3× quickly and verify:
  // (a) still in Copied state immediately after the 3rd click,
  // (b) reverts to Copy after the timer.
  test(
    "Rapid copies keep one timer",
    { tag: "@TC-ADMINAPPS-035" },
    async ({ page, adminAppsPage }) => {
      await openSecretDialog(page, adminAppsPage);
      const copyBtn = adminAppsPage.secretDialog.copyButtonFor(
        FAKE_APP.clientId
      );

      // 3 rapid clicks.
      await copyBtn.click();
      await copyBtn.click();
      await copyBtn.click();

      // Immediately after all 3 clicks: still in "Copied" state.
      await expect(copyBtn).toHaveAttribute("aria-label", COPIED_LABEL, {
        timeout: 2_000
      });

      // Eventually reverts (single timer from the last click, ~2000ms later).
      await expect(copyBtn).toHaveAttribute("aria-label", COPY_LABEL, {
        timeout: 4_000
      });
    }
  );
});
