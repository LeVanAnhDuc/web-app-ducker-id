import { test, expect } from "@/fixtures";
import type { Page } from "@playwright/test";
import { createApiClient } from "@/api";
import { adminUsersRoutes } from "@/api/admin-users.client";
import { dataOf } from "@/api/response";
import { ADMIN_EMAIL } from "@/config/accounts";
import { copy, copyVi, fill, serverMessage } from "@/data/copy";
import { SERVER_ERROR_TOAST } from "@/data/test-data";
import { AdminUsersPage } from "@/pages/admin/admin-users.page";
import { createAccount, findUserByEmail, type Account } from "@/utils/accounts";
import { adminUserId, ownUserId } from "@/utils/admin-users";

test.use({ role: "admin" });

// Admin lock / unlock (REQ-ADMINUSERS-02, -05) — the row-menu flow on
// /admin/users, plus the admin-API guards behind it. Runs as admin (role
// fixture). Test cases: test-cases/admin-users.md.
//
// Targets are two throwaway accounts: `lockTarget` starts every test active,
// `unlockTarget` starts every test locked. Neither is a seed account, so a run
// that dies half-way leaves nothing behind that another spec depends on; the
// teardown deletes both. The page is always opened with `?search=<email>` so
// the row is on screen however many accounts the database holds.
//
// The endpoint's guards (malformed / unknown id, self) and the sign-in
// consequence of a lock (active → locked → active as the account sees it)
// are proven over HTTP in tests/api/admin-users/lock-unlock.api.ts.

const LOCK_NAME = "Lock Target";
const UNLOCK_NAME = "Unlock Target";
const t = copy.adminUsers;

let lockTarget!: Account;
let unlockTarget!: Account;
let lockTargetId: string;
let unlockTargetId: string;

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
  lockTarget = await ensureAccount(lockTarget, "adm-lock-target", LOCK_NAME);
  unlockTarget = await ensureAccount(
    unlockTarget,
    "adm-unlock-target",
    UNLOCK_NAME
  );
  lockTargetId = await adminUserId(adminApi, lockTarget.email);
  unlockTargetId = await adminUserId(adminApi, unlockTarget.email);
  const admin = createApiClient(adminApi).adminUsers;
  expect((await admin.unlock(lockTargetId)).ok()).toBe(true);
  expect((await admin.lock(unlockTargetId)).ok()).toBe(true);
});

/** Counts the browser's calls matching `glob`, letting each through. */
const countRequests = async (page: Page, glob: string) => {
  const counter = { n: 0 };
  await page.route(glob, async (route) => {
    counter.n += 1;
    await route.continue();
  });
  return counter;
};

// ---------------------------------------------------------------------------
// Happy path — [ST] active → locked, locked → active
// ---------------------------------------------------------------------------
test(
  "Lock an active account from the row menu",
  { tag: ["@TC-ADMINUSERS-030", "@smoke"] },
  async ({ adminUsersPage: users }) => {
    await users.gotoRow(lockTarget.email);
    await expect(users.row(lockTarget.email)).toBeVisible();

    await users.startLock(lockTarget.email);
    await expect(
      users.dialog(users.lockDialog.lockTitle(LOCK_NAME))
    ).toBeVisible();
    await users.lockDialog.confirmLockButton().click();

    await expect(users.text(t.toast.lockSuccess, true)).toBeVisible();
    await expect(
      users.rowText(lockTarget.email, t.status.locked)
    ).toBeVisible();
    await expect(users.announcer()).toContainText(
      fill(t.announce.locked, { name: LOCK_NAME })
    );
  }
);

test(
  "Unlock a locked account from the row menu",
  { tag: ["@TC-ADMINUSERS-031", "@smoke"] },
  async ({ adminUsersPage: users }) => {
    await users.gotoRow(unlockTarget.email);
    await expect(
      users.rowText(unlockTarget.email, t.status.locked)
    ).toBeVisible();

    await users.startUnlock(unlockTarget.email);
    await expect(
      users.dialog(users.lockDialog.unlockTitle(UNLOCK_NAME))
    ).toBeVisible();
    await users.lockDialog.confirmUnlockButton().click();

    await expect(users.text(t.toast.unlockSuccess, true)).toBeVisible();
    await expect(
      users.rowText(unlockTarget.email, t.status.active)
    ).toBeVisible();
  }
);

// ---------------------------------------------------------------------------
// Error guessing — lock yourself from the UI
// ---------------------------------------------------------------------------
test.describe("lock yourself", () => {
  // Backstop: the admin's access token stays valid after a lock, so even a
  // regression that let the lock through is undone before the next spec.
  test.afterEach(async ({ adminApi }) => {
    await createApiClient(adminApi).adminUsers.unlock(
      await ownUserId(adminApi)
    );
  });

  test(
    "An admin cannot lock themself",
    { tag: ["@TC-ADMINUSERS-034", "@smoke"] },
    async ({ page, adminUsersPage: users }) => {
      await users.gotoRow(ADMIN_EMAIL);
      await users.startLock(ADMIN_EMAIL);
      await users.lockDialog.confirmLockButton().click();

      await expect(
        users.text(serverMessage.user.errors.cannotLockSelf)
      ).toBeVisible();
      await expect(users.text(t.toast.lockSuccess, true)).toHaveCount(0);
      await page.keyboard.press("Escape");
      await expect(users.rowText(ADMIN_EMAIL, t.status.active)).toBeVisible();
    }
  );
});

// ---------------------------------------------------------------------------
// Filter after mutation
// ---------------------------------------------------------------------------
test(
  "A locked account moves between status filters",
  { tag: "@TC-ADMINUSERS-037" },
  async ({ adminApi, adminUsersPage: users }) => {
    await createApiClient(adminApi).adminUsers.lock(lockTargetId);
    const q = `search=${encodeURIComponent(lockTarget.email)}`;
    await users.goto(`?${q}&status=locked`);
    await expect(users.row(lockTarget.email)).toBeVisible();

    await users.goto(`?${q}&status=active`);
    await expect(users.noMatch()).toBeVisible();
    await expect(users.text(lockTarget.email)).toHaveCount(0);
  }
);

// Design (docs/specs/admin-lock-unlock-user, row 6): after a lock under the
// Active filter the list refetches and the row leaves it — no stale row, no
// crash on the now-empty page.
test(
  "Locking a row under the Active filter removes it from the list",
  { tag: "@TC-ADMINUSERS-064" },
  async ({ adminUsersPage: users }) => {
    await users.goto(
      `?search=${encodeURIComponent(lockTarget.email)}&status=active`
    );
    await expect(users.row(lockTarget.email)).toBeVisible();

    await users.startLock(lockTarget.email);
    await users.lockDialog.confirmLockButton().click();
    await expect(users.text(t.toast.lockSuccess, true)).toBeVisible();

    await expect(users.row(lockTarget.email)).toHaveCount(0);
    await expect(users.noMatch()).toBeVisible();
  }
);

// ---------------------------------------------------------------------------
// Data rendering — human labels, not raw booleans
// ---------------------------------------------------------------------------
test(
  "Badge and row menu follow the account state",
  { tag: "@TC-ADMINUSERS-038" },
  async ({ page, adminUsersPage: users }) => {
    await users.gotoRow(lockTarget.email);
    await expect(
      users.rowText(lockTarget.email, t.status.active)
    ).toBeVisible();
    await users.openRowMenu(lockTarget.email);
    await expect(users.lockItem()).toBeVisible();
    await expect(users.unlockItem()).toHaveCount(0);
    await page.keyboard.press("Escape");
    await expect(users.text("true", true)).toHaveCount(0);

    await users.gotoRow(unlockTarget.email);
    await expect(
      users.rowText(unlockTarget.email, t.status.locked)
    ).toBeVisible();
    await users.openRowMenu(unlockTarget.email);
    await expect(users.unlockItem()).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(users.text("false", true)).toHaveCount(0);
  }
);

// ---------------------------------------------------------------------------
// i18n (en + vi)
// ---------------------------------------------------------------------------
test(
  "English lock dialog and toast",
  { tag: "@TC-ADMINUSERS-039" },
  async ({ adminUsersPage: users }) => {
    await users.gotoRow(lockTarget.email);
    await users.startLock(lockTarget.email);

    await expect(
      users.text(users.lockDialog.lockTitle(LOCK_NAME))
    ).toBeVisible();
    await expect(users.text(t.lockDialog.lockDescription)).toBeVisible();

    await users.lockDialog.confirmLockButton().click();
    await expect(users.text(t.toast.lockSuccess, true)).toBeVisible();
  }
);

test(
  "Vietnamese lock dialog, toast and badge",
  { tag: "@TC-ADMINUSERS-040" },
  async ({ page }) => {
    const users = new AdminUsersPage(page, copyVi, "/vi");
    const vi = copyVi.adminUsers;
    await users.gotoRow(lockTarget.email);
    await users.startLock(lockTarget.email);

    await expect(
      users.text(users.lockDialog.lockTitle(LOCK_NAME))
    ).toBeVisible();
    await expect(users.text(vi.lockDialog.lockDescription)).toBeVisible();

    await users.lockDialog.confirmLockButton().click();
    await expect(users.text(vi.toast.lockSuccess, true)).toBeVisible();
    await expect(
      users.rowText(lockTarget.email, vi.status.locked)
    ).toBeVisible();
    await expect(users.text(/\[adminUsers\./)).toHaveCount(0);
  }
);

// ---------------------------------------------------------------------------
// Error / loading — BE 5xx, non-optimistic UI
// ---------------------------------------------------------------------------
test(
  "A failed lock changes nothing on screen",
  { tag: "@TC-ADMINUSERS-041" },
  async ({ page, adminUsersPage: users }) => {
    await users.gotoRow(lockTarget.email);
    await expect(
      users.rowText(lockTarget.email, t.status.active)
    ).toBeVisible();

    await page.route(adminUsersRoutes.lock, (route) =>
      route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ code: "INTERNAL_SERVER_ERROR", message: "boom" })
      })
    );

    await users.startLock(lockTarget.email);
    const confirm = users.lockDialog.confirmLockButton();
    await confirm.click();

    await expect(users.text(SERVER_ERROR_TOAST, true)).toBeVisible();
    await expect(confirm).toBeEnabled();

    await page.unroute(adminUsersRoutes.lock);
    await page.keyboard.press("Escape");
    await expect(
      users.rowText(lockTarget.email, t.status.active)
    ).toBeVisible();
  }
);

// ---------------------------------------------------------------------------
// Mutation safety — idempotency, double-submit
// ---------------------------------------------------------------------------
test.describe(
  "Lock and unlock are idempotent",
  { tag: "@TC-ADMINUSERS-042" },
  () => {
    test("[ST] locking an already-locked user stays 200 and Locked", async ({
      adminApi,
      adminUsersPage: users
    }) => {
      const again =
        await createApiClient(adminApi).adminUsers.lock(unlockTargetId);
      expect(again.ok()).toBe(true);
      expect((await dataOf<{ isActive: boolean }>(again)).isActive).toBe(false);

      await users.gotoRow(unlockTarget.email);
      await expect(
        users.rowText(unlockTarget.email, t.status.locked)
      ).toBeVisible();
    });

    test("[ST] unlocking an already-active user stays 200, no error", async ({
      adminApi
    }) => {
      const res =
        await createApiClient(adminApi).adminUsers.unlock(lockTargetId);
      expect(res.ok()).toBe(true);
      expect((await dataOf<{ isActive: boolean }>(res)).isActive).toBe(true);
    });
  }
);

test(
  "Confirming twice sends one request",
  { tag: "@TC-ADMINUSERS-043" },
  async ({ page, adminUsersPage: users }) => {
    await users.gotoRow(lockTarget.email);
    await expect(
      users.rowText(lockTarget.email, t.status.active)
    ).toBeVisible();

    let patchCount = 0;
    const statuses: number[] = [];
    await page.route(adminUsersRoutes.lock, async (route) => {
      patchCount += 1;
      await new Promise((resolve) => setTimeout(resolve, 400));
      const response = await route.fetch();
      statuses.push(response.status());
      await route.fulfill({ response });
    });

    await users.startLock(lockTarget.email);
    const confirm = users.lockDialog.confirmLockButton();
    // CustomButton disables itself while the mutation is pending — that is
    // the app's double-submit guard, asserted directly.
    await confirm.click();
    await expect(confirm).toBeDisabled();

    await expect(
      users.text(t.toast.lockSuccess, true),
      `PATCH answered ${statuses.join(",")}`
    ).toBeVisible();
    expect(patchCount).toBe(1);
    await page.unroute(adminUsersRoutes.lock);
  }
);

// ---------------------------------------------------------------------------
// Accessibility — keyboard open/confirm, dismiss paths fire 0 requests
// ---------------------------------------------------------------------------
test.describe(
  "Keyboard confirm; Cancel and Escape send nothing",
  { tag: "@TC-ADMINUSERS-044" },
  () => {
    test("keyboard: open menu via Enter, confirm via Enter fires exactly one request", async ({
      page,
      adminUsersPage: users
    }) => {
      await users.gotoRow(lockTarget.email);
      await expect(
        users.rowText(lockTarget.email, t.status.active)
      ).toBeVisible();
      const counter = await countRequests(page, adminUsersRoutes.lock);

      await users.rowMenuButton(lockTarget.email).focus();
      await page.keyboard.press("Enter");
      await expect(users.lockItem()).toBeVisible();
      await users.lockItem().click();

      const confirm = users.lockDialog.confirmLockButton();
      await confirm.focus();
      await page.keyboard.press("Enter");

      await expect(users.text(t.toast.lockSuccess, true)).toBeVisible();
      expect(counter.n).toBe(1);
    });

    test("dismiss via Cancel closes dialog with zero requests", async ({
      page,
      adminUsersPage: users
    }) => {
      await users.gotoRow(lockTarget.email);
      const counter = await countRequests(page, adminUsersRoutes.lock);

      await users.startLock(lockTarget.email);
      await expect(users.dialog()).toBeVisible();

      await users.lockDialog.cancelButton().click();
      await expect(users.dialog()).not.toBeVisible();
      expect(counter.n).toBe(0);
    });

    test("dismiss via Escape closes dialog with zero requests", async ({
      page,
      adminUsersPage: users
    }) => {
      await users.gotoRow(unlockTarget.email);
      const counter = await countRequests(page, adminUsersRoutes.unlock);

      await users.startUnlock(unlockTarget.email);
      await expect(users.dialog()).toBeVisible();

      await page.keyboard.press("Escape");
      await expect(users.dialog()).not.toBeVisible();
      expect(counter.n).toBe(0);
    });
  }
);

// Design (admin-lock-unlock-user, row 12): closing the dialog returns focus to
// the trigger. The dialog opens from a dropdown menuitem that unmounts, so the
// table hands it the row's menu button to return to (useReturnFocus).
test(
  "Closing the lock dialog returns focus to the row menu button",
  { tag: "@TC-ADMINUSERS-065" },
  async ({ adminUsersPage: users }) => {
    await users.gotoRow(lockTarget.email);
    await users.startLock(lockTarget.email);
    await expect(users.dialog()).toBeVisible();

    await users.lockDialog.cancelButton().click();
    await expect(users.dialog()).not.toBeVisible();
    await expect(users.rowMenuButton(lockTarget.email)).toBeFocused({
      timeout: 2_000
    });
  }
);
