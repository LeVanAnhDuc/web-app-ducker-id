import { test, expect, request } from "@playwright/test";
import type { Page, Route } from "@playwright/test";
import {
  ensureDefaultPassword,
  expectNoPatch,
  KNOWN_CANDIDATE_PASSWORDS,
  mockChangePassword,
  reestablishStorageState,
  trackPatch
} from "../helpers/changePassword";
import {
  BASE_URL,
  USER_EMAIL as LOGIN_EMAIL,
  USER_PASSWORD as DEFAULT_PASSWORD
} from "../helpers/env";

const NEW_PASSWORD = "NewPass@123";

// Real i18n strings (do NOT guess — sourced from
// src/locales/{en,vi}/account.json -> account.changePassword
// and src/locales/{en,vi}/common.json -> validation.*).
const EN = {
  heading: "Change Password",
  save: "Update Password",
  cancel: "Cancel",
  toastSuccess: "Password updated successfully",
  toastError: "Failed to update password"
} as const;
// Error messages rendered by FormFieldMessage (src/locales/en/common.json ->
// validation.{field}.{key}). Asserting the visible text is more stable than the
// aria-invalid attribute alone, which can briefly lag the BE response re-render.
const EN_ERR = {
  wrongCurrent: "Current password is incorrect",
  sameAsCurrent: "New password must be different from your current password"
} as const;

const VI = {
  heading: "Đổi mật khẩu",
  // src/locales/vi/account.json -> account.changePassword.fields.*
  currentPasswordLabel: "Mật khẩu hiện tại",
  newPasswordLabel: "Mật khẩu mới",
  confirmPasswordLabel: "Xác nhận mật khẩu mới",
  // account.changePassword.buttons.save (vi)
  save: "Cập nhật mật khẩu",
  // common.validation.currentPassword.wrongCurrentPassword (vi)
  wrongCurrentError: "Mật khẩu hiện tại không đúng"
} as const;

// Vietnamese-route field selectors. The /vi route renders Vietnamese labels,
// so the hardcoded English getByLabel selectors above do not match. Labels are
// programmatically associated with their inputs (see PasswordInput), so select
// by the localized label.
const viCurrentPassword = (page: Page) =>
  page.getByLabel(VI.currentPasswordLabel, { exact: true });
const viNewPassword = (page: Page) =>
  page.getByLabel(VI.newPasswordLabel, { exact: true });
const viConfirmPassword = (page: Page) =>
  page.getByLabel(VI.confirmPasswordLabel, { exact: true });

const CHANGE_PASSWORD_PATH = "/auth/change-password";
const CHANGE_PASSWORD_GLOB = "**/api/v1/auth/change-password";

// Labels are programmatically associated with their inputs (PasswordInput
// forwards the shadcn FormControl id to the <input>), so select by label.
const currentPassword = (page: Page) =>
  page.getByLabel("Current Password", { exact: true });
const newPassword = (page: Page) =>
  page.getByLabel("New Password", { exact: true });
const confirmPassword = (page: Page) =>
  page.getByLabel("Confirm New Password", { exact: true });

const saveButton = (page: Page) => page.getByRole("button", { name: EN.save });

test.describe.configure({ mode: "serial" });

// ---------------------------------------------------------------------------
// Describe 1 — UI & validation (Gate A+B). Default storageState. Never mutates
// the real password (validation / empty / i18n / render / a11y / error mock /
// loading mock). Safe for gate B to read in parallel.
// ---------------------------------------------------------------------------
test.describe("Change Password — UI & validation (Gate A+B)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/profile");
    await expect(page.getByRole("heading", { name: EN.heading })).toBeVisible();
  });

  // --- Group 3 (matrix row 4) — Validation ---------------------------------

  // [EXISTS] confirm mismatch
  test("blocks confirm mismatch on the client (no API call)", async ({
    page
  }) => {
    const tracker = trackPatch(page);
    await currentPassword(page).fill(DEFAULT_PASSWORD);
    await newPassword(page).fill(NEW_PASSWORD);
    await confirmPassword(page).fill("Different@123");
    await saveButton(page).click();
    await expect(confirmPassword(page)).toHaveAttribute("aria-invalid", "true");
    expectNoPatch(tracker);
  });

  // [EXISTS-partial] [DT row i] wrong current -> PATCH 400 -> field error.
  // MOCKED (page.route) to assert FE handling of the server's wrong-current
  // response WITHOUT consuming the real BE change-password rate-limit bucket
  // (5 req / IP+user / 900s). The intent — server says wrong-current, FE maps
  // the code to the currentPassword field — is preserved by the mock.
  test("shows inline error on wrong current password", async ({ page }) => {
    await mockChangePassword(page, {
      status: 400,
      body: { code: "CHANGE_PASSWORD_WRONG_CURRENT", message: "Wrong current" }
    });
    await currentPassword(page).fill("WrongPass@123");
    await newPassword(page).fill(NEW_PASSWORD);
    await confirmPassword(page).fill(NEW_PASSWORD);
    await saveButton(page).click();
    // Assert the visible mapped error text first (stable; auto-retries through
    // the post-response re-render), then the aria-invalid attribute.
    await expect(page.getByText(EN_ERR.wrongCurrent)).toBeVisible();
    await expect(currentPassword(page)).toHaveAttribute("aria-invalid", "true");
    await page.unroute(CHANGE_PASSWORD_GLOB);
  });

  // [EXISTS] new === current.
  // MOCKED (page.route) to assert FE handling of the server's same-as-current
  // response without consuming the real rate-limit bucket. Intent preserved:
  // server rejects new==current, FE maps the code to the newPassword field.
  test("shows inline error when new equals current", async ({ page }) => {
    await mockChangePassword(page, {
      status: 400,
      body: {
        code: "CHANGE_PASSWORD_SAME_AS_CURRENT",
        message: "Same as current"
      }
    });
    await currentPassword(page).fill(DEFAULT_PASSWORD);
    await newPassword(page).fill(DEFAULT_PASSWORD);
    await confirmPassword(page).fill(DEFAULT_PASSWORD);
    await saveButton(page).click();
    // Assert the visible mapped error text first (stable; auto-retries through
    // the post-response re-render), then the aria-invalid attribute.
    await expect(page.getByText(EN_ERR.sameAsCurrent)).toBeVisible();
    await expect(newPassword(page)).toHaveAttribute("aria-invalid", "true");
    await page.unroute(CHANGE_PASSWORD_GLOB);
  });

  // [EP] worked example: invalid new password class -> aria-invalid + no PATCH.
  // The remaining invalid classes are parametrized below from the same pattern.
  test("rejects new password missing an uppercase letter (no API call)", async ({
    page
  }) => {
    const tracker = trackPatch(page);
    await currentPassword(page).fill(DEFAULT_PASSWORD);
    await newPassword(page).fill("newpass@123");
    await confirmPassword(page).fill("newpass@123");
    await saveButton(page).click();
    await expect(newPassword(page)).toHaveAttribute("aria-invalid", "true");
    expectNoPatch(tracker);
  });

  // [EP] remaining invalid newPassword classes — parametrized from the worked
  // example. Client policy (zod passwordSchema) blocks before any BE call.
  const invalidNewPasswordClasses: ReadonlyArray<{
    label: string;
    value: string;
  }> = [
    { label: "empty", value: "" },
    { label: "missing a lowercase letter", value: "NEWPASS@123" },
    { label: "missing a digit", value: "NewPass@!!" },
    { label: "missing a special character", value: "NewPass123" }
  ];
  for (const { label, value } of invalidNewPasswordClasses) {
    test(`rejects new password ${label} (no API call)`, async ({ page }) => {
      const tracker = trackPatch(page);
      await currentPassword(page).fill(DEFAULT_PASSWORD);
      await newPassword(page).fill(value);
      await confirmPassword(page).fill(value);
      await saveButton(page).click();
      await expect(newPassword(page)).toHaveAttribute("aria-invalid", "true");
      expectNoPatch(tracker);
    });
  }

  // [EP] currentPassword empty (new/confirm valid) -> required, no PATCH.
  test("rejects an empty current password (no API call)", async ({ page }) => {
    const tracker = trackPatch(page);
    await newPassword(page).fill(NEW_PASSWORD);
    await confirmPassword(page).fill(NEW_PASSWORD);
    // Touch current to make the form dirty, then clear it.
    await currentPassword(page).fill("x");
    await currentPassword(page).fill("");
    await saveButton(page).click();
    await expect(currentPassword(page)).toHaveAttribute("aria-invalid", "true");
    expectNoPatch(tracker);
  });

  // [DT row iii] currentWrong + newInvalid -> client policy wins (no PATCH).
  test("client policy wins when both current is wrong and new is invalid (no API call)", async ({
    page
  }) => {
    const tracker = trackPatch(page);
    await currentPassword(page).fill("WrongPass@123");
    await newPassword(page).fill("newpass@123");
    await confirmPassword(page).fill("newpass@123");
    await saveButton(page).click();
    await expect(newPassword(page)).toHaveAttribute("aria-invalid", "true");
    expectNoPatch(tracker);
  });

  // --- Group 4 (matrix row 5) — Empty / null -------------------------------

  // [EP] pristine form -> Save + Cancel disabled, submit blocked, no PATCH.
  test("disables actions and blocks submit when the form is pristine", async ({
    page
  }) => {
    const tracker = trackPatch(page);
    await expect(saveButton(page)).toBeDisabled();
    await expect(page.getByRole("button", { name: EN.cancel })).toBeDisabled();
    await page.waitForTimeout(300);
    expectNoPatch(tracker);
    // Tooltip `noChanges` text requires hover (Radix renders on hover) -> its
    // text assertion is DEFERred to gate B MCP walk (visual). Gate A asserts the
    // disabled state, which already proves the forcing-function. See e2e.md.
  });

  // --- Group 5 (matrix row 6) — Boundary (reject sides; accept-8 in describe 2)

  // [BVA] 7 chars (< min 8) -> reject, no PATCH.
  test("rejects a new password of 7 characters (below the minimum, no API call)", async ({
    page
  }) => {
    const tracker = trackPatch(page);
    const sevenChars = "Ab@3xyz"; // 7 chars, otherwise policy-valid
    expect(sevenChars).toHaveLength(7);
    await currentPassword(page).fill(DEFAULT_PASSWORD);
    await newPassword(page).fill(sevenChars);
    await confirmPassword(page).fill(sevenChars);
    await saveButton(page).click();
    await expect(newPassword(page)).toHaveAttribute("aria-invalid", "true");
    expectNoPatch(tracker);
  });

  // [BVA] 129 chars (> max 128) -> reject, no PATCH.
  test("rejects a new password of 129 characters (above the maximum, no API call)", async ({
    page
  }) => {
    const tracker = trackPatch(page);
    const tooLong = "Ab@3" + "x".repeat(125); // 129 chars
    expect(tooLong).toHaveLength(129);
    await currentPassword(page).fill(DEFAULT_PASSWORD);
    await newPassword(page).fill(tooLong);
    await confirmPassword(page).fill(tooLong);
    await saveButton(page).click();
    await expect(newPassword(page)).toHaveAttribute("aria-invalid", "true");
    expectNoPatch(tracker);
  });

  // --- Group 7 (matrix row 8) — Data rendering -----------------------------

  test("renders the change-password form with the expected English labels", async ({
    page
  }) => {
    await expect(currentPassword(page)).toBeVisible();
    await expect(newPassword(page)).toBeVisible();
    await expect(confirmPassword(page)).toBeVisible();
    await expect(saveButton(page)).toBeVisible();
  });

  // --- Group 8 (matrix row 9) — i18n en + vi (MANDATORY) --------------------

  // [i18n] vi render: heading renders the Vietnamese string.
  test("renders the form in Vietnamese on the /vi route", async ({ page }) => {
    await page.goto("/vi/profile");
    await expect(page.getByRole("heading", { name: VI.heading })).toBeVisible();
  });

  // [i18n] vi error: wrong-current -> PATCH 400 -> field error mapped to the
  // Vietnamese validation string.
  // MOCKED (page.route) to assert the FE renders the localized (vi) wrong-current
  // error from the server response, without consuming the real rate-limit bucket.
  test("shows the Vietnamese wrong-current error on the /vi route", async ({
    page
  }) => {
    await page.goto("/vi/profile");
    await expect(page.getByRole("heading", { name: VI.heading })).toBeVisible();
    await mockChangePassword(page, {
      status: 400,
      body: { code: "CHANGE_PASSWORD_WRONG_CURRENT", message: "Wrong current" }
    });
    await viCurrentPassword(page).fill("WrongPass@123");
    await viNewPassword(page).fill(NEW_PASSWORD);
    await viConfirmPassword(page).fill(NEW_PASSWORD);
    await page.getByRole("button", { name: VI.save }).click();
    await expect(page.getByText(VI.wrongCurrentError)).toBeVisible();
    await page.unroute(CHANGE_PASSWORD_GLOB);
  });

  // --- Group 9 (matrix row 10) — Error / loading ---------------------------

  // [error-guessing] 500 -> error toast, form NOT reset, still authed.
  // Route is intercepted -> no real DB mutation -> safe for describe 1.
  test("shows an error toast and keeps form values when the API fails (500)", async ({
    page
  }) => {
    await page.route(CHANGE_PASSWORD_GLOB, (route: Route) => {
      if (route.request().method() === "PATCH") {
        return route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({
            code: "INTERNAL_SERVER_ERROR",
            message: "Server error"
          })
        });
      }
      return route.continue();
    });
    await currentPassword(page).fill(DEFAULT_PASSWORD);
    await newPassword(page).fill(NEW_PASSWORD);
    await confirmPassword(page).fill(NEW_PASSWORD);
    await saveButton(page).click();
    await expect(page.getByText(EN.toastError)).toBeVisible();
    await expect(newPassword(page)).toHaveValue(NEW_PASSWORD);
    await expect(page).toHaveURL(/\/profile/);
    await page.unroute(CHANGE_PASSWORD_GLOB);
  });

  // [error-guessing] loading: delayed PATCH -> inputs disabled in flight.
  // The visual spinner is DEFERred to gate B; gate A asserts the disabled
  // inputs while the request is in flight. Route mock -> no real mutation.
  //
  // Contamination control: the PATCH is HELD pending (route never fulfilled)
  // only long enough to observe the in-flight disabled state, then ABORTED.
  // Aborting (rather than fulfilling with a fake 200) means `onSuccess` never
  // runs, so the bogus token pair is never written into the in-memory auth
  // store — nothing to clean up. We then re-establish a known-good page by
  // navigating fresh and waiting for the heading, so the next serial test's
  // beforeEach starts authenticated. (Previously this test fulfilled a fake
  // 200 then reloaded mid-flight, which raced the refresh-token rotation and
  // logged the shared session out -> the next test landed on /login.)
  test("disables inputs while the change-password request is in flight", async ({
    page
  }) => {
    let pendingRoute: Route | null = null;
    await page.route(CHANGE_PASSWORD_GLOB, (route: Route) => {
      if (route.request().method() === "PATCH") {
        // Hold the request open without resolving so the FE stays in flight.
        pendingRoute = route;
        return;
      }
      return route.continue();
    });
    await currentPassword(page).fill(DEFAULT_PASSWORD);
    await newPassword(page).fill(NEW_PASSWORD);
    await confirmPassword(page).fill(NEW_PASSWORD);
    await saveButton(page).click();
    await expect(currentPassword(page)).toBeDisabled();
    await expect(newPassword(page)).toBeDisabled();
    await expect(confirmPassword(page)).toBeDisabled();
    // Abort the held request so no success handler runs (no fake tokens set).
    if (pendingRoute) await (pendingRoute as Route).abort();
    await page.unroute(CHANGE_PASSWORD_GLOB);
    // Leave a known-good authenticated page for the next serial test.
    await page.goto("/profile");
    await expect(page.getByRole("heading", { name: EN.heading })).toBeVisible();
  });

  // --- Group 11 (matrix row 12) — Accessibility ----------------------------

  // [a11y] tab order follows DOM order. NOTE: each PasswordInput renders a
  // show/hide toggle button AFTER its input (verified in
  // src/components/PasswordInput/index.tsx), so the focus order is:
  // current input -> current toggle -> new input -> new toggle ->
  // confirm input -> confirm toggle -> Cancel -> Save.
  test("tabs through fields and toggles in DOM order", async ({ page }) => {
    await currentPassword(page).focus();
    await expect(currentPassword(page)).toBeFocused();
    await page.keyboard.press("Tab"); // current show/hide toggle
    await page.keyboard.press("Tab"); // -> new password input
    await expect(newPassword(page)).toBeFocused();
    await page.keyboard.press("Tab"); // new show/hide toggle
    await page.keyboard.press("Tab"); // -> confirm password input
    await expect(confirmPassword(page)).toBeFocused();
  });

  // --- Group 12 — Error-guessing cross-cutting (exploratory, observe only) --

  // [error-guessing] trailing space in new + confirm. Exploratory: we do NOT
  // hard-assert the outcome; we only confirm the page does not crash and record
  // the observed behavior (aria-invalid state of newPassword) into e2e.md. zod
  // compares verbatim, so confirm matches when both share the trailing space.
  test("documents trailing-space handling in the new password (observe only)", async ({
    page
  }) => {
    const withTrailingSpace = `${NEW_PASSWORD} `;
    await currentPassword(page).fill(DEFAULT_PASSWORD);
    await newPassword(page).fill(withTrailingSpace);
    await confirmPassword(page).fill(withTrailingSpace);
    // Do not submit (would mutate the real password on the BE if policy passes).
    // Observe whether the client policy flags the trailing space.
    const invalid = await newPassword(page).getAttribute("aria-invalid");
    // Exploratory assertion: the attribute is either "true" or "false"/null.
    expect(["true", "false", null]).toContain(invalid);
    // Observation is logged in docs e2e.md (Error-guessing observation log).
  });
});

// ---------------------------------------------------------------------------
// Describe 2 — happy path & boundary (Gate A only, mutating). Mutates the real
// password -> afterAll reverts. Gate B only verifies read/render, never runs
// these in parallel.
// ---------------------------------------------------------------------------
test.describe("Change Password — happy path & boundary (Gate A only, mutating)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/profile");
    await expect(page.getByRole("heading", { name: EN.heading })).toBeVisible();
  });

  // NOTE ON ORDER: the mocked (non-mutating) tests run FIRST; the single REAL
  // change (happy path) runs LAST in this describe. A real change revokes the
  // refresh token captured by auth.setup, so it would log out any browser test
  // that runs after it in this describe. Running it last (and re-establishing
  // the shared storageState afterwards) keeps the serial chain authenticated.

  // [NEW] success-handling on a 200 (FE side).
  // MOCKED (page.route 200) — asserts the FE's success handling: toast success
  // and the form stays on /profile, WITHOUT a real PATCH. The true
  // server-side session-survival across reload is covered by the happy-path test
  // below (real token rotation); here we only assert the FE's reaction to a 200,
  // so we deliberately do NOT reload (a reload after a fake-200 would race the
  // refresh-token bootstrap and log the shared session out — see e2e.md).
  test("shows success and stays on the page when the change succeeds (200)", async ({
    page
  }) => {
    await mockChangePassword(page, {
      status: 200,
      body: { data: { accessToken: "x", idToken: "x", expiresIn: 900 } }
    });
    await currentPassword(page).fill(DEFAULT_PASSWORD);
    await newPassword(page).fill(NEW_PASSWORD);
    await confirmPassword(page).fill(NEW_PASSWORD);
    await saveButton(page).click();
    await expect(page.getByText(EN.toastSuccess)).toBeVisible();
    await expect(page).toHaveURL(/\/profile/);
    await page.unroute(CHANGE_PASSWORD_GLOB);
  });

  // [BVA] 8 chars (== min) -> accept.
  // MOCKED (page.route 200) — the boundary intent is that the CLIENT policy
  // accepts an exactly-8-char password (it does not block before the PATCH) and
  // the FE shows success on the server's 200. Mocking the 200 proves both
  // without a real PATCH (no rate-limit bucket, no THIRD-password revert dance).
  // No reload (same fake-200 session-race reason as the test above).
  test("accepts a new password of exactly 8 characters (boundary)", async ({
    page
  }) => {
    const eightChars = "Ab@3xyzz"; // exactly 8 chars, policy-valid
    expect(eightChars).toHaveLength(8);
    await mockChangePassword(page, {
      status: 200,
      body: { data: { accessToken: "x", idToken: "x", expiresIn: 900 } }
    });
    await currentPassword(page).fill(DEFAULT_PASSWORD);
    await newPassword(page).fill(eightChars);
    await confirmPassword(page).fill(eightChars);
    await saveButton(page).click();
    await expect(page.getByText(EN.toastSuccess)).toBeVisible();
    await page.unroute(CHANGE_PASSWORD_GLOB);
  });

  // [EXISTS] happy path + [ST valid] session survives the change (REAL PATCH).
  // The core happy path and the [ST] valid scenario folded together: a REAL
  // DEFAULT_PASSWORD -> NEW_PASSWORD change (rotates tokens server-side), then a
  // reload that must STAY authenticated. Only a real change rotates the refresh
  // cookie, so true "session survives" can only be proven here, not by a mock.
  // Runs LAST in this describe; re-establishes storageState (login as the new
  // password) so the next describe's browser context is authed. afterAll then
  // reverts NEW_PASSWORD -> DEFAULT_PASSWORD and re-saves the auth file.
  test("happy path updates password and keeps the session (reload stays authed)", async ({
    page
  }) => {
    await currentPassword(page).fill(DEFAULT_PASSWORD);
    await newPassword(page).fill(NEW_PASSWORD);
    await confirmPassword(page).fill(NEW_PASSWORD);
    await saveButton(page).click();
    await expect(page.getByText(EN.toastSuccess)).toBeVisible();
    await expect(page).toHaveURL(/\/profile/);
    // [ST valid] reload after the real change: the rotated session survives.
    await page.reload();
    await expect(page.getByRole("heading", { name: EN.heading })).toBeVisible();
    await expect(page).toHaveURL(/\/profile/);
    // The real change revoked the auth.setup refresh token; re-capture a fresh
    // one (now at NEW_PASSWORD) for the shared storageState file.
    await reestablishStorageState(page, NEW_PASSWORD);
  });

  test.afterAll(async () => {
    await ensureDefaultPassword(KNOWN_CANDIDATE_PASSWORDS);
  });
});

// ---------------------------------------------------------------------------
// Describe 3 — session & security (Gate A only, isolated). Token-revoke,
// double-submit, rate-limit. MUST run isolated (not in parallel with any
// session-sharing read scenario) because it revokes refresh tokens and
// consumes the rate-limit window. See reference_e2e_suite_session_contamination.
// ---------------------------------------------------------------------------
test.describe("Change Password — session & security (Gate A only, isolated)", () => {
  // NOTE ON ORDER: the mocked browser test (double-submit) runs FIRST; the REAL
  // change (token-revoke) runs LAST. token-revoke revokes the seed user's
  // refresh tokens (including auth.setup's), so it must run last to avoid
  // logging out the browser test before it; afterAll then restores DEFAULT and
  // re-saves the shared auth file.

  // [error-guessing] rapid double-submit -> exactly one PATCH (Save disabled
  // while isPending).
  // MOCKED (page.route 200, delayed 800ms) — the intent is the FE's in-flight
  // guard: while the first request is pending the Save button is disabled
  // (isDisabled = !isDirty || isPending), so a second rapid click must NOT fire
  // a second PATCH. A delayed mock holds the request in flight long enough to
  // attempt the second click, and lets us count PATCHes without consuming the
  // real rate-limit bucket or mutating the real password.
  test("fires exactly one PATCH on rapid double-submit", async ({ page }) => {
    await page.goto("/profile");
    await expect(page.getByRole("heading", { name: EN.heading })).toBeVisible();
    let patchCount = 0;
    page.on("request", (r) => {
      if (r.method() === "PATCH" && r.url().includes(CHANGE_PASSWORD_PATH)) {
        patchCount += 1;
      }
    });
    await mockChangePassword(page, {
      status: 200,
      body: { data: { accessToken: "x", idToken: "x", expiresIn: 900 } },
      delayMs: 800
    });
    await currentPassword(page).fill(DEFAULT_PASSWORD);
    await newPassword(page).fill(NEW_PASSWORD);
    await confirmPassword(page).fill(NEW_PASSWORD);
    const saveBtn = saveButton(page);
    await saveBtn.click();
    // Second click while the first is in flight: the button is disabled, so this
    // force-click must not produce a second PATCH.
    await saveBtn.click({ force: true });
    await expect(page.getByText(EN.toastSuccess)).toBeVisible();
    expect(patchCount).toBe(1);
    await page.unroute(CHANGE_PASSWORD_GLOB);
  });

  // [ST invalid] MANDATORY — a refresh token captured by a second context
  // BEFORE the change must be rejected after the password changes. REAL change
  // via API contexts (does not touch the shared browser session); runs LAST.
  test("revokes other-device refresh token after password change (ST invalid)", async () => {
    // Context #2 = "other device": log in BEFORE the change to capture a
    // pre-change refresh token (older tokenVersion -> must be rejected).
    const otherDevice = await request.newContext({ baseURL: BASE_URL });
    const loginRes = await otherDevice.post("/api/v1/auth/login", {
      data: { email: LOGIN_EMAIL, password: DEFAULT_PASSWORD }
    });
    expect(loginRes.ok()).toBeTruthy();
    const oldRefreshCookie = (await otherDevice.storageState()).cookies.find(
      (c) => c.name === "refreshToken"
    );
    expect(oldRefreshCookie).toBeTruthy();

    // Revocation is by tokenVersion now: the change bumps auth.tokenVersion, so
    // the pre-change token (older version) is rejected regardless of timing — no
    // same-second iat race, no wait needed. See password-not-changed.guard.ts.

    // Context #1 = current device: perform the real password change.
    const current = await request.newContext({ baseURL: BASE_URL });
    const curLogin = await current.post("/api/v1/auth/login", {
      data: { email: LOGIN_EMAIL, password: DEFAULT_PASSWORD }
    });
    const curToken = (
      (await curLogin.json()) as { data: { accessToken: string } }
    ).data.accessToken;
    const changeRes = await current.patch("/api/v1/auth/change-password", {
      headers: { Authorization: `Bearer ${curToken}` },
      data: {
        currentPassword: DEFAULT_PASSWORD,
        newPassword: NEW_PASSWORD,
        confirmPassword: NEW_PASSWORD
      }
    });
    expect(changeRes.ok()).toBeTruthy();

    // Other device reuses its now-stale refresh cookie -> must be kicked.
    const refreshRes = await otherDevice.post("/api/v1/auth/token/refresh", {
      headers: oldRefreshCookie
        ? { Cookie: `refreshToken=${oldRefreshCookie.value}` }
        : {}
    });
    expect([401, 403]).toContain(refreshRes.status());

    await otherDevice.dispose();
    await current.dispose();
  });

  // [BVA] rate-limit: the 6th attempt in the window -> 429 (MAX_REQUESTS=5).
  // DEFER/SKIP rationale: the limit is keyed by IP+user over a 15-minute window
  // backed by Redis. Across runs the bucket is shared, so without a Redis flush
  // hook (or a short test-only window) this test is order/state dependent and
  // flaky. Kept (not dropped) per the plan; enable when the test environment
  // provides a short window or a per-test bucket reset. See e2e.md DEFER registry.
  test.skip("rate-limits change-password after 5 attempts in the window (6th -> 429)", async () => {
    const ctx = await request.newContext({ baseURL: BASE_URL });
    const login = await ctx.post("/api/v1/auth/login", {
      data: { email: LOGIN_EMAIL, password: DEFAULT_PASSWORD }
    });
    const token = ((await login.json()) as { data: { accessToken: string } })
      .data.accessToken;
    const attempt = () =>
      ctx.patch("/api/v1/auth/change-password", {
        headers: { Authorization: `Bearer ${token}` },
        // Wrong current -> 400 each time (does NOT mutate password) but still
        // consumes the IP+user rate-limit bucket.
        data: {
          currentPassword: "WrongPass@123",
          newPassword: NEW_PASSWORD,
          confirmPassword: NEW_PASSWORD
        }
      });
    for (let i = 0; i < 5; i++) {
      const res = await attempt();
      expect(res.status()).not.toBe(429);
    }
    const sixth = await attempt();
    expect(sixth.status()).toBe(429);
    await ctx.dispose();
  });

  test.afterAll(async () => {
    await ensureDefaultPassword(KNOWN_CANDIDATE_PASSWORDS);
  });
});

// ---------------------------------------------------------------------------
// Describe 4 — AuthN (matrix row 2). Network/context-level. No mutation.
// ---------------------------------------------------------------------------
test.describe("Change Password — authentication (Gate A+B / A only)", () => {
  // [error-guessing] unauthenticated browser context -> redirected to /login.
  test("redirects unauthenticated user away from account settings", async ({
    browser
  }) => {
    const ctx = await browser.newContext({ storageState: undefined });
    await ctx.clearCookies();
    const freshPage = await ctx.newPage();
    await freshPage.goto("/profile");
    await expect(freshPage).toHaveURL(/\/login/);
    await ctx.close();
  });

  // [authN] PATCH without a bearer token -> 401 (authGuard). 401 is returned
  // before touching the DB -> no mutation.
  test("rejects change-password API call without a bearer token (401)", async () => {
    const ctx = await request.newContext({ baseURL: BASE_URL });
    try {
      const res = await ctx.patch("/api/v1/auth/change-password", {
        data: {
          currentPassword: DEFAULT_PASSWORD,
          newPassword: NEW_PASSWORD,
          confirmPassword: NEW_PASSWORD
        }
      });
      expect(res.status()).toBe(401);
    } finally {
      await ctx.dispose();
    }
  });
});
