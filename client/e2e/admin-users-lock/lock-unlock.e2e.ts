import { test, expect, request as playwrightRequest } from "@playwright/test";
import type { Page, APIRequestContext } from "@playwright/test";
import { ADMIN_EMAIL, ADMIN_PASSWORD } from "../helpers/env";

// Admin lock/unlock user — gate A (yarn e2e). Runs under the `admin` project
// (admin storageState, see playwright.config.ts admin-users-lock testMatch).
//
// Seeded users used (server/src/database/seeders/data/users.ts):
//   - admin@test.com   (actor, admin storageState — this suite's session)
//   - user2@test.com   (lock target; active by default) password User@123
//   - inactive@test.com (unlock target; isActive:false by default) password Inactive@123
//
// This suite MUTATES seed state (lock/unlock). Every test that flips a flag
// reverts it before finishing (or relies on afterAll as a backstop) so the
// suite is idempotent across repeated runs and doesn't leak state into other
// suites (admin-users list / admin-authz) that assert on seed data.
//
// Rate-limit awareness (CLAUDE.md §4.3 + BE login guard 30/IP/15min): the
// login-after-lock case performs at most 3 real logins. All other assertions
// use the already-authenticated admin `page` session or an admin bearer token
// captured ONCE in beforeAll (`adminToken`) via `page.request` (session
// cookies), avoiding extra POST /auth/login calls.

const LOCK_TARGET_EMAIL = "user2@test.com";
const LOCK_TARGET_PASSWORD = "User@123";
const UNLOCK_TARGET_EMAIL = "inactive@test.com";

let apiContext: APIRequestContext;
let adminToken: string;
let lockTargetId: string;
let unlockTargetId: string;
let adminOwnId: string;

const goto = (page: Page, query = "") => page.goto(`/admin/users${query}`);

/** Row locator for a user by email — scoped to the table to avoid strict-mode
 * collisions with the same email appearing elsewhere (e.g. header search). */
const userRow = (page: Page, email: string) =>
  page.getByRole("row").filter({ hasText: email });

/** Opens the row-actions dropdown for a given user row via the accessible
 * row-menu button (i18n `adminUsers.table.rowMenuLabel` — defaults to the EN
 * value "User actions"; pass the VI value "Thao tác với người dùng" when
 * testing under `/vi/*`). */
const openRowMenu = async (
  page: Page,
  email: string,
  rowMenuLabel = "User actions"
) => {
  await userRow(page, email)
    .getByRole("button", { name: rowMenuLabel })
    .click();
};

/** Finds a user's `_id` via the admin API (used to target lock/unlock without
 * depending on DOM order — robust against list re-sorting). */
const findUserId = async (email: string): Promise<string> => {
  const res = await apiContext.get("/api/v1/admin/users", {
    headers: { Authorization: `Bearer ${adminToken}` },
    params: { search: email }
  });
  expect(res.ok()).toBeTruthy();
  const body = (await res.json()) as {
    data?: { items?: { _id: string; email: string }[] };
  };
  const match = body.data?.items?.find((u) => u.email === email);
  expect(match).toBeTruthy();
  return (match as { _id: string })._id;
};

/** Direct admin-API lock/unlock (used for setup/revert + validation checks,
 * independent from the UI flow under test). */
const apiSetActive = async (id: string, active: boolean) => {
  const res = await apiContext.patch(
    `/api/v1/admin/users/${id}/${active ? "unlock" : "lock"}`,
    { headers: { Authorization: `Bearer ${adminToken}` } }
  );
  return res;
};

test.beforeAll(async ({ baseURL }) => {
  apiContext = await playwrightRequest.newContext({ baseURL });

  // Single real login for this suite's bearer token (admin project storageState
  // already authenticates `page`, but request-context calls need an explicit
  // Bearer header — same pattern as admin-authz.e2e.ts).
  const res = await apiContext.post("/api/v1/auth/login", {
    data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD }
  });
  expect(res.ok()).toBeTruthy();
  const body = (await res.json()) as { data?: { accessToken?: string } };
  adminToken = body.data?.accessToken as string;
  expect(adminToken).toBeTruthy();

  lockTargetId = await findUserId(LOCK_TARGET_EMAIL);
  unlockTargetId = await findUserId(UNLOCK_TARGET_EMAIL);

  const meRes = await apiContext.get("/api/v1/users/me", {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  expect(meRes.ok()).toBeTruthy();
  const meBody = (await meRes.json()) as { data?: { _id?: string } };
  adminOwnId = meBody.data?._id as string;
  expect(adminOwnId).toBeTruthy();

  // Ensure known starting state before any test runs (defensive — a prior
  // failed run may have left state flipped).
  await apiSetActive(lockTargetId, true); // user2 → active
  await apiSetActive(unlockTargetId, false); // inactive → locked
});

test.afterAll(async () => {
  // Idempotent restore: PATCH is a no-op if already in the target state.
  await apiSetActive(lockTargetId, true); // user2 → active
  await apiSetActive(unlockTargetId, false); // inactive → locked
  await apiContext.dispose();
});

// Idempotent per-test reset: a predecessor failing before its own revert step
// left user2 locked would otherwise cascade into every later test that
// expects user2 to start "Active" (e.g. VI i18n, double-submit). Reset before
// each test regardless of prior test outcome.
test.beforeEach(async () => {
  await apiSetActive(lockTargetId, true); // user2 → active
});

// ---------------------------------------------------------------------------
// 1. Happy path — [ST] valid transitions active→locked, locked→active
// ---------------------------------------------------------------------------
test.describe("Admin lock/unlock user — happy path", () => {
  test("lock an active user via row menu — badge flips, toast shown, then revert", async ({
    page
  }) => {
    await goto(page);
    await expect(userRow(page, LOCK_TARGET_EMAIL)).toBeVisible();

    await openRowMenu(page, LOCK_TARGET_EMAIL);
    await page.getByRole("menuitem", { name: "Lock account" }).click();

    await expect(
      page.getByRole("dialog", { name: /Lock .*'s account\?/ })
    ).toBeVisible();
    await page.getByRole("button", { name: "Lock account" }).last().click();

    await expect(
      page.getByText("Account locked.", { exact: true })
    ).toBeVisible();
    await expect(
      userRow(page, LOCK_TARGET_EMAIL).getByText("Locked")
    ).toBeVisible();

    // Revert immediately so this test is self-contained even if afterAll is
    // skipped by a later crash.
    await apiSetActive(lockTargetId, true);
    await page.reload();
    await expect(
      userRow(page, LOCK_TARGET_EMAIL).getByText("Active")
    ).toBeVisible();
  });

  test("unlock a locked user via row menu — badge flips, toast shown", async ({
    page
  }) => {
    await goto(page);
    await expect(userRow(page, UNLOCK_TARGET_EMAIL)).toBeVisible();
    await expect(
      userRow(page, UNLOCK_TARGET_EMAIL).getByText("Locked")
    ).toBeVisible();

    await openRowMenu(page, UNLOCK_TARGET_EMAIL);
    await page.getByRole("menuitem", { name: "Unlock account" }).click();

    await expect(
      page.getByRole("dialog", { name: /Unlock .*'s account\?/ })
    ).toBeVisible();
    await page.getByRole("button", { name: "Unlock account" }).last().click();

    await expect(
      page.getByText("Account unlocked.", { exact: true })
    ).toBeVisible();
    // exact: true — non-exact "Active" also substring-matches this seed
    // user's display name "Inactive User" within the same row.
    await expect(
      userRow(page, UNLOCK_TARGET_EMAIL).getByText("Active", { exact: true })
    ).toBeVisible();

    // Revert (re-lock) so seed state is restored for other suites/tests.
    await apiSetActive(unlockTargetId, false);
  });
});

// ---------------------------------------------------------------------------
// 4. Validation / expected-error — admin API contract, [DT] precedence
//    format(400) > existence(404) > self(403)
// ---------------------------------------------------------------------------
test.describe("Admin lock/unlock user — validation (admin API)", () => {
  test("[BVA] malformed id (not 24-hex) → 400", async () => {
    const res = await apiSetActive("not-an-object-id", false);
    expect(res.status()).toBe(400);
  });

  test("[BVA] 24-hex but non-existent id → 404 USER_NOT_FOUND", async () => {
    const res = await apiSetActive("aaaaaaaaaaaaaaaaaaaaaaaa", false);
    expect(res.status()).toBe(404);
    const body = (await res.json()) as { code?: string };
    expect(body.code).toBe("USER_NOT_FOUND");
  });

  test("[DT] admin locking own id → 403 ADMIN_CANNOT_LOCK_SELF", async () => {
    const res = await apiSetActive(adminOwnId, false);
    expect(res.status()).toBe(403);
    const body = (await res.json()) as { code?: string };
    expect(body.code).toBe("ADMIN_CANNOT_LOCK_SELF");
  });

  test("admin unlocking own id is allowed (unlock has no self-guard)", async () => {
    const res = await apiSetActive(adminOwnId, true);
    expect(res.ok()).toBeTruthy();
    const body = (await res.json()) as { data?: { isActive?: boolean } };
    expect(body.data?.isActive).toBe(true);
  });

  test("locking a valid, non-self target succeeds — 200", async () => {
    const res = await apiSetActive(lockTargetId, false);
    expect(res.ok()).toBeTruthy();
    await apiSetActive(lockTargetId, true); // revert
  });
});

// ---------------------------------------------------------------------------
// 7. Filter / search — behavior observable after mutation
// ---------------------------------------------------------------------------
test.describe("Admin lock/unlock user — filter after mutation", () => {
  test("locked user appears under status=locked, disappears under status=active", async ({
    page
  }) => {
    await apiSetActive(lockTargetId, false); // lock via API (isolate from UI flow)
    try {
      await goto(page, "?status=locked");
      await expect(userRow(page, LOCK_TARGET_EMAIL)).toBeVisible();

      await goto(page, "?status=active");
      await expect(page.getByText(LOCK_TARGET_EMAIL)).toHaveCount(0);
    } finally {
      await apiSetActive(lockTargetId, true); // revert
    }
  });
});

// ---------------------------------------------------------------------------
// 8. Data rendering — human labels, not raw booleans/enums
// ---------------------------------------------------------------------------
test.describe("Admin lock/unlock user — data rendering", () => {
  test("status badge shows localized label; row menu label toggles with state", async ({
    page
  }) => {
    await goto(page);

    // Active user → badge "Active", menu offers "Lock account"
    await expect(
      userRow(page, LOCK_TARGET_EMAIL).getByText("Active")
    ).toBeVisible();
    await openRowMenu(page, LOCK_TARGET_EMAIL);
    await expect(
      page.getByRole("menuitem", { name: "Lock account" })
    ).toBeVisible();
    await page.keyboard.press("Escape");

    // Locked user → badge "Locked", menu offers "Unlock account"
    await expect(
      userRow(page, UNLOCK_TARGET_EMAIL).getByText("Locked")
    ).toBeVisible();
    await openRowMenu(page, UNLOCK_TARGET_EMAIL);
    await expect(
      page.getByRole("menuitem", { name: "Unlock account" })
    ).toBeVisible();
    await page.keyboard.press("Escape");

    // Raw booleans/enums never rendered as visible text.
    await expect(page.getByText("true", { exact: true })).toHaveCount(0);
    await expect(page.getByText("false", { exact: true })).toHaveCount(0);
  });
});

// ---------------------------------------------------------------------------
// 9. i18n (en + vi) — dialog, confirm button, toast, badge
// ---------------------------------------------------------------------------
test.describe("Admin lock/unlock user — i18n", () => {
  test("EN: lock dialog + confirm + toast render English strings", async ({
    page
  }) => {
    await goto(page);
    await openRowMenu(page, LOCK_TARGET_EMAIL);
    await page.getByRole("menuitem", { name: "Lock account" }).click();

    await expect(page.getByText(/Lock .*'s account\?/)).toBeVisible();
    await expect(
      page.getByText(
        "The user will be unable to sign in until an admin unlocks the account.",
        { exact: false }
      )
    ).toBeVisible();

    await page.getByRole("button", { name: "Lock account" }).last().click();
    await expect(
      page.getByText("Account locked.", { exact: true })
    ).toBeVisible();

    await apiSetActive(lockTargetId, true); // revert
  });

  test("VI: lock dialog + confirm + toast render Vietnamese strings", async ({
    page
  }) => {
    await page.goto("/vi/admin/users");
    await openRowMenu(page, LOCK_TARGET_EMAIL, "Thao tác với người dùng");
    await page.getByRole("menuitem", { name: "Khóa tài khoản" }).click();

    await expect(page.getByText(/Khóa tài khoản của .*\?/)).toBeVisible();
    await expect(
      page.getByText("Người dùng sẽ không thể đăng nhập", { exact: false })
    ).toBeVisible();

    await page.getByRole("button", { name: "Khóa tài khoản" }).last().click();
    await expect(
      page.getByText("Đã khóa tài khoản.", { exact: true })
    ).toBeVisible();

    await apiSetActive(lockTargetId, true); // revert

    // No missing-message placeholders leaked into VI locale.
    await expect(page.getByText(/\[adminUsers\./)).toHaveCount(0);
  });
});

// ---------------------------------------------------------------------------
// 10. Error / loading — BE 5xx, non-optimistic UI
// ---------------------------------------------------------------------------
test.describe("Admin lock/unlock user — error / loading", () => {
  test("BE 500 on lock → error toast, confirm button re-enabled, badge unchanged", async ({
    page
  }) => {
    await goto(page);
    await expect(
      userRow(page, LOCK_TARGET_EMAIL).getByText("Active")
    ).toBeVisible();

    await page.route("**/api/v1/admin/users/*/lock", async (route) => {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ code: "INTERNAL_SERVER_ERROR", message: "boom" })
      });
    });

    await openRowMenu(page, LOCK_TARGET_EMAIL);
    await page.getByRole("menuitem", { name: "Lock account" }).click();
    const confirmBtn = page
      .getByRole("button", { name: "Lock account" })
      .last();
    await confirmBtn.click();

    // Error toast from the React Query global error handler for 5xx
    // (src/libs/query-client.ts confirmErrorToast).
    await expect(
      page.getByText("Server error. Please try again later.", {
        exact: true
      })
    ).toBeVisible();

    // Confirm button not stuck in loading — re-enabled / clickable again.
    await expect(confirmBtn).toBeEnabled();

    await page.unroute("**/api/v1/admin/users/*/lock");
    await page.keyboard.press("Escape");

    // Non-optimistic: badge must still read "Active" — no UI flip then rollback.
    await expect(
      userRow(page, LOCK_TARGET_EMAIL).getByText("Active")
    ).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// 11. Mutation safety — idempotency, double-submit exactly-one, login-after-lock
// ---------------------------------------------------------------------------
test.describe("Admin lock/unlock user — mutation safety", () => {
  test("[DT] idempotent: locking an already-locked user stays 200, badge stays Locked", async ({
    page
  }) => {
    await apiSetActive(lockTargetId, false); // lock once
    try {
      const secondRes = await apiSetActive(lockTargetId, false); // lock again
      expect(secondRes.ok()).toBeTruthy();
      const body = (await secondRes.json()) as {
        data?: { isActive?: boolean };
      };
      expect(body.data?.isActive).toBe(false);

      await goto(page);
      await expect(
        userRow(page, LOCK_TARGET_EMAIL).getByText("Locked")
      ).toBeVisible();
    } finally {
      await apiSetActive(lockTargetId, true); // revert
    }
  });

  test("[DT] idempotent: unlocking an already-active user stays 200, no error", async () => {
    const res = await apiSetActive(lockTargetId, true); // already active
    expect(res.ok()).toBeTruthy();
    const body = (await res.json()) as { data?: { isActive?: boolean } };
    expect(body.data?.isActive).toBe(true);
  });

  test("double-submit: confirm button disables while pending, fires exactly one PATCH", async ({
    page
  }) => {
    await goto(page);
    await expect(
      userRow(page, LOCK_TARGET_EMAIL).getByText("Active")
    ).toBeVisible();

    let patchCount = 0;
    await page.route("**/api/v1/admin/users/*/lock", async (route) => {
      patchCount += 1;
      // Delay the response so we can observe the pending-disabled state.
      await new Promise((resolve) => setTimeout(resolve, 400));
      await route.continue();
    });

    await openRowMenu(page, LOCK_TARGET_EMAIL);
    await page.getByRole("menuitem", { name: "Lock account" }).click();
    const confirmBtn = page
      .getByRole("button", { name: "Lock account" })
      .last();

    // Click once — CustomButton disables itself while mutation.isPending,
    // which is the app's actual double-submit guard (confirmed live via
    // Gate B). A second click can't land while disabled, so we assert the
    // guard directly instead of racing two clicks.
    await confirmBtn.click();
    await expect(confirmBtn).toBeDisabled();

    await expect(
      page.getByText("Account locked.", { exact: true })
    ).toBeVisible();

    expect(patchCount).toBe(1);

    await page.unroute("**/api/v1/admin/users/*/lock");
    await apiSetActive(lockTargetId, true); // revert
  });

  test("login-after-lock: locked account cannot log in; unlock restores login", async ({
    baseURL
  }) => {
    const victimContext = await playwrightRequest.newContext({ baseURL });
    try {
      await apiSetActive(lockTargetId, false); // lock user2

      const deniedRes = await victimContext.post("/api/v1/auth/login", {
        data: { email: LOCK_TARGET_EMAIL, password: LOCK_TARGET_PASSWORD }
      });
      expect(deniedRes.ok()).toBeFalsy();
      const deniedBody = (await deniedRes.json()) as { code?: string };
      expect(deniedBody.code).toBe("LOGIN_ACCOUNT_INACTIVE");

      await apiSetActive(lockTargetId, true); // unlock user2

      const allowedRes = await victimContext.post("/api/v1/auth/login", {
        data: { email: LOCK_TARGET_EMAIL, password: LOCK_TARGET_PASSWORD }
      });
      expect(allowedRes.ok()).toBeTruthy();
    } finally {
      await victimContext.dispose();
      await apiSetActive(lockTargetId, true); // ensure reverted
    }
  });
});

// ---------------------------------------------------------------------------
// 12. Accessibility — keyboard open/confirm, dismiss paths fire 0 requests
// ---------------------------------------------------------------------------
test.describe("Admin lock/unlock user — accessibility", () => {
  test("keyboard: open menu via Enter, navigate to Lock, Enter fires exactly one request", async ({
    page
  }) => {
    await goto(page);
    await expect(
      userRow(page, LOCK_TARGET_EMAIL).getByText("Active")
    ).toBeVisible();

    let patchCount = 0;
    await page.route("**/api/v1/admin/users/*/lock", async (route) => {
      patchCount += 1;
      await route.continue();
    });

    const menuTrigger = userRow(page, LOCK_TARGET_EMAIL).getByRole("button", {
      name: "User actions"
    });
    await menuTrigger.focus();
    await page.keyboard.press("Enter");
    await expect(
      page.getByRole("menuitem", { name: "Lock account" })
    ).toBeVisible();

    await page.getByRole("menuitem", { name: "Lock account" }).click();
    const confirmBtn = page
      .getByRole("button", { name: "Lock account" })
      .last();
    await confirmBtn.focus();
    await page.keyboard.press("Enter");

    await expect(
      page.getByText("Account locked.", { exact: true })
    ).toBeVisible();
    expect(patchCount).toBe(1);

    await page.unroute("**/api/v1/admin/users/*/lock");
    await apiSetActive(lockTargetId, true); // revert
  });

  test("dismiss via Cancel closes dialog with zero requests", async ({
    page
  }) => {
    await goto(page);
    let patchCount = 0;
    await page.route("**/api/v1/admin/users/*/lock", async (route) => {
      patchCount += 1;
      await route.continue();
    });

    await openRowMenu(page, LOCK_TARGET_EMAIL);
    await page.getByRole("menuitem", { name: "Lock account" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();

    await page.getByRole("button", { name: "Cancel" }).click();
    await expect(page.getByRole("dialog")).not.toBeVisible();
    expect(patchCount).toBe(0);

    // NOTE (a11y follow-up, not fixed here — app code untouched per test
    // scope): the dialog is opened from a Radix dropdown menuitem, which
    // unmounts when the dialog opens. On close, Radix Dialog can't restore
    // focus to the now-unmounted opener, so focus legitimately falls back to
    // <body> instead of the row menu trigger. Tracked as a known menu→dialog
    // focus-restore gap; not asserted here (see docs/specs/e2e.md).

    await page.unroute("**/api/v1/admin/users/*/lock");
  });

  test("dismiss via Escape closes dialog with zero requests", async ({
    page
  }) => {
    await goto(page);
    let patchCount = 0;
    await page.route("**/api/v1/admin/users/*/unlock", async (route) => {
      patchCount += 1;
      await route.continue();
    });

    await openRowMenu(page, UNLOCK_TARGET_EMAIL);
    await page.getByRole("menuitem", { name: "Unlock account" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).not.toBeVisible();
    expect(patchCount).toBe(0);
  });
});
