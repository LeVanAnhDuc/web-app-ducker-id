import { test, expect } from "@/fixtures";
import type { Page, Route } from "@playwright/test";
import { adminUsersRoutes } from "@/api/admin-users.client";
import { copy, copyVi, fill } from "@/data/copy";
import { SERVER_ERROR_TOAST } from "@/data/test-data";
import { AdminUsersPage } from "@/pages/admin/admin-users.page";
import { createAccount, findUserByEmail, type Account } from "@/utils/accounts";
import { adminUserId } from "@/utils/admin-users";

test.use({ role: "admin" });

// Admin reset-password (REQ-ADMINUSERS-03) — the row-menu flow on
// /admin/users. Runs as admin (role fixture).
// Test cases: test-cases/admin-users.md.
//
// The UI tests intercept POST /admin/users/:id/reset-password with
// `page.route`, so they never reset anything; the row they open belongs to a
// throwaway account (`target`) all the same.
//
// The full round trip — old password rejected, the emailed temporary
// password signs in, the session is flagged to change it — and the endpoint's
// guards (format, existence, self) are proven over HTTP in
// tests/api/admin-users/reset-password.api.ts. The forced change the user then
// goes through belongs to the password module.

const TARGET_NAME = "Reset Target";
const RESET = adminUsersRoutes.resetPassword;
const t = copy.adminUsers;

let target!: Account;
let targetId: string;

/** Intercepts the reset POST with a canned response — no real reset. */
const mockReset = async (
  page: Page,
  {
    status,
    body,
    delayMs
  }: { status: number; body: Record<string, unknown>; delayMs?: number }
) => {
  await page.route(RESET, async (route: Route) => {
    if (route.request().method() !== "POST") return route.continue();
    if (delayMs) await new Promise((resolve) => setTimeout(resolve, delayMs));
    return route.fulfill({
      status,
      contentType: "application/json",
      body: JSON.stringify(body)
    });
  });
};

const mockOkBody = () => ({
  data: { _id: targetId, email: target.email }
});

/** Counts reset POSTs, answering them with `answer` (or passing them on). */
const countResets = async (page: Page, answer?: () => object) => {
  const counter = { n: 0 };
  await page.route(RESET, async (route: Route) => {
    if (route.request().method() !== "POST") return route.continue();
    counter.n += 1;
    if (!answer) return route.continue();
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(answer())
    });
  });
  return counter;
};

// The target is reused while it exists and replaced when it does not (first
// test, or a parallel run's cleanup removed it).
test.beforeEach(async ({ adminApi }) => {
  if (!target || !(await findUserByEmail(target.email)))
    target = await createAccount({
      tag: "adm-reset-target",
      fullName: TARGET_NAME
    });
  targetId = await adminUserId(adminApi, target.email);
});

// ---------------------------------------------------------------------------
// Happy path — mocked, no real reset.
// ---------------------------------------------------------------------------
test(
  "Reset from the row menu",
  { tag: ["@TC-ADMINUSERS-050", "@smoke"] },
  async ({ page, adminUsersPage: users }) => {
    await mockReset(page, { status: 200, body: mockOkBody() });
    await users.gotoRow(target.email);
    await users.startReset(target.email);

    await expect(
      users.dialog(users.resetDialog.title(TARGET_NAME))
    ).toBeVisible();
    await expect(
      users.text(users.resetDialog.description(target.email))
    ).toBeVisible();

    await users.resetDialog.sendButton().click();

    await expect(users.text(t.toast.resetSuccess, true)).toBeVisible();
    await expect(users.dialog()).not.toBeVisible();
    await expect(users.announcer()).toContainText(
      fill(t.announce.passwordReset, { name: TARGET_NAME })
    );

    await page.unroute(RESET);
  }
);

test(
  "No dialog before an action is chosen",
  { tag: "@TC-ADMINUSERS-051" },
  async ({ adminUsersPage: users }) => {
    await users.gotoRow(target.email);
    await expect(users.dialog()).toHaveCount(0);
  }
);

// ---------------------------------------------------------------------------
// Data rendering — human name + email, never a raw id or i18n key.
// ---------------------------------------------------------------------------
test(
  "Dialog and toast show names, never keys",
  { tag: "@TC-ADMINUSERS-054" },
  async ({ page, adminUsersPage: users }) => {
    await mockReset(page, { status: 200, body: mockOkBody() });
    await users.gotoRow(target.email);
    await users.startReset(target.email);

    await expect(users.dialog().getByText(target.email)).toBeVisible();
    await expect(users.text(/adminUsers\./)).toHaveCount(0);

    await users.resetDialog.sendButton().click();
    await expect(users.text(t.toast.resetSuccess, true)).toBeVisible();
    await expect(users.text(/adminUsers\./)).toHaveCount(0);

    await page.unroute(RESET);
  }
);

// ---------------------------------------------------------------------------
// i18n (en + vi) — dialog, confirm button, toast.
// ---------------------------------------------------------------------------
test(
  "English reset dialog and toast",
  { tag: "@TC-ADMINUSERS-055" },
  async ({ page, adminUsersPage: users }) => {
    await mockReset(page, { status: 200, body: mockOkBody() });
    await users.gotoRow(target.email);
    await users.startReset(target.email);

    await expect(
      users.text(users.resetDialog.title(TARGET_NAME))
    ).toBeVisible();
    await expect(
      users.text(users.resetDialog.description(target.email))
    ).toBeVisible();

    await users.resetDialog.sendButton().click();
    await expect(users.text(t.toast.resetSuccess, true)).toBeVisible();

    await page.unroute(RESET);
  }
);

test(
  "Vietnamese reset dialog and toast",
  { tag: "@TC-ADMINUSERS-056" },
  async ({ page }) => {
    const users = new AdminUsersPage(page, copyVi, "/vi");
    await mockReset(page, { status: 200, body: mockOkBody() });
    await users.gotoRow(target.email);
    await users.startReset(target.email);

    await expect(
      users.text(users.resetDialog.title(TARGET_NAME))
    ).toBeVisible();
    await expect(
      users.text(users.resetDialog.description(target.email))
    ).toBeVisible();

    await users.resetDialog.sendButton().click();
    await expect(
      users.text(copyVi.adminUsers.toast.resetSuccess, true)
    ).toBeVisible();

    // No missing-message placeholders leaked into VI locale.
    await expect(users.text(/\[adminUsers\./)).toHaveCount(0);

    await page.unroute(RESET);
  }
);

// ---------------------------------------------------------------------------
// Error / loading — BE 5xx, non-optimistic UI (mocked, no real mutation).
// ---------------------------------------------------------------------------
test(
  "A failed reset keeps the dialog open",
  { tag: "@TC-ADMINUSERS-057" },
  async ({ page, adminUsersPage: users }) => {
    await users.gotoRow(target.email);
    await mockReset(page, {
      status: 500,
      body: { code: "INTERNAL_SERVER_ERROR", message: "boom" }
    });

    await users.startReset(target.email);
    const send = users.resetDialog.sendButton();
    await send.click();

    // Global React Query mutationCache error handler for 5xx
    // (client/src/libs/query-client.ts).
    await expect(users.text(SERVER_ERROR_TOAST, true)).toBeVisible();

    // Confirm button not stuck in loading — re-enabled / clickable again.
    await expect(send).toBeEnabled();
    // Non-optimistic: the dialog stays open on error (no premature close).
    await expect(users.dialog()).toBeVisible();

    await page.unroute(RESET);
    await page.keyboard.press("Escape");
  }
);

// ---------------------------------------------------------------------------
// Mutation safety — double-submit exactly-one (mocked).
// ---------------------------------------------------------------------------
test(
  "Sending twice sends one request",
  { tag: "@TC-ADMINUSERS-058" },
  async ({ page, adminUsersPage: users }) => {
    await users.gotoRow(target.email);
    let postCount = 0;
    await page.route(RESET, async (route: Route) => {
      if (route.request().method() !== "POST") return route.continue();
      postCount += 1;
      // Delay the response so we can observe the pending-disabled state.
      await new Promise((resolve) => setTimeout(resolve, 400));
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockOkBody())
      });
    });

    await users.startReset(target.email);
    const send = users.resetDialog.sendButton();

    // Click once — CustomButton disables itself while mutation.isPending, the
    // app's actual double-submit guard. A second click can't land while
    // disabled, so the guard is asserted directly instead of racing two clicks.
    await send.click();
    await expect(send).toBeDisabled();

    await expect(users.text(t.toast.resetSuccess, true)).toBeVisible();
    expect(postCount).toBe(1);

    await page.unroute(RESET);
  }
);

// ---------------------------------------------------------------------------
// Accessibility — keyboard open/confirm, dismiss paths fire 0 requests.
// ---------------------------------------------------------------------------
test.describe(
  "Keyboard send; Cancel and Escape send nothing",
  { tag: "@TC-ADMINUSERS-059" },
  () => {
    test("keyboard: open menu via Enter, navigate to Reset password, Enter fires exactly one request", async ({
      page,
      adminUsersPage: users
    }) => {
      await users.gotoRow(target.email);
      const counter = await countResets(page, mockOkBody);

      await users.rowMenuButton(target.email).focus();
      await page.keyboard.press("Enter");
      await expect(users.resetItem()).toBeVisible();

      await users.resetItem().click();
      const send = users.resetDialog.sendButton();
      await send.focus();
      await page.keyboard.press("Enter");

      await expect(users.text(t.toast.resetSuccess, true)).toBeVisible();
      expect(counter.n).toBe(1);

      await page.unroute(RESET);
    });

    test("dismiss via Cancel closes dialog with zero requests", async ({
      page,
      adminUsersPage: users
    }) => {
      await users.gotoRow(target.email);
      const counter = await countResets(page);

      await users.startReset(target.email);
      await expect(users.dialog()).toBeVisible();

      await users.resetDialog.cancelButton().click();
      await expect(users.dialog()).not.toBeVisible();
      expect(counter.n).toBe(0);

      await page.unroute(RESET);
    });

    test("dismiss via Escape closes dialog with zero requests", async ({
      page,
      adminUsersPage: users
    }) => {
      await users.gotoRow(target.email);
      const counter = await countResets(page);

      await users.startReset(target.email);
      await expect(users.dialog()).toBeVisible();

      await page.keyboard.press("Escape");
      await expect(users.dialog()).not.toBeVisible();
      expect(counter.n).toBe(0);

      await page.unroute(RESET);
    });
  }
);

// Design (admin-reset-password, row 12): closing the dialog returns focus to
// the trigger. Same root cause as the lock dialog (TC-ADMINUSERS-065).
test(
  "Closing the reset dialog returns focus to the row menu button",
  { tag: "@TC-ADMINUSERS-066" },
  async ({ adminUsersPage: users }) => {
    // BUG: defects/admin-users.md#bug-adminusers-03
    test.fail();
    await users.gotoRow(target.email);
    await users.startReset(target.email);
    await expect(users.dialog()).toBeVisible();

    await users.resetDialog.cancelButton().click();
    await expect(users.dialog()).not.toBeVisible();
    await expect(users.rowMenuButton(target.email)).toBeFocused({
      timeout: 2_000
    });
  }
);
