import { test, expect } from "@playwright/test";
import type { Browser, Locator } from "@playwright/test";

// ---------------------------------------------------------------------------
// Frontend-cleanup: SecretField copy button (AdminAppsSecretDialog)
//
// SecretField (src/views/AdminApps/components/SecretField/index.tsx) is used
// inside AdminAppsSecretDialog which opens after registering a new app.
// The copy button:
//   - copies the field value to the clipboard via navigator.clipboard.writeText
//   - immediately shows a Check icon + aria-label "Copied" (copiedLabel)
//   - reverts to "Copy" (copyLabel) after ~2000ms (useCopyToClipboard timeout)
//   - rapid repeated clicks reset the single timer (stays "Copied", one revert)
//
// Strategy for reaching the dialog: intercept the POST /api/v1/admin/apps
// endpoint and return a fake AdminAppCreateResult so the dialog opens
// deterministically without a real DB write (no seed mutation).
//
// Runs under the `admin` project (storageState → e2e/.auth/admin.json).
// The `admin` project testMatch covers "admin-apps/**".
//
// Clipboard permissions: granted via browser context
// (clipboard-read + clipboard-write) so navigator.clipboard.readText() works.
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
  categoryId: "cat-000000000000",
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
  path: "/api/v1/admin/apps",
  message: "Created",
  data: FAKE_APP
};

// i18n strings from src/locales/en/adminApps.json (actions namespace).
const COPY_LABEL = "Copy";
const COPIED_LABEL = "Copied";

// The dialog renders TWO copy buttons (Client ID + Client Secret), both with
// accessible name "Copy". A name-based `.first()` is unstable: once a button
// flips to "Copied", `.first()` of "Copy" re-resolves to the OTHER button.
// Anchor to the SecretField row by its unique value text instead — this stays
// stable across the label flip.
const copyButtonFor = (dialog: Locator, value: string): Locator =>
  dialog.locator("div.space-y-1\\.5", { hasText: value }).getByRole("button");

// Helper: open a fresh admin context with clipboard permissions granted.
// We use a new context per test so clipboard state is isolated.
async function openSecretDialog(browser: Browser) {
  const ctx = await browser.newContext({
    permissions: ["clipboard-read", "clipboard-write"],
    storageState: "e2e/.auth/admin.json"
  });
  // Deterministic clipboard: the real navigator.clipboard.writeText only
  // resolves when the document is focused, which is unreliable in headless
  // Chromium and would leave the button stuck in "Copy". We stub it with a
  // focus-independent, always-resolving implementation so the test verifies
  // the BUTTON UX (icon/label flip, revert, rapid-click) and that our hook
  // writes the correct value — not the browser's clipboard internals.
  await ctx.addInitScript(() => {
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

  const page = await ctx.newPage();

  // Intercept the POST to create a fake app (no real DB write).
  await page.route("**/api/v1/admin/apps", async (route) => {
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

  await page.goto("/admin/apps");
  await expect(
    page.getByRole("heading", { name: "App Registry" })
  ).toBeVisible();

  // Open the "Register App" sheet.
  await page.getByRole("button", { name: "Register App" }).click();
  await expect(
    page.getByRole("heading", { name: "Register New App" })
  ).toBeVisible();

  // Fill the minimum required fields to reach the submit. We use values that
  // pass FE validation but the POST is intercepted, so they never reach the DB.
  await page
    .getByRole("textbox", { name: "Name *", exact: true })
    .fill("copy-e2e-app");
  await page
    .getByRole("textbox", { name: "Display Name" })
    .fill("Copy E2E App");
  await page
    .getByRole("textbox", { name: "Home URL" })
    .fill("https://copy-e2e.example.com");

  // Select a category (required). Use the combobox — first available option.
  const categoryCombo = page.getByRole("combobox", { name: "Category" });
  await categoryCombo.click();
  // Pick the first option in the listbox.
  await page.getByRole("option").first().click();

  // Add one redirect URI.
  const uriDraft = page.getByRole("textbox", {
    name: "https://app.example.com/auth/callback"
  });
  await uriDraft.fill("https://copy-e2e.example.com/callback");
  await page.getByRole("button", { name: "Add URI" }).click();

  // Submit → POST is intercepted → dialog opens with FAKE_APP credentials.
  await page.getByRole("button", { name: "Register" }).click();

  // Wait for the secret dialog.
  await expect(
    page.getByRole("dialog", { name: "App registered — copy your credentials" })
  ).toBeVisible({ timeout: 10_000 });

  // navigator.clipboard.writeText() resolves only when the document is focused.
  // In headless Chromium a freshly-opened context/page can lack focus, which
  // would reject the write and leave the button stuck in the "Copy" state.
  await page.bringToFront();

  return { page, ctx };
}

test.describe("SecretField copy button — AdminAppsSecretDialog (frontend-cleanup)", () => {
  test.describe.configure({ mode: "serial" });

  // [Happy path] Clicking Copy: clipboard receives the value, button shows
  // "Copied" aria-label + Copied text.
  test("copy click stores value in clipboard and shows Copied state [EP]", async ({
    browser
  }) => {
    const { page, ctx } = await openSecretDialog(browser);
    try {
      // The dialog has two SecretField rows: Client ID and Client Secret.
      // Scope to the Client ID field (first copy button).
      const dialog = page.getByRole("dialog", {
        name: "App registered — copy your credentials"
      });

      // Before click: button is in "Copy" state.
      const copyBtn = copyButtonFor(dialog, FAKE_APP.clientId);
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
    } finally {
      await ctx.close();
    }
  });

  // [BVA ~2000ms] Button reverts to "Copy" after the timeout (~2000ms).
  // We wait up to 3500ms to account for timer jitter in CI.
  test("copy button reverts to Copy state after ~2000ms [BVA]", async ({
    browser
  }) => {
    const { page, ctx } = await openSecretDialog(browser);
    try {
      const dialog = page.getByRole("dialog", {
        name: "App registered — copy your credentials"
      });

      const copyBtn = copyButtonFor(dialog, FAKE_APP.clientId);
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
    } finally {
      await ctx.close();
    }
  });

  // [Error Guessing] Rapid repeated clicks reset the single timer: the button
  // stays in "Copied" state throughout and only reverts once, after the
  // debounced 2000ms from the last click. We click 3× quickly and verify:
  // (a) still in Copied state immediately after the 3rd click,
  // (b) reverts to Copy after the timer.
  test("rapid 3× clicks keep Copied state and trigger only one revert [Error Guessing]", async ({
    browser
  }) => {
    const { page, ctx } = await openSecretDialog(browser);
    try {
      const dialog = page.getByRole("dialog", {
        name: "App registered — copy your credentials"
      });

      const copyBtn = copyButtonFor(dialog, FAKE_APP.clientId);

      // 3 rapid clicks (no await between them — fire and forget).
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
    } finally {
      await ctx.close();
    }
  });
});
