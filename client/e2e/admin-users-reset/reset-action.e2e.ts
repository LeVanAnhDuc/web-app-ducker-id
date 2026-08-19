import { test, expect, request as playwrightRequest } from "@playwright/test";
import type { Page, APIRequestContext, Route } from "@playwright/test";
import { ADMIN_EMAIL, ADMIN_PASSWORD } from "../helpers/env";

// Admin reset-password (S1) — gate A (yarn e2e). Runs under the `admin`
// project (admin storageState, see playwright.config.ts admin-users-reset
// testMatch).
//
// Seeded users used (server/src/database/seeders/data/users.ts):
//   - admin@test.com    (actor, admin storageState — this suite's session;
//     also the SELF-reset-guard target via /users/me, like admin-users-lock)
//   - user2@test.com    (UI/mock target — every network call in the "UI"
//     tests below is intercepted via page.route, so this suite performs ZERO
//     real mutations against user2's real data)
//   - unverified@test.com (REAL-mutation target for the single "valid,
//     non-self target -> 200" contract check — see rationale on that test)
//
// Non-admin AuthZ (403) and token-less AuthN (401) for this endpoint are
// covered in `../admin-authz/admin-authz.e2e.ts` (matrix rows #2/#3),
// consistent with how that file already covers admin lock/unlock instead of
// duplicating the check in each feature's own suite.
//
// KNOWN GAP (see docs/specs/admin-reset-password/e2e.md > Prerequisites):
// `adminResetPassword` returns only `{ _id, email }` — the generated temp
// password is emailed (BullMQ -> SMTP) and never surfaced over any
// HTTP-observable channel in this environment. That makes the full
// "reset -> login with temp pw -> old pw rejected" round trip untestable
// without new infra; see the `test.fixme` below for the detailed reason.

const UI_TARGET_EMAIL = "user2@test.com";
const UI_TARGET_NAME = "John Doe";
// verifiedEmail:false -> EmailVerifiedGuard rejects password-login for this
// user REGARDLESS of password (see server password-login.strategy.ts), so a
// REAL reset here never actually locks anyone out of a login that would
// otherwise have worked, and is safely re-runnable (each run just assigns
// another unknown-but-irrelevant password).
const SAFE_REAL_TARGET_EMAIL = "unverified@test.com";

const RESET_GLOB = "**/api/v1/admin/users/*/reset-password";

let apiContext: APIRequestContext;
let adminToken: string;
let adminOwnId: string;
let safeTargetId: string;

const goto = (page: Page, query = "") => page.goto(`/admin/users${query}`);

/** Row locator for a user by email — scoped to the table to avoid strict-mode
 * collisions with the same email appearing elsewhere (e.g. header search). */
const userRow = (page: Page, email: string) =>
  page.getByRole("row").filter({ hasText: email });

/** Opens the row-actions dropdown for a given user row via the accessible
 * row-menu button (i18n `adminUsers.table.rowMenuLabel`). */
const openRowMenu = async (
  page: Page,
  email: string,
  rowMenuLabel = "User actions"
) => {
  await userRow(page, email)
    .getByRole("button", { name: rowMenuLabel })
    .click();
};

/** Finds a user's `_id` via the admin API. */
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

/** Direct admin-API reset (used for the real BE-contract checks). */
const apiReset = async (id: string) =>
  apiContext.post(`/api/v1/admin/users/${id}/reset-password`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });

/** Intercepts POST /api/v1/admin/users/:id/reset-password with a mocked
 * response, so the UI-level tests below never issue a real reset. */
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

const mockOkBody = {
  data: { _id: "000000000000000000000099", email: UI_TARGET_EMAIL }
};

test.beforeAll(async ({ baseURL }) => {
  apiContext = await playwrightRequest.newContext({ baseURL });

  const res = await apiContext.post("/api/v1/auth/login", {
    data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD }
  });
  expect(res.ok()).toBeTruthy();
  const body = (await res.json()) as { data?: { accessToken?: string } };
  adminToken = body.data?.accessToken as string;
  expect(adminToken).toBeTruthy();

  const meRes = await apiContext.get("/api/v1/users/me", {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  expect(meRes.ok()).toBeTruthy();
  const meBody = (await meRes.json()) as { data?: { _id?: string } };
  adminOwnId = meBody.data?._id as string;
  expect(adminOwnId).toBeTruthy();

  safeTargetId = await findUserId(SAFE_REAL_TARGET_EMAIL);
});

test.afterAll(async () => {
  await apiContext.dispose();
});

// ---------------------------------------------------------------------------
// 1. Happy path — mocked (Gate A+B safe, zero real mutation).
// ---------------------------------------------------------------------------
test.describe("Admin reset-password — happy path (mocked)", () => {
  test("admin resets a user via row menu — dialog, toast, announce, dialog closes", async ({
    page
  }) => {
    await mockReset(page, { status: 200, body: mockOkBody });
    await goto(page);
    await openRowMenu(page, UI_TARGET_EMAIL);
    await page.getByRole("menuitem", { name: "Reset password" }).click();

    await expect(
      page.getByRole("dialog", {
        name: new RegExp(`Reset password for ${UI_TARGET_NAME}\\?`)
      })
    ).toBeVisible();
    await expect(
      page.getByText(
        `A password reset email will be sent to ${UI_TARGET_EMAIL}.`,
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
      `Password reset email sent to ${UI_TARGET_NAME}.`
    );

    await page.unroute(RESET_GLOB);
  });

  test("no dialog is rendered before any row action is triggered", async ({
    page
  }) => {
    await goto(page);
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });
});

// ---------------------------------------------------------------------------
// 4. Validation / expected-error — admin API contract, [DT] precedence
//    format(400) > existence(404) > self(403) > success(200).
// ---------------------------------------------------------------------------
test.describe("Admin reset-password — validation (admin API)", () => {
  test("[BVA] malformed id (not 24-hex) → 400", async () => {
    const res = await apiReset("not-an-object-id");
    expect(res.status()).toBe(400);
  });

  test("[BVA] 24-hex but non-existent id → 404 USER_NOT_FOUND", async () => {
    const res = await apiReset("aaaaaaaaaaaaaaaaaaaaaaaa");
    expect(res.status()).toBe(404);
    const body = (await res.json()) as { code?: string };
    expect(body.code).toBe("USER_NOT_FOUND");
  });

  test("[DT] admin resetting own id → 403 ADMIN_CANNOT_RESET_SELF", async () => {
    const res = await apiReset(adminOwnId);
    expect(res.status()).toBe(403);
    const body = (await res.json()) as { code?: string };
    expect(body.code).toBe("ADMIN_CANNOT_RESET_SELF");
  });

  // REAL mutation — see SAFE_REAL_TARGET_EMAIL rationale above: unverified@
  // test.com can never complete a password-login regardless of its password
  // (EmailVerifiedGuard fires first), so resetting it for real here has no
  // observable side effect and is safely idempotent across repeated runs.
  test("resetting a valid, non-self target succeeds — 200 { _id, email } (real, safe target)", async () => {
    const res = await apiReset(safeTargetId);
    expect(res.ok()).toBeTruthy();
    const body = (await res.json()) as {
      data?: { _id?: string; email?: string };
    };
    expect(body.data?._id).toBe(safeTargetId);
    expect(body.data?.email).toBe(SAFE_REAL_TARGET_EMAIL);
  });
});

// ---------------------------------------------------------------------------
// 8. Data rendering — human name + email, never a raw id or i18n key.
// ---------------------------------------------------------------------------
test.describe("Admin reset-password — data rendering", () => {
  test("dialog and toast render the target's name/email, never a raw i18n key", async ({
    page
  }) => {
    await mockReset(page, { status: 200, body: mockOkBody });
    await goto(page);
    await openRowMenu(page, UI_TARGET_EMAIL);
    await page.getByRole("menuitem", { name: "Reset password" }).click();

    await expect(
      page.getByRole("dialog").getByText(UI_TARGET_EMAIL)
    ).toBeVisible();
    await expect(page.getByText(/adminUsers\./)).toHaveCount(0);

    await page.getByRole("button", { name: "Send reset" }).click();
    await expect(
      page.getByText("Reset email sent.", { exact: true })
    ).toBeVisible();
    await expect(page.getByText(/adminUsers\./)).toHaveCount(0);

    await page.unroute(RESET_GLOB);
  });
});

// ---------------------------------------------------------------------------
// 9. i18n (en + vi) — dialog, confirm button, toast, announce.
// ---------------------------------------------------------------------------
test.describe("Admin reset-password — i18n", () => {
  test("EN: dialog + confirm + toast render English strings", async ({
    page
  }) => {
    await mockReset(page, { status: 200, body: mockOkBody });
    await goto(page);
    await openRowMenu(page, UI_TARGET_EMAIL);
    await page.getByRole("menuitem", { name: "Reset password" }).click();

    await expect(
      page.getByText(new RegExp(`Reset password for ${UI_TARGET_NAME}\\?`))
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
  });

  test("VI: dialog + confirm + toast render Vietnamese strings", async ({
    page
  }) => {
    await mockReset(page, { status: 200, body: mockOkBody });
    await page.goto("/vi/admin/users");
    await openRowMenu(page, UI_TARGET_EMAIL, "Thao tác với người dùng");
    await page.getByRole("menuitem", { name: "Đặt lại mật khẩu" }).click();

    await expect(
      page.getByText(new RegExp(`Đặt lại mật khẩu cho ${UI_TARGET_NAME}\\?`))
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
  });
});

// ---------------------------------------------------------------------------
// 10. Error / loading — BE 5xx, non-optimistic UI (mocked, no real mutation).
// ---------------------------------------------------------------------------
test.describe("Admin reset-password — error / loading", () => {
  test("BE 500 on reset → error toast, confirm button re-enabled, dialog stays open", async ({
    page
  }) => {
    await goto(page);
    await mockReset(page, {
      status: 500,
      body: { code: "INTERNAL_SERVER_ERROR", message: "boom" }
    });

    await openRowMenu(page, UI_TARGET_EMAIL);
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
  });
});

// ---------------------------------------------------------------------------
// 11. Mutation safety — double-submit exactly-one (mocked); full temp-pw
//     round trip DEFERRED (test.fixme, see rationale below).
// ---------------------------------------------------------------------------
test.describe("Admin reset-password — mutation safety", () => {
  test("double-submit: confirm button disables while pending, fires exactly one POST", async ({
    page
  }) => {
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
        body: JSON.stringify(mockOkBody)
      });
    });

    await openRowMenu(page, UI_TARGET_EMAIL);
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
  });

  // BLOCKED (no silent gap — see docs/specs/admin-reset-password/e2e.md >
  // Prerequisites): `adminResetPassword` returns only `{ _id, email }` — the
  // generated temp password is dispatched by email (BullMQ -> SMTP) and never
  // surfaced over any HTTP-observable channel in this environment (no
  // Mailhog/test-inbox capture, no NODE_ENV=test echo field). Without it we
  // cannot (a) log in as the victim with the new temp password, or (b) safely
  // prove "the old password is now rejected" on a LOGIN-CAPABLE seed user:
  // the only currently-idle seed user (unverified@test.com, used above for
  // the safe 200 check) is blocked from password-login regardless of its
  // password (EmailVerifiedGuard fires before the password comparison), so
  // using it here would actually be validating the WRONG guard. Every other
  // seed user is either shared global auth state (user@test.com) or owned by
  // another suite (user2@test.com/admin-users-reset UI mocks,
  // inactive@test.com/admin-users-lock).
  // Needs: (1) a dedicated login-capable seed user reserved for this
  // scenario, and (2) a test-only way to read the generated temp password
  // (e.g. a NODE_ENV=test-only debug echo, or a Mailhog/test-inbox capture
  // service wired into the email dispatcher).
  test.fixme(
    "[ST] reset issues a working temp password; the OLD password is rejected afterward",
    async () => {}
  );
});

// ---------------------------------------------------------------------------
// 12. Accessibility — keyboard open/confirm, dismiss paths fire 0 requests.
// ---------------------------------------------------------------------------
test.describe("Admin reset-password — accessibility", () => {
  test("keyboard: open menu via Enter, navigate to Reset password, Enter fires exactly one request", async ({
    page
  }) => {
    await goto(page);
    let postCount = 0;
    await page.route(RESET_GLOB, async (route: Route) => {
      if (route.request().method() !== "POST") return route.continue();
      postCount += 1;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockOkBody)
      });
    });

    const menuTrigger = userRow(page, UI_TARGET_EMAIL).getByRole("button", {
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
  });

  test("dismiss via Cancel closes dialog with zero requests", async ({
    page
  }) => {
    await goto(page);
    let postCount = 0;
    await page.route(RESET_GLOB, async (route: Route) => {
      if (route.request().method() !== "POST") return route.continue();
      postCount += 1;
      await route.continue();
    });

    await openRowMenu(page, UI_TARGET_EMAIL);
    await page.getByRole("menuitem", { name: "Reset password" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();

    await page.getByRole("button", { name: "Cancel" }).click();
    await expect(page.getByRole("dialog")).not.toBeVisible();
    expect(postCount).toBe(0);

    await page.unroute(RESET_GLOB);
  });

  test("dismiss via Escape closes dialog with zero requests", async ({
    page
  }) => {
    await goto(page);
    let postCount = 0;
    await page.route(RESET_GLOB, async (route: Route) => {
      if (route.request().method() !== "POST") return route.continue();
      postCount += 1;
      await route.continue();
    });

    await openRowMenu(page, UI_TARGET_EMAIL);
    await page.getByRole("menuitem", { name: "Reset password" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).not.toBeVisible();
    expect(postCount).toBe(0);

    await page.unroute(RESET_GLOB);
  });
});
