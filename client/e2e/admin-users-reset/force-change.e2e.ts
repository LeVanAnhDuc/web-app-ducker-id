import { test, expect } from "@playwright/test";
import type { Page, Route } from "@playwright/test";
import { mockSessionWithClaims, fakeJwt } from "../helpers/session";
import {
  mockChangePassword,
  trackPatch,
  expectNoPatch
} from "../helpers/changePassword";

// Force change-password (S2). Runs under the `admin` Playwright project
// (playwright.config.ts admin-users-reset testMatch) but that default
// storageState is IRRELEVANT to nearly every test below: each test builds its
// own session by mocking `POST /api/v1/auth/token/refresh` (see
// ../helpers/session.ts) with a fabricated idToken carrying whatever
// `mustChangePassword` claim the scenario needs. This is a deliberate
// workaround for a real, documented infra gap (see "KNOWN GAP" below) rather
// than a stylistic choice -- see e2e.md > Prerequisites for the full
// rationale and the follow-up needed to remove it.
//
// KNOWN GAP: the only way to reach a genuinely mustChangePassword=true
// session for real is a real admin reset, and `adminResetPassword` returns
// only `{ _id, email }` -- the generated temp password is emailed and never
// surfaced over any HTTP-observable channel here. That makes the FULL, real
// end-to-end round trip (admin resets someone for real -> they log in with
// the emailed temp password -> get redirected -> change it -> land home)
// untestable without new infra (see the `test.fixme` below). Every test in
// this file instead verifies the FE mechanics (gate redirect, form
// validation, i18n, a11y, submit-success-lands-home) deterministically via
// mocking, which is the same trust boundary the app itself relies on:
// `jwt-decode` (src/hooks/useUserInfo.ts) never verifies the token signature
// client-side -- only the real BE does, on every protected request.

const CHANGE_PASSWORD_GLOB = "**/api/v1/auth/change-password";

const EN = {
  title: "Set a new password",
  currentLabel: "Temporary password",
  newLabel: "New password",
  confirmLabel: "Confirm new password",
  submit: "Set new password",
  redirectedAnnounce: "You must set a new password before continuing.",
  toastSuccess: "Password updated successfully"
} as const;

const VI = {
  title: "Đặt mật khẩu mới",
  currentLabel: "Mật khẩu tạm",
  newLabel: "Mật khẩu mới",
  confirmLabel: "Xác nhận mật khẩu mới",
  submit: "Đặt mật khẩu mới"
} as const;

const currentPassword = (page: Page, label: string = EN.currentLabel) =>
  page.getByLabel(label, { exact: true });
const newPassword = (page: Page, label: string = EN.newLabel) =>
  page.getByLabel(label, { exact: true });
const confirmPassword = (page: Page, label: string = EN.confirmLabel) =>
  page.getByLabel(label, { exact: true });
const submitButton = (page: Page, label: string = EN.submit) =>
  page.getByRole("button", { name: label });

// currentPassword is never verified client-side beyond "non-empty" -- its
// real BE verification is exercised via the mocked PATCH responses below, not
// by the literal value used here.
const TEMP_PASSWORD = "TempPass@123";
const NEW_PASSWORD = "NewPass@123";

/** A decodable (but unsigned/fake) token pair carrying mustChangePassword —
 * used as the PATCH /auth/change-password success body so any post-success
 * render (HOME, a follow-up useUserInfo() read) has a well-formed session. */
const buildTokens = (mustChangePassword: boolean) => {
  const exp = Math.floor(Date.now() / 1000) + 3600;
  return {
    accessToken: fakeJwt({ sub: "1", authId: "1", roles: "user", exp }),
    idToken: fakeJwt({
      sub: "1",
      name: "Victim User",
      email: "victim@test.com",
      mustChangePassword,
      exp
    }),
    expiresIn: 3600
  };
};

const mockChangePasswordSuccess = (page: Page) =>
  mockChangePassword(page, {
    status: 200,
    body: { data: buildTokens(false) }
  });

// ---------------------------------------------------------------------------
// 1. Happy path — redirect gate + full form round trip (mocked, Gate A+B).
// ---------------------------------------------------------------------------
test.describe("Force change-password — redirect gate + happy path (mocked)", () => {
  test("mustChangePassword=true redirects HOME -> /change-password; a successful change lands HOME", async ({
    page
  }) => {
    await mockSessionWithClaims(page, { mustChangePassword: true });
    await page.goto("/");

    await expect(page).toHaveURL(/\/change-password$/);
    await expect(page.getByRole("heading", { name: EN.title })).toBeVisible();
    const announcer = page.locator("#announcer");
    await expect(announcer).toContainText(EN.redirectedAnnounce);

    await mockChangePasswordSuccess(page);
    await currentPassword(page).fill(TEMP_PASSWORD);
    await newPassword(page).fill(NEW_PASSWORD);
    await confirmPassword(page).fill(NEW_PASSWORD);
    await submitButton(page).click();

    await expect(page.getByText(EN.toastSuccess)).toBeVisible();
    await expect(page).toHaveURL("/");

    await page.unroute(CHANGE_PASSWORD_GLOB);
  });
});

// ---------------------------------------------------------------------------
// 2. AuthN — unauthenticated visit redirects to /login (real, no mocking).
// ---------------------------------------------------------------------------
test.describe("Force change-password — authentication", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("unauthenticated visit to /change-password redirects to /login", async ({
    page
  }) => {
    await page.goto("/change-password");
    await expect(page).toHaveURL(/\/login/);
  });
});

// ---------------------------------------------------------------------------
// 3. AuthZ — deferred (design.md matrix row #3): /change-password is gated
//    only by the mustChangePassword claim, not by role, so there is no
//    distinct non-admin-vs-admin behavior beyond what the flag-driven gate
//    tests already cover. A genuine non-admin walk would need the non-admin
//    storageState project; admin-authz/ already covers /admin/* denial for
//    that project — repeating it here would be a duplicate, not new coverage.
// ---------------------------------------------------------------------------
test.describe("Force change-password — authorization", () => {
  test.fixme(
    "non-admin authenticated users see the same force-change behavior as any role (no distinct behavior to assert — see comment above)",
    async () => {}
  );
});

// ---------------------------------------------------------------------------
// 4. Validation — [EP] newPassword classes + [DT] current×new precedence.
// ---------------------------------------------------------------------------
test.describe("Force change-password — validation", () => {
  test.beforeEach(async ({ page }) => {
    await mockSessionWithClaims(page, { mustChangePassword: true });
    await page.goto("/change-password");
    await expect(page.getByRole("heading", { name: EN.title })).toBeVisible();
  });

  test("blocks confirm mismatch on the client (no API call)", async ({
    page
  }) => {
    const tracker = trackPatch(page);
    await currentPassword(page).fill(TEMP_PASSWORD);
    await newPassword(page).fill(NEW_PASSWORD);
    await confirmPassword(page).fill("Different@123");
    await submitButton(page).click();
    await expect(confirmPassword(page)).toHaveAttribute("aria-invalid", "true");
    expectNoPatch(tracker);
  });

  // [EP] invalid newPassword classes — client Zod (passwordSchema) blocks
  // before any BE call.
  const invalidNewPasswordClasses: ReadonlyArray<{
    label: string;
    value: string;
  }> = [
    { label: "empty", value: "" },
    { label: "missing an uppercase letter", value: "newpass@123" },
    { label: "missing a lowercase letter", value: "NEWPASS@123" },
    { label: "missing a digit", value: "NewPass@!!" },
    { label: "missing a special character", value: "NewPass123" }
  ];
  for (const { label, value } of invalidNewPasswordClasses) {
    test(`[EP] rejects new password ${label} (no API call)`, async ({
      page
    }) => {
      const tracker = trackPatch(page);
      await currentPassword(page).fill(TEMP_PASSWORD);
      await newPassword(page).fill(value);
      await confirmPassword(page).fill(value);
      await submitButton(page).click();
      await expect(newPassword(page)).toHaveAttribute("aria-invalid", "true");
      expectNoPatch(tracker);
    });
  }

  test("[EP] rejects an empty temporary (current) password (no API call)", async ({
    page
  }) => {
    const tracker = trackPatch(page);
    await newPassword(page).fill(NEW_PASSWORD);
    await confirmPassword(page).fill(NEW_PASSWORD);
    await currentPassword(page).fill("x");
    await currentPassword(page).fill("");
    await submitButton(page).click();
    await expect(currentPassword(page)).toHaveAttribute("aria-invalid", "true");
    expectNoPatch(tracker);
  });

  // [DT row i] currentWrong (temp sai) + newValid -> BE 400 -> inline field
  // error mapped to the currentPassword field (ForceChangePasswordForm's own
  // FIELD_ERROR_MAP, same mapping as ChangePasswordCard's).
  test("[DT] currentWrong + newValid → BE 400 wrong-current maps to an inline field error", async ({
    page
  }) => {
    await mockChangePassword(page, {
      status: 400,
      body: { code: "CHANGE_PASSWORD_WRONG_CURRENT", message: "Wrong current" }
    });
    await currentPassword(page).fill("WrongTemp@123");
    await newPassword(page).fill(NEW_PASSWORD);
    await confirmPassword(page).fill(NEW_PASSWORD);
    await submitButton(page).click();
    await expect(page.getByText("Current password is incorrect")).toBeVisible();
    await expect(currentPassword(page)).toHaveAttribute("aria-invalid", "true");
    await page.unroute(CHANGE_PASSWORD_GLOB);
  });

  // [DT row iii] currentOK + newInvalid -> client policy wins (no PATCH).
  test("[DT] currentOK + newInvalid → client policy blocks before any API call", async ({
    page
  }) => {
    const tracker = trackPatch(page);
    await currentPassword(page).fill(TEMP_PASSWORD);
    await newPassword(page).fill("newpass@123");
    await confirmPassword(page).fill("newpass@123");
    await submitButton(page).click();
    await expect(newPassword(page)).toHaveAttribute("aria-invalid", "true");
    expectNoPatch(tracker);
  });
});

// ---------------------------------------------------------------------------
// 5. Empty/null — flag-gated visibility, not literal empty state.
// ---------------------------------------------------------------------------
test.describe("Force change-password — empty/null (flag-gated visibility)", () => {
  test("mustChangePassword=false visiting /change-password directly redirects HOME", async ({
    page
  }) => {
    await mockSessionWithClaims(page, { mustChangePassword: false });
    await page.goto("/change-password");
    await expect(page).toHaveURL("/");
  });
});

// ---------------------------------------------------------------------------
// 6. Boundary — [BVA] newPassword length: min-1 / min / max / max+1.
// ---------------------------------------------------------------------------
test.describe("Force change-password — boundary (BVA)", () => {
  test.beforeEach(async ({ page }) => {
    await mockSessionWithClaims(page, { mustChangePassword: true });
    await page.goto("/change-password");
    await expect(page.getByRole("heading", { name: EN.title })).toBeVisible();
  });

  test("[BVA] rejects a new password of 7 characters (below the minimum, no API call)", async ({
    page
  }) => {
    const tracker = trackPatch(page);
    const sevenChars = "Ab@3xyz";
    expect(sevenChars).toHaveLength(7);
    await currentPassword(page).fill(TEMP_PASSWORD);
    await newPassword(page).fill(sevenChars);
    await confirmPassword(page).fill(sevenChars);
    await submitButton(page).click();
    await expect(newPassword(page)).toHaveAttribute("aria-invalid", "true");
    expectNoPatch(tracker);
  });

  test("[BVA] accepts a new password of exactly 8 characters (boundary, mocked 200)", async ({
    page
  }) => {
    const eightChars = "Ab@3xyzz";
    expect(eightChars).toHaveLength(8);
    await mockChangePasswordSuccess(page);
    await currentPassword(page).fill(TEMP_PASSWORD);
    await newPassword(page).fill(eightChars);
    await confirmPassword(page).fill(eightChars);
    await submitButton(page).click();
    await expect(page.getByText(EN.toastSuccess)).toBeVisible();
    await page.unroute(CHANGE_PASSWORD_GLOB);
  });

  test("[BVA] accepts a new password of exactly 128 characters (boundary, mocked 200)", async ({
    page
  }) => {
    const maxChars = "Ab@3" + "x".repeat(124); // 128 chars
    expect(maxChars).toHaveLength(128);
    await mockChangePasswordSuccess(page);
    await currentPassword(page).fill(TEMP_PASSWORD);
    await newPassword(page).fill(maxChars);
    await confirmPassword(page).fill(maxChars);
    await submitButton(page).click();
    await expect(page.getByText(EN.toastSuccess)).toBeVisible();
    await page.unroute(CHANGE_PASSWORD_GLOB);
  });

  test("[BVA] rejects a new password of 129 characters (above the maximum, no API call)", async ({
    page
  }) => {
    const tracker = trackPatch(page);
    const tooLong = "Ab@3" + "x".repeat(125); // 129 chars
    expect(tooLong).toHaveLength(129);
    await currentPassword(page).fill(TEMP_PASSWORD);
    await newPassword(page).fill(tooLong);
    await confirmPassword(page).fill(tooLong);
    await submitButton(page).click();
    await expect(newPassword(page)).toHaveAttribute("aria-invalid", "true");
    expectNoPatch(tracker);
  });
});

// ---------------------------------------------------------------------------
// 8. Data rendering — i18n labels only, never a raw key or the raw claim.
// ---------------------------------------------------------------------------
test.describe("Force change-password — data rendering", () => {
  test("renders i18n labels; never a raw key or the mustChangePassword claim as text", async ({
    page
  }) => {
    await mockSessionWithClaims(page, { mustChangePassword: true });
    await page.goto("/change-password");

    await expect(currentPassword(page)).toBeVisible();
    await expect(newPassword(page)).toBeVisible();
    await expect(confirmPassword(page)).toBeVisible();
    await expect(submitButton(page)).toBeVisible();

    await expect(page.getByText(/forceChangePassword\./)).toHaveCount(0);
    await expect(page.getByText("mustChangePassword")).toHaveCount(0);
    await expect(page.getByText("true", { exact: true })).toHaveCount(0);
  });
});

// ---------------------------------------------------------------------------
// 9. i18n (en + vi) — title/description/labels/submit/announce.
// ---------------------------------------------------------------------------
test.describe("Force change-password — i18n", () => {
  test("EN: redirect + title/labels render English strings", async ({
    page
  }) => {
    await mockSessionWithClaims(page, { mustChangePassword: true });
    await page.goto("/");
    await expect(page).toHaveURL(/\/change-password$/);
    await expect(page.getByRole("heading", { name: EN.title })).toBeVisible();
    await expect(currentPassword(page)).toBeVisible();
  });

  test("VI: title/labels/submit render Vietnamese strings, no raw key leaks", async ({
    page
  }) => {
    await mockSessionWithClaims(page, { mustChangePassword: true });
    await page.goto("/vi/change-password");
    await expect(page.getByRole("heading", { name: VI.title })).toBeVisible();
    await expect(currentPassword(page, VI.currentLabel)).toBeVisible();
    await expect(newPassword(page, VI.newLabel)).toBeVisible();
    await expect(confirmPassword(page, VI.confirmLabel)).toBeVisible();
    await expect(submitButton(page, VI.submit)).toBeVisible();
    await expect(page.getByText(/forceChangePassword\./)).toHaveCount(0);
  });
});

// ---------------------------------------------------------------------------
// 10. Error / loading.
// ---------------------------------------------------------------------------
test.describe("Force change-password — error / loading", () => {
  test.beforeEach(async ({ page }) => {
    await mockSessionWithClaims(page, { mustChangePassword: true });
    await page.goto("/change-password");
    await expect(page.getByRole("heading", { name: EN.title })).toBeVisible();
  });

  // [error-guessing] 500 -> global mutationCache error handler shows the
  // generic 5xx toast (src/libs/query-client.ts) — same mechanism already
  // verified in admin-users-lock/lock-unlock.e2e.ts and
  // admin-login-history/admin-login-history-detail.e2e.ts. NOTE: this is
  // deliberately NOT the `account.changePassword.toast.error` string
  // ("Failed to update password") — tracing useChangePassword +
  // ChangePasswordCard/ForceChangePasswordForm shows neither defines a
  // component-level onError toast, only field-error mapping; a 500 has no
  // FIELD_ERROR_MAP entry, so only the global 5xx branch fires. Flagged as a
  // possible pre-existing drift in change-password.e2e.ts's own 500 test
  // (asserts the component-level string) — see e2e.md.
  test("BE 500 → generic server-error toast, stays on /change-password (flag still true)", async ({
    page
  }) => {
    await page.route(CHANGE_PASSWORD_GLOB, (route: Route) => {
      if (route.request().method() === "PATCH") {
        return route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({
            code: "INTERNAL_SERVER_ERROR",
            message: "boom"
          })
        });
      }
      return route.continue();
    });
    await currentPassword(page).fill(TEMP_PASSWORD);
    await newPassword(page).fill(NEW_PASSWORD);
    await confirmPassword(page).fill(NEW_PASSWORD);
    await submitButton(page).click();
    await expect(
      page.getByText("Server error. Please try again later.", {
        exact: true
      })
    ).toBeVisible();
    await expect(page).toHaveURL(/\/change-password/);
    await page.unroute(CHANGE_PASSWORD_GLOB);
  });

  // [error-guessing] loading: delayed PATCH -> inputs + submit disabled while
  // in flight, then aborted (no fake success handler runs -> nothing to
  // clean up), matching change-password.e2e.ts's loading-test convention.
  test("disables inputs and submit while the change-password request is in flight", async ({
    page
  }) => {
    let pendingRoute: Route | null = null;
    await page.route(CHANGE_PASSWORD_GLOB, (route: Route) => {
      if (route.request().method() === "PATCH") {
        pendingRoute = route;
        return;
      }
      return route.continue();
    });
    await currentPassword(page).fill(TEMP_PASSWORD);
    await newPassword(page).fill(NEW_PASSWORD);
    await confirmPassword(page).fill(NEW_PASSWORD);
    const btn = submitButton(page);
    await btn.click();
    await expect(currentPassword(page)).toBeDisabled();
    await expect(newPassword(page)).toBeDisabled();
    await expect(confirmPassword(page)).toBeDisabled();
    await expect(btn).toBeDisabled();
    if (pendingRoute) await (pendingRoute as Route).abort();
    await page.unroute(CHANGE_PASSWORD_GLOB);
  });
});

// ---------------------------------------------------------------------------
// 11. Mutation safety.
// ---------------------------------------------------------------------------
test.describe("Force change-password — mutation safety", () => {
  test("[ST valid] a successful change lands on HOME and does not bounce back to /change-password", async ({
    page
  }) => {
    await mockSessionWithClaims(page, { mustChangePassword: true });
    await page.goto("/change-password");
    await mockChangePasswordSuccess(page);
    await currentPassword(page).fill(TEMP_PASSWORD);
    await newPassword(page).fill(NEW_PASSWORD);
    await confirmPassword(page).fill(NEW_PASSWORD);
    await submitButton(page).click();
    await expect(page).toHaveURL("/");
    // MustChangePasswordGate re-evaluates on every render off the (now
    // mustChangePassword:false) in-memory session set by setTokens — give it
    // a beat and confirm it does NOT bounce back to /change-password.
    await page.waitForTimeout(500);
    await expect(page).toHaveURL("/");
    await page.unroute(CHANGE_PASSWORD_GLOB);
  });

  test("double-submit fires exactly one PATCH (guarded by useSubmitGuard + disabled submit)", async ({
    page
  }) => {
    await mockSessionWithClaims(page, { mustChangePassword: true });
    await page.goto("/change-password");

    let patchCount = 0;
    await page.route(CHANGE_PASSWORD_GLOB, async (route: Route) => {
      if (route.request().method() !== "PATCH") return route.continue();
      patchCount += 1;
      await new Promise((resolve) => setTimeout(resolve, 400));
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ data: buildTokens(false) })
      });
    });

    await currentPassword(page).fill(TEMP_PASSWORD);
    await newPassword(page).fill(NEW_PASSWORD);
    await confirmPassword(page).fill(NEW_PASSWORD);
    const btn = submitButton(page);
    await btn.click();
    // Second click while the first is in flight: useSubmitGuard's inFlightRef
    // AND the disabled submit button both block it — force-click to prove
    // the guard, not just the attribute (same approach as
    // change-password.e2e.ts's rapid-double-submit test).
    await btn.click({ force: true });

    await expect(page).toHaveURL("/");
    expect(patchCount).toBe(1);
    await page.unroute(CHANGE_PASSWORD_GLOB);
  });

  // BLOCKED (no silent gap — same root cause as
  // reset-action.e2e.ts's fixme, see e2e.md > Prerequisites): proving that a
  // refresh token captured BEFORE a real admin reset is rejected afterward
  // (tokenVersion bump) requires a real, login-capable victim account and a
  // way to read the BE-generated temp password to log back in as them. Both
  // are currently unavailable in this environment.
  test.fixme(
    "[ST invalid] a refresh token captured before a real admin reset is rejected afterward",
    async () => {}
  );
});

// ---------------------------------------------------------------------------
// 12. Accessibility.
// ---------------------------------------------------------------------------
test.describe("Force change-password — accessibility", () => {
  test.beforeEach(async ({ page }) => {
    await mockSessionWithClaims(page, { mustChangePassword: true });
    await page.goto("/change-password");
    await expect(page.getByRole("heading", { name: EN.title })).toBeVisible();
  });

  // Each PasswordInput renders a show/hide toggle button AFTER its input
  // (src/components/PasswordInput/index.tsx), same as the profile
  // change-password form: current input -> current toggle -> new input ->
  // new toggle -> confirm input -> confirm toggle -> Submit.
  test("tabs through fields and toggles in DOM order", async ({ page }) => {
    await currentPassword(page).focus();
    await expect(currentPassword(page)).toBeFocused();
    await page.keyboard.press("Tab"); // current show/hide toggle
    await page.keyboard.press("Tab"); // -> new password input
    await expect(newPassword(page)).toBeFocused();
    await page.keyboard.press("Tab"); // new show/hide toggle
    await page.keyboard.press("Tab"); // -> confirm password input
    await expect(confirmPassword(page)).toBeFocused();
    await page.keyboard.press("Tab"); // confirm show/hide toggle
    await page.keyboard.press("Tab"); // -> Submit button
    await expect(submitButton(page)).toBeFocused();
  });

  test("keyboard-only submit (focus + Enter) fires exactly one PATCH", async ({
    page
  }) => {
    let patchCount = 0;
    await page.route(CHANGE_PASSWORD_GLOB, async (route: Route) => {
      if (route.request().method() !== "PATCH") return route.continue();
      patchCount += 1;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ data: buildTokens(false) })
      });
    });
    await currentPassword(page).fill(TEMP_PASSWORD);
    await newPassword(page).fill(NEW_PASSWORD);
    await confirmPassword(page).fill(NEW_PASSWORD);
    await submitButton(page).focus();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL("/");
    expect(patchCount).toBe(1);
    await page.unroute(CHANGE_PASSWORD_GLOB);
  });
});
