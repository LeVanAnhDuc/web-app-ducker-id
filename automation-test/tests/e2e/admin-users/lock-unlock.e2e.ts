import { test, expect } from "@fixtures";
import type { Page } from "@playwright/test";
import {
  createAccount,
  findUserByEmail,
  type Account
} from "@helpers/accounts";
import { ADMIN_EMAIL } from "@helpers/env";
import { adminUserId, ownUserId, setActive } from "@helpers/adminUsers";

test.use({ role: "admin" });

// Admin lock / unlock (REQ-ADMUSERS-02) — the row-menu flow on /admin/users,
// plus the admin-API guards behind it. Runs as admin (role fixture).
// Test cases: test-cases/admin-users.md (TC-ADMUSERS-030 … 044).
//
// Targets are two throwaway accounts: `lockTarget` starts every test active,
// `unlockTarget` starts every test locked. Neither
// is a seed account, so a run that dies half-way leaves nothing behind that
// another spec depends on; the cleanup project deletes both. The page is
// always opened with `?search=<email>` so the row is on screen however many
// accounts the database holds.
//
// The endpoint's guards (malformed / unknown id, self) and the sign-in
// consequence of a lock (active → locked → active as the account sees it)
// are proven over HTTP in tests/api/admin-users/lock-unlock.api.ts.

let lockTarget!: Account;
let unlockTarget!: Account;
let lockTargetId: string;
let unlockTargetId: string;

const gotoRow = (page: Page, email: string, locale = "") =>
  page.goto(`${locale}/admin/users?search=${encodeURIComponent(email)}`);

/** Row locator for a user by email, scoped to table rows. */
const userRow = (page: Page, email: string) =>
  page.getByRole("row").filter({ hasText: email });

/** Opens the row-actions menu (`adminUsers.table.rowMenuLabel`). */
const openRowMenu = async (
  page: Page,
  email: string,
  rowMenuLabel = "User actions"
) => {
  await userRow(page, email)
    .getByRole("button", { name: rowMenuLabel })
    .click();
};

// Targets are (re)created lazily: an account is reused across the file while
// it exists and replaced when it does not (first test, or a parallel run's
// cleanup removed it).
const ensureAccount = async (
  current: Account | undefined,
  tag: string,
  fullName: string
) =>
  current && (await findUserByEmail(current.email))
    ? current
    : createAccount({ tag, fullName });

// Every test starts from the same state, whatever the previous one left.
test.beforeEach(async ({ adminApi }) => {
  lockTarget = await ensureAccount(
    lockTarget,
    "adm-lock-target",
    "Lock Target"
  );
  unlockTarget = await ensureAccount(
    unlockTarget,
    "adm-unlock-target",
    "Unlock Target"
  );
  lockTargetId = await adminUserId(adminApi, lockTarget.email);
  unlockTargetId = await adminUserId(adminApi, unlockTarget.email);
  expect((await setActive(adminApi, lockTargetId, true)).ok()).toBe(true);
  expect((await setActive(adminApi, unlockTargetId, false)).ok()).toBe(true);
});

// ---------------------------------------------------------------------------
// Happy path — [ST] active → locked, locked → active
// ---------------------------------------------------------------------------
test.describe("Admin lock/unlock user — happy path", () => {
  test(
    "lock an active user via row menu — badge flips, toast shown",
    { tag: "@TC-ADMUSERS-030" },
    async ({ page }) => {
      await gotoRow(page, lockTarget.email);
      await expect(userRow(page, lockTarget.email)).toBeVisible();

      await openRowMenu(page, lockTarget.email);
      await page.getByRole("menuitem", { name: "Lock account" }).click();

      await expect(
        page.getByRole("dialog", { name: "Lock Lock Target's account?" })
      ).toBeVisible();
      await page.getByRole("button", { name: "Lock account" }).last().click();

      await expect(
        page.getByText("Account locked.", { exact: true })
      ).toBeVisible();
      await expect(
        userRow(page, lockTarget.email).getByText("Locked", { exact: true })
      ).toBeVisible();
      await expect(page.locator("#announcer")).toContainText(
        "Lock Target's account locked."
      );
    }
  );

  test(
    "unlock a locked user via row menu — badge flips, toast shown",
    { tag: "@TC-ADMUSERS-031" },
    async ({ page }) => {
      await gotoRow(page, unlockTarget.email);
      await expect(
        userRow(page, unlockTarget.email).getByText("Locked", { exact: true })
      ).toBeVisible();

      await openRowMenu(page, unlockTarget.email);
      await page.getByRole("menuitem", { name: "Unlock account" }).click();

      await expect(
        page.getByRole("dialog", { name: "Unlock Unlock Target's account?" })
      ).toBeVisible();
      await page.getByRole("button", { name: "Unlock account" }).last().click();

      await expect(
        page.getByText("Account unlocked.", { exact: true })
      ).toBeVisible();
      await expect(
        userRow(page, unlockTarget.email).getByText("Active", { exact: true })
      ).toBeVisible();
    }
  );
});

// ---------------------------------------------------------------------------
// Error guessing — lock yourself from the UI
// ---------------------------------------------------------------------------
test.describe("Admin lock/unlock user — lock yourself", () => {
  // Backstop: the admin's access token stays valid after a lock, so even a
  // regression that let the lock through is undone before the next spec.
  test.afterEach(async ({ adminApi }) => {
    await setActive(adminApi, await ownUserId(adminApi), true);
  });

  test(
    "[EG] locking your own row shows the refusal and leaves you Active",
    { tag: "@TC-ADMUSERS-034" },
    async ({ page }) => {
      await gotoRow(page, ADMIN_EMAIL);
      await openRowMenu(page, ADMIN_EMAIL);
      await page.getByRole("menuitem", { name: "Lock account" }).click();
      await page.getByRole("button", { name: "Lock account" }).last().click();

      await expect(
        page.getByText("You cannot lock your own account")
      ).toBeVisible();
      await expect(
        page.getByText("Account locked.", { exact: true })
      ).toHaveCount(0);
      await page.keyboard.press("Escape");
      await expect(
        userRow(page, ADMIN_EMAIL).getByText("Active", { exact: true })
      ).toBeVisible();
    }
  );
});

// ---------------------------------------------------------------------------
// Filter after mutation
// ---------------------------------------------------------------------------
test.describe("Admin lock/unlock user — filter after mutation", () => {
  test(
    "locked user appears under status=locked, disappears under status=active",
    { tag: "@TC-ADMUSERS-037" },
    async ({ page, adminApi }) => {
      await setActive(adminApi, lockTargetId, false);
      const q = `search=${encodeURIComponent(lockTarget.email)}`;
      await page.goto(`/admin/users?${q}&status=locked`);
      await expect(userRow(page, lockTarget.email)).toBeVisible();

      await page.goto(`/admin/users?${q}&status=active`);
      await expect(page.getByText("No users match")).toBeVisible();
      await expect(page.getByText(lockTarget.email)).toHaveCount(0);
    }
  );
});

// ---------------------------------------------------------------------------
// Data rendering — human labels, not raw booleans
// ---------------------------------------------------------------------------
test.describe("Admin lock/unlock user — data rendering", () => {
  test(
    "status badge shows a label and the row menu offers the opposite action",
    { tag: "@TC-ADMUSERS-038" },
    async ({ page }) => {
      await gotoRow(page, lockTarget.email);
      await expect(
        userRow(page, lockTarget.email).getByText("Active", { exact: true })
      ).toBeVisible();
      await openRowMenu(page, lockTarget.email);
      await expect(
        page.getByRole("menuitem", { name: "Lock account" })
      ).toBeVisible();
      await expect(
        page.getByRole("menuitem", { name: "Unlock account" })
      ).toHaveCount(0);
      await page.keyboard.press("Escape");
      await expect(page.getByText("true", { exact: true })).toHaveCount(0);

      await gotoRow(page, unlockTarget.email);
      await expect(
        userRow(page, unlockTarget.email).getByText("Locked", { exact: true })
      ).toBeVisible();
      await openRowMenu(page, unlockTarget.email);
      await expect(
        page.getByRole("menuitem", { name: "Unlock account" })
      ).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(page.getByText("false", { exact: true })).toHaveCount(0);
    }
  );
});

// ---------------------------------------------------------------------------
// i18n (en + vi)
// ---------------------------------------------------------------------------
test.describe("Admin lock/unlock user — i18n", () => {
  test(
    "EN: lock dialog + confirm + toast render English strings",
    { tag: "@TC-ADMUSERS-039" },
    async ({ page }) => {
      await gotoRow(page, lockTarget.email);
      await openRowMenu(page, lockTarget.email);
      await page.getByRole("menuitem", { name: "Lock account" }).click();

      await expect(page.getByText("Lock Lock Target's account?")).toBeVisible();
      await expect(
        page.getByText(
          "The user will be unable to sign in until an admin unlocks the account."
        )
      ).toBeVisible();

      await page.getByRole("button", { name: "Lock account" }).last().click();
      await expect(
        page.getByText("Account locked.", { exact: true })
      ).toBeVisible();
    }
  );

  test(
    "VI: lock dialog + confirm + toast render Vietnamese strings",
    { tag: "@TC-ADMUSERS-040" },
    async ({ page }) => {
      await gotoRow(page, lockTarget.email, "/vi");
      await openRowMenu(page, lockTarget.email, "Thao tác với người dùng");
      await page.getByRole("menuitem", { name: "Khóa tài khoản" }).click();

      await expect(
        page.getByText("Khóa tài khoản của Lock Target?")
      ).toBeVisible();
      await expect(
        page.getByText(
          "Người dùng sẽ không thể đăng nhập cho tới khi admin mở khóa."
        )
      ).toBeVisible();

      await page.getByRole("button", { name: "Khóa tài khoản" }).last().click();
      await expect(
        page.getByText("Đã khóa tài khoản.", { exact: true })
      ).toBeVisible();
      await expect(
        userRow(page, lockTarget.email).getByText("Đã khóa", { exact: true })
      ).toBeVisible();
      await expect(page.getByText(/\[adminUsers\./)).toHaveCount(0);
    }
  );
});

// ---------------------------------------------------------------------------
// Error / loading — BE 5xx, non-optimistic UI
// ---------------------------------------------------------------------------
test.describe("Admin lock/unlock user — error / loading", () => {
  test(
    "BE 500 on lock → error toast, confirm button re-enabled, badge unchanged",
    { tag: "@TC-ADMUSERS-041" },
    async ({ page }) => {
      await gotoRow(page, lockTarget.email);
      await expect(
        userRow(page, lockTarget.email).getByText("Active", { exact: true })
      ).toBeVisible();

      await page.route("**/api/v1/admin/users/*/lock", (route) =>
        route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({
            code: "INTERNAL_SERVER_ERROR",
            message: "boom"
          })
        })
      );

      await openRowMenu(page, lockTarget.email);
      await page.getByRole("menuitem", { name: "Lock account" }).click();
      const confirmBtn = page
        .getByRole("button", { name: "Lock account" })
        .last();
      await confirmBtn.click();

      await expect(
        page.getByText("Server error. Please try again later.", { exact: true })
      ).toBeVisible();
      await expect(confirmBtn).toBeEnabled();

      await page.unroute("**/api/v1/admin/users/*/lock");
      await page.keyboard.press("Escape");
      await expect(
        userRow(page, lockTarget.email).getByText("Active", { exact: true })
      ).toBeVisible();
    }
  );
});

// ---------------------------------------------------------------------------
// Mutation safety — idempotency, double-submit
// ---------------------------------------------------------------------------
test.describe("Admin lock/unlock user — mutation safety", () => {
  test(
    "[ST] locking an already-locked user stays 200 and Locked",
    { tag: "@TC-ADMUSERS-042" },
    async ({ page, adminApi }) => {
      const again = await setActive(adminApi, unlockTargetId, false);
      expect(again.ok()).toBe(true);
      expect(
        ((await again.json()) as { data: { isActive: boolean } }).data.isActive
      ).toBe(false);

      await gotoRow(page, unlockTarget.email);
      await expect(
        userRow(page, unlockTarget.email).getByText("Locked", { exact: true })
      ).toBeVisible();
    }
  );

  test(
    "[ST] unlocking an already-active user stays 200, no error",
    { tag: "@TC-ADMUSERS-042" },
    async ({ adminApi }) => {
      const res = await setActive(adminApi, lockTargetId, true);
      expect(res.ok()).toBe(true);
      expect(
        ((await res.json()) as { data: { isActive: boolean } }).data.isActive
      ).toBe(true);
    }
  );

  test(
    "double-submit: confirm button disables while pending, fires exactly one PATCH",
    { tag: "@TC-ADMUSERS-043" },
    async ({ page }) => {
      await gotoRow(page, lockTarget.email);
      await expect(
        userRow(page, lockTarget.email).getByText("Active", { exact: true })
      ).toBeVisible();

      let patchCount = 0;
      const statuses: number[] = [];
      await page.route("**/api/v1/admin/users/*/lock", async (route) => {
        patchCount += 1;
        await new Promise((resolve) => setTimeout(resolve, 400));
        const response = await route.fetch();
        statuses.push(response.status());
        await route.fulfill({ response });
      });

      await openRowMenu(page, lockTarget.email);
      await page.getByRole("menuitem", { name: "Lock account" }).click();
      const confirmBtn = page
        .getByRole("button", { name: "Lock account" })
        .last();
      // CustomButton disables itself while the mutation is pending — that is
      // the app's double-submit guard, asserted directly.
      await confirmBtn.click();
      await expect(confirmBtn).toBeDisabled();

      await expect(
        page.getByText("Account locked.", { exact: true }),
        `PATCH answered ${statuses.join(",")}`
      ).toBeVisible();
      expect(patchCount).toBe(1);
      await page.unroute("**/api/v1/admin/users/*/lock");
    }
  );
});

// ---------------------------------------------------------------------------
// Accessibility — keyboard open/confirm, dismiss paths fire 0 requests
// ---------------------------------------------------------------------------
test.describe("Admin lock/unlock user — accessibility", () => {
  const countRequests = async (page: Page, glob: string) => {
    const counter = { n: 0 };
    await page.route(glob, async (route) => {
      counter.n += 1;
      await route.continue();
    });
    return counter;
  };

  test(
    "keyboard: open menu via Enter, confirm via Enter fires exactly one request",
    { tag: "@TC-ADMUSERS-044" },
    async ({ page }) => {
      await gotoRow(page, lockTarget.email);
      await expect(
        userRow(page, lockTarget.email).getByText("Active", { exact: true })
      ).toBeVisible();
      const counter = await countRequests(page, "**/api/v1/admin/users/*/lock");

      const trigger = userRow(page, lockTarget.email).getByRole("button", {
        name: "User actions"
      });
      await trigger.focus();
      await page.keyboard.press("Enter");
      const item = page.getByRole("menuitem", { name: "Lock account" });
      await expect(item).toBeVisible();
      await item.click();

      const confirmBtn = page
        .getByRole("button", { name: "Lock account" })
        .last();
      await confirmBtn.focus();
      await page.keyboard.press("Enter");

      await expect(
        page.getByText("Account locked.", { exact: true })
      ).toBeVisible();
      expect(counter.n).toBe(1);
    }
  );

  test(
    "dismiss via Cancel closes dialog with zero requests",
    { tag: "@TC-ADMUSERS-044" },
    async ({ page }) => {
      await gotoRow(page, lockTarget.email);
      const counter = await countRequests(page, "**/api/v1/admin/users/*/lock");

      await openRowMenu(page, lockTarget.email);
      await page.getByRole("menuitem", { name: "Lock account" }).click();
      await expect(page.getByRole("dialog")).toBeVisible();

      await page.getByRole("button", { name: "Cancel" }).click();
      await expect(page.getByRole("dialog")).not.toBeVisible();
      expect(counter.n).toBe(0);
      // Known a11y gap (not asserted): the dialog opens from a dropdown
      // menuitem that unmounts, so on close focus falls back to <body>
      // rather than the row's menu trigger.
    }
  );

  test(
    "dismiss via Escape closes dialog with zero requests",
    { tag: "@TC-ADMUSERS-044" },
    async ({ page }) => {
      await gotoRow(page, unlockTarget.email);
      const counter = await countRequests(
        page,
        "**/api/v1/admin/users/*/unlock"
      );

      await openRowMenu(page, unlockTarget.email);
      await page.getByRole("menuitem", { name: "Unlock account" }).click();
      await expect(page.getByRole("dialog")).toBeVisible();

      await page.keyboard.press("Escape");
      await expect(page.getByRole("dialog")).not.toBeVisible();
      expect(counter.n).toBe(0);
    }
  );
});
