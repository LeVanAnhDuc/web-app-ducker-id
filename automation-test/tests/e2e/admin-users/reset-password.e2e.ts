import { test, expect } from "@fixtures";
import type { Page, Route } from "@playwright/test";
import {
  createAccount,
  findUserByEmail,
  type Account
} from "@helpers/accounts";
import { adminUserId } from "@helpers/adminUsers";

test.use({ role: "admin" });

// Admin reset-password (REQ-ADMUSERS-03) — the row-menu flow on /admin/users
// plus the admin-API guards behind it. Runs as admin (role fixture).
// Test cases: test-cases/admin-users.md (TC-ADMUSERS-050 … 059).
//
// The UI tests intercept POST /admin/users/:id/reset-password with
// `page.route`, so they never reset anything; the row they open belongs to a
// throwaway account (`target`) all the same. The endpoint's guards (format,
// existence, self) and the real reset are in
// tests/api/admin-users/reset-password.api.ts.
//
// The full round trip — old password rejected, the emailed temporary
// password signs in, the session is flagged to change it — is proven over
// HTTP in tests/api/admin-users/reset-password.api.ts. The forced change the
// user then goes through belongs to the password module.

const TARGET_NAME = "Reset Target";
const RESET_GLOB = "**/api/v1/admin/users/*/reset-password";

let target!: Account;
let targetId: string;

const goto = (page: Page, locale = "") =>
  page.goto(`${locale}/admin/users?search=${encodeURIComponent(target.email)}`);

/** Row locator for a user by email, scoped to table rows. */
const userRow = (page: Page, email: string) =>
  page.getByRole("row").filter({ hasText: email });

/** Opens the row-actions menu (`adminUsers.table.rowMenuLabel`). */
const openRowMenu = async (page: Page, rowMenuLabel = "User actions") => {
  await userRow(page, target.email)
    .getByRole("button", { name: rowMenuLabel })
    .click();
};

/** Intercepts the reset POST with a canned response — no real reset. */
const mockReset = async (
  page: Page,
  {
    status,
    body,
    delayMs
  }: { status: number; body: Record<string, unknown>; delayMs?: number }
) => {
  await page.route(RESET_GLOB, async (route: Route) => {
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
// 1. Happy path — mocked, no real reset.
// ---------------------------------------------------------------------------
test.describe("Admin reset-password — happy path (mocked)", () => {
  test(
    "admin resets a user via row menu — dialog, toast, announce, dialog closes",
    { tag: "@TC-ADMUSERS-050" },
    async ({ page }) => {
      await mockReset(page, { status: 200, body: mockOkBody() });
      await goto(page);
      await openRowMenu(page);
      await page.getByRole("menuitem", { name: "Reset password" }).click();

      await expect(
        page.getByRole("dialog", {
          name: new RegExp(`Reset password for ${TARGET_NAME}\\?`)
        })
      ).toBeVisible();
      await expect(
        page.getByText(
          `A password reset email will be sent to ${target.email}.`,
          { exact: false }
        )
      ).toBeVisible();

      await page.getByRole("button", { name: "Send reset" }).click();

      await expect(
        page.getByText("Reset email sent.", { exact: true })
      ).toBeVisible();
      await expect(page.getByRole("dialog")).not.toBeVisible();

      const announcer = page.locator("#announcer");
      await expect(announcer).toContainText(
        `Password reset email sent to ${TARGET_NAME}.`
      );

      await page.unroute(RESET_GLOB);
    }
  );

  test(
    "no dialog is rendered before any row action is triggered",
    { tag: "@TC-ADMUSERS-051" },
    async ({ page }) => {
      await goto(page);
      await expect(page.getByRole("dialog")).toHaveCount(0);
    }
  );
});

// ---------------------------------------------------------------------------
// 8. Data rendering — human name + email, never a raw id or i18n key.
// ---------------------------------------------------------------------------
test.describe("Admin reset-password — data rendering", () => {
  test(
    "dialog and toast render the target's name/email, never a raw i18n key",
    { tag: "@TC-ADMUSERS-054" },
    async ({ page }) => {
      await mockReset(page, { status: 200, body: mockOkBody() });
      await goto(page);
      await openRowMenu(page);
      await page.getByRole("menuitem", { name: "Reset password" }).click();

      await expect(
        page.getByRole("dialog").getByText(target.email)
      ).toBeVisible();
      await expect(page.getByText(/adminUsers\./)).toHaveCount(0);

      await page.getByRole("button", { name: "Send reset" }).click();
      await expect(
        page.getByText("Reset email sent.", { exact: true })
      ).toBeVisible();
      await expect(page.getByText(/adminUsers\./)).toHaveCount(0);

      await page.unroute(RESET_GLOB);
    }
  );
});

// ---------------------------------------------------------------------------
// 9. i18n (en + vi) — dialog, confirm button, toast, announce.
// ---------------------------------------------------------------------------
test.describe("Admin reset-password — i18n", () => {
  test(
    "EN: dialog + confirm + toast render English strings",
    { tag: "@TC-ADMUSERS-055" },
    async ({ page }) => {
      await mockReset(page, { status: 200, body: mockOkBody() });
      await goto(page);
      await openRowMenu(page);
      await page.getByRole("menuitem", { name: "Reset password" }).click();

      await expect(
        page.getByText(new RegExp(`Reset password for ${TARGET_NAME}\\?`))
      ).toBeVisible();
      await expect(
        page.getByText(
          "The user will be required to set a new password on next sign-in.",
          { exact: false }
        )
      ).toBeVisible();

      await page.getByRole("button", { name: "Send reset" }).click();
      await expect(
        page.getByText("Reset email sent.", { exact: true })
      ).toBeVisible();

      await page.unroute(RESET_GLOB);
    }
  );

  test(
    "VI: dialog + confirm + toast render Vietnamese strings",
    { tag: "@TC-ADMUSERS-056" },
    async ({ page }) => {
      await mockReset(page, { status: 200, body: mockOkBody() });
      await goto(page, "/vi");
      await openRowMenu(page, "Thao tác với người dùng");
      await page.getByRole("menuitem", { name: "Đặt lại mật khẩu" }).click();

      await expect(
        page.getByText(new RegExp(`Đặt lại mật khẩu cho ${TARGET_NAME}\\?`))
      ).toBeVisible();
      await expect(
        page.getByText("phải đặt mật khẩu mới khi đăng nhập lần tiếp theo", {
          exact: false
        })
      ).toBeVisible();

      await page.getByRole("button", { name: "Gửi email" }).click();
      await expect(
        page.getByText("Đã gửi email đặt lại mật khẩu.", { exact: true })
      ).toBeVisible();

      // No missing-message placeholders leaked into VI locale.
      await expect(page.getByText(/\[adminUsers\./)).toHaveCount(0);

      await page.unroute(RESET_GLOB);
    }
  );
});

// ---------------------------------------------------------------------------
// 10. Error / loading — BE 5xx, non-optimistic UI (mocked, no real mutation).
// ---------------------------------------------------------------------------
test.describe("Admin reset-password — error / loading", () => {
  test(
    "BE 500 on reset → error toast, confirm button re-enabled, dialog stays open",
    { tag: "@TC-ADMUSERS-057" },
    async ({ page }) => {
      await goto(page);
      await mockReset(page, {
        status: 500,
        body: { code: "INTERNAL_SERVER_ERROR", message: "boom" }
      });

      await openRowMenu(page);
      await page.getByRole("menuitem", { name: "Reset password" }).click();
      const confirmBtn = page.getByRole("button", { name: "Send reset" });
      await confirmBtn.click();

      // Global React Query mutationCache error handler for 5xx
      // (src/libs/query-client.ts).
      await expect(
        page.getByText("Server error. Please try again later.", {
          exact: true
        })
      ).toBeVisible();

      // Confirm button not stuck in loading — re-enabled / clickable again.
      await expect(confirmBtn).toBeEnabled();
      // Non-optimistic: the dialog stays open on error (no premature close).
      await expect(page.getByRole("dialog")).toBeVisible();

      await page.unroute(RESET_GLOB);
      await page.keyboard.press("Escape");
    }
  );
});

// ---------------------------------------------------------------------------
// 11. Mutation safety — double-submit exactly-one (mocked). The real
//     temp-password round trip lives in tests/api/admin-users/.
// ---------------------------------------------------------------------------
test.describe("Admin reset-password — mutation safety", () => {
  test(
    "double-submit: confirm button disables while pending, fires exactly one POST",
    { tag: "@TC-ADMUSERS-058" },
    async ({ page }) => {
      await goto(page);
      let postCount = 0;
      await page.route(RESET_GLOB, async (route: Route) => {
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

      await openRowMenu(page);
      await page.getByRole("menuitem", { name: "Reset password" }).click();
      const confirmBtn = page.getByRole("button", { name: "Send reset" });

      // Click once — CustomButton disables itself while mutation.isPending, the
      // app's actual double-submit guard. A second click can't land while
      // disabled, so we assert the guard directly instead of racing two clicks
      // (same approach as admin-users-lock/lock-unlock.e2e.ts).
      await confirmBtn.click();
      await expect(confirmBtn).toBeDisabled();

      await expect(
        page.getByText("Reset email sent.", { exact: true })
      ).toBeVisible();
      expect(postCount).toBe(1);

      await page.unroute(RESET_GLOB);
    }
  );
});

// ---------------------------------------------------------------------------
// 12. Accessibility — keyboard open/confirm, dismiss paths fire 0 requests.
// ---------------------------------------------------------------------------
test.describe("Admin reset-password — accessibility", () => {
  test(
    "keyboard: open menu via Enter, navigate to Reset password, Enter fires exactly one request",
    { tag: "@TC-ADMUSERS-059" },
    async ({ page }) => {
      await goto(page);
      let postCount = 0;
      await page.route(RESET_GLOB, async (route: Route) => {
        if (route.request().method() !== "POST") return route.continue();
        postCount += 1;
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(mockOkBody())
        });
      });

      const menuTrigger = userRow(page, target.email).getByRole("button", {
        name: "User actions"
      });
      await menuTrigger.focus();
      await page.keyboard.press("Enter");
      await expect(
        page.getByRole("menuitem", { name: "Reset password" })
      ).toBeVisible();

      await page.getByRole("menuitem", { name: "Reset password" }).click();
      const confirmBtn = page.getByRole("button", { name: "Send reset" });
      await confirmBtn.focus();
      await page.keyboard.press("Enter");

      await expect(
        page.getByText("Reset email sent.", { exact: true })
      ).toBeVisible();
      expect(postCount).toBe(1);

      await page.unroute(RESET_GLOB);
    }
  );

  test(
    "dismiss via Cancel closes dialog with zero requests",
    { tag: "@TC-ADMUSERS-059" },
    async ({ page }) => {
      await goto(page);
      let postCount = 0;
      await page.route(RESET_GLOB, async (route: Route) => {
        if (route.request().method() !== "POST") return route.continue();
        postCount += 1;
        await route.continue();
      });

      await openRowMenu(page);
      await page.getByRole("menuitem", { name: "Reset password" }).click();
      await expect(page.getByRole("dialog")).toBeVisible();

      await page.getByRole("button", { name: "Cancel" }).click();
      await expect(page.getByRole("dialog")).not.toBeVisible();
      expect(postCount).toBe(0);

      await page.unroute(RESET_GLOB);
    }
  );

  test(
    "dismiss via Escape closes dialog with zero requests",
    { tag: "@TC-ADMUSERS-059" },
    async ({ page }) => {
      await goto(page);
      let postCount = 0;
      await page.route(RESET_GLOB, async (route: Route) => {
        if (route.request().method() !== "POST") return route.continue();
        postCount += 1;
        await route.continue();
      });

      await openRowMenu(page);
      await page.getByRole("menuitem", { name: "Reset password" }).click();
      await expect(page.getByRole("dialog")).toBeVisible();

      await page.keyboard.press("Escape");
      await expect(page.getByRole("dialog")).not.toBeVisible();
      expect(postCount).toBe(0);

      await page.unroute(RESET_GLOB);
    }
  );
});
