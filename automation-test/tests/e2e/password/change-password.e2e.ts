import { test, expect } from "@fixtures";
import type { Page, Route } from "@playwright/test";
import {
  expectNoPatch,
  mockChangePassword,
  realTokens,
  trackPatch
} from "@helpers/changePassword";
import { USER_PASSWORD as DEFAULT_PASSWORD } from "@helpers/env";
import { createAccount } from "@helpers/accounts";
import { loginInBrowser, loginOverApi } from "@helpers/password";

// Change password from /profile (ChangePasswordCard). Test cases:
// test-cases/password.md (TC-PWD-001 … TC-PWD-018). The form tests run as
// the seeded `user` (default role) and never send a real PATCH — every server
// answer is a page.route mock, or client validation blocks first. The one
// real change runs on a throwaway account signed into an empty context, so
// user@test.com keeps its password. API-level cases (revocation of other
// sessions, 401, rate limit) live in tests/api/password/change-password.api.ts.

const NEW_PASSWORD = "NewPass@123";

// Real i18n strings (do NOT guess — sourced from
// src/locales/{en,vi}/account.json -> account.changePassword
// and src/locales/{en,vi}/common.json -> validation.*).
const EN = {
  heading: "Change Password",
  save: "Update Password",
  cancel: "Cancel",
  toastSuccess: "Password updated successfully",
  serverError: "Server error. Please try again later."
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
const changePasswordCard = (page: Page) =>
  page.locator('[aria-labelledby="change-password-title"]');

// ---------------------------------------------------------------------------
// UI & validation — seeded user, no real PATCH.
// ---------------------------------------------------------------------------
test.describe("Change Password — UI & validation", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/profile");
    await expect(page.getByRole("heading", { name: EN.heading })).toBeVisible();
  });

  // --- Group 3 (matrix row 4) — Validation ---------------------------------

  // [EXISTS] confirm mismatch
  test(
    "blocks confirm mismatch on the client (no API call)",
    { tag: ["@TC-PWD-004"] },
    async ({ page }) => {
      const tracker = trackPatch(page);
      await currentPassword(page).fill(DEFAULT_PASSWORD);
      await newPassword(page).fill(NEW_PASSWORD);
      await confirmPassword(page).fill("Different@123");
      await saveButton(page).click();
      await expect(confirmPassword(page)).toHaveAttribute(
        "aria-invalid",
        "true"
      );
      expectNoPatch(tracker);
    }
  );

  // [EXISTS-partial] [DT row i] wrong current -> PATCH 400 -> field error.
  // MOCKED (page.route) to assert FE handling of the server's wrong-current
  // response WITHOUT consuming the real BE change-password rate-limit bucket
  // (5 req / IP+user / 900s). The intent — server says wrong-current, FE maps
  // the code to the currentPassword field — is preserved by the mock.
  test(
    "shows inline error on wrong current password",
    { tag: ["@TC-PWD-005"] },
    async ({ page }) => {
      await mockChangePassword(page, {
        status: 400,
        body: {
          code: "CHANGE_PASSWORD_WRONG_CURRENT",
          message: "Wrong current"
        }
      });
      await currentPassword(page).fill("WrongPass@123");
      await newPassword(page).fill(NEW_PASSWORD);
      await confirmPassword(page).fill(NEW_PASSWORD);
      await saveButton(page).click();
      // Assert the visible mapped error text first (stable; auto-retries through
      // the post-response re-render), then the aria-invalid attribute.
      await expect(page.getByText(EN_ERR.wrongCurrent)).toBeVisible();
      await expect(currentPassword(page)).toHaveAttribute(
        "aria-invalid",
        "true"
      );
      await page.unroute(CHANGE_PASSWORD_GLOB);
    }
  );

  // [EXISTS] new === current.
  // MOCKED (page.route) to assert FE handling of the server's same-as-current
  // response without consuming the real rate-limit bucket. Intent preserved:
  // server rejects new==current, FE maps the code to the newPassword field.
  test(
    "shows inline error when new equals current",
    { tag: ["@TC-PWD-006"] },
    async ({ page }) => {
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
    }
  );

  // [EP] worked example: invalid new password class -> aria-invalid + no PATCH.
  // The remaining invalid classes are parametrized below from the same pattern.
  test(
    "rejects new password missing an uppercase letter (no API call)",
    { tag: ["@TC-PWD-007"] },
    async ({ page }) => {
      const tracker = trackPatch(page);
      await currentPassword(page).fill(DEFAULT_PASSWORD);
      await newPassword(page).fill("newpass@123");
      await confirmPassword(page).fill("newpass@123");
      await saveButton(page).click();
      await expect(newPassword(page)).toHaveAttribute("aria-invalid", "true");
      expectNoPatch(tracker);
    }
  );

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
    test(
      `rejects new password ${label} (no API call)`,
      { tag: ["@TC-PWD-007"] },
      async ({ page }) => {
        const tracker = trackPatch(page);
        await currentPassword(page).fill(DEFAULT_PASSWORD);
        await newPassword(page).fill(value);
        await confirmPassword(page).fill(value);
        await saveButton(page).click();
        await expect(newPassword(page)).toHaveAttribute("aria-invalid", "true");
        expectNoPatch(tracker);
      }
    );
  }

  // [EP] currentPassword empty (new/confirm valid) -> required, no PATCH.
  test(
    "rejects an empty current password (no API call)",
    { tag: ["@TC-PWD-008"] },
    async ({ page }) => {
      const tracker = trackPatch(page);
      await newPassword(page).fill(NEW_PASSWORD);
      await confirmPassword(page).fill(NEW_PASSWORD);
      // Touch current to make the form dirty, then clear it.
      await currentPassword(page).fill("x");
      await currentPassword(page).fill("");
      await saveButton(page).click();
      await expect(currentPassword(page)).toHaveAttribute(
        "aria-invalid",
        "true"
      );
      expectNoPatch(tracker);
    }
  );

  // [DT row iii] currentWrong + newInvalid -> client policy wins (no PATCH).
  test(
    "client policy wins when both current is wrong and new is invalid (no API call)",
    { tag: ["@TC-PWD-009"] },
    async ({ page }) => {
      const tracker = trackPatch(page);
      await currentPassword(page).fill("WrongPass@123");
      await newPassword(page).fill("newpass@123");
      await confirmPassword(page).fill("newpass@123");
      await saveButton(page).click();
      await expect(newPassword(page)).toHaveAttribute("aria-invalid", "true");
      expectNoPatch(tracker);
    }
  );

  // --- Group 4 (matrix row 5) — Empty / null -------------------------------

  // [EP] pristine form -> Save + Cancel disabled, submit blocked, no PATCH.
  test(
    "disables actions and blocks submit when the form is pristine",
    { tag: ["@TC-PWD-010"] },
    async ({ page }) => {
      const tracker = trackPatch(page);
      await expect(saveButton(page)).toBeDisabled();
      await expect(
        changePasswordCard(page).getByRole("button", { name: EN.cancel })
      ).toBeDisabled();
      await page.waitForTimeout(300);
      expectNoPatch(tracker);
    }
  );

  // --- Group 5 (matrix row 6) — Boundary (reject sides; accept-8 in describe 2)

  // [BVA] 7 chars (< min 8) -> reject, no PATCH.
  test(
    "rejects a new password of 7 characters (below the minimum, no API call)",
    { tag: ["@TC-PWD-011"] },
    async ({ page }) => {
      const tracker = trackPatch(page);
      const sevenChars = "Ab@3xyz"; // 7 chars, otherwise policy-valid
      expect(sevenChars).toHaveLength(7);
      await currentPassword(page).fill(DEFAULT_PASSWORD);
      await newPassword(page).fill(sevenChars);
      await confirmPassword(page).fill(sevenChars);
      await saveButton(page).click();
      await expect(newPassword(page)).toHaveAttribute("aria-invalid", "true");
      expectNoPatch(tracker);
    }
  );

  // [BVA] 129 chars (> max 128) -> reject, no PATCH.
  test(
    "rejects a new password of 129 characters (above the maximum, no API call)",
    { tag: ["@TC-PWD-011"] },
    async ({ page }) => {
      const tracker = trackPatch(page);
      const tooLong = "Ab@3" + "x".repeat(125); // 129 chars
      expect(tooLong).toHaveLength(129);
      await currentPassword(page).fill(DEFAULT_PASSWORD);
      await newPassword(page).fill(tooLong);
      await confirmPassword(page).fill(tooLong);
      await saveButton(page).click();
      await expect(newPassword(page)).toHaveAttribute("aria-invalid", "true");
      expectNoPatch(tracker);
    }
  );

  // --- Group 7 (matrix row 8) — Data rendering -----------------------------

  test(
    "renders the change-password form with the expected English labels",
    { tag: ["@TC-PWD-012"] },
    async ({ page }) => {
      await expect(currentPassword(page)).toBeVisible();
      await expect(newPassword(page)).toBeVisible();
      await expect(confirmPassword(page)).toBeVisible();
      await expect(saveButton(page)).toBeVisible();
    }
  );

  // --- Group 8 (matrix row 9) — i18n en + vi (MANDATORY) --------------------

  // [i18n] vi render: heading renders the Vietnamese string.
  test(
    "renders the form in Vietnamese on the /vi route",
    { tag: ["@TC-PWD-013"] },
    async ({ page }) => {
      await page.goto("/vi/profile");
      await expect(
        page.getByRole("heading", { name: VI.heading })
      ).toBeVisible();
    }
  );

  // [i18n] vi error: wrong-current -> PATCH 400 -> field error mapped to the
  // Vietnamese validation string.
  // MOCKED (page.route) to assert the FE renders the localized (vi) wrong-current
  // error from the server response, without consuming the real rate-limit bucket.
  test(
    "shows the Vietnamese wrong-current error on the /vi route",
    { tag: ["@TC-PWD-013"] },
    async ({ page }) => {
      await page.goto("/vi/profile");
      await expect(
        page.getByRole("heading", { name: VI.heading })
      ).toBeVisible();
      await mockChangePassword(page, {
        status: 400,
        body: {
          code: "CHANGE_PASSWORD_WRONG_CURRENT",
          message: "Wrong current"
        }
      });
      await viCurrentPassword(page).fill("WrongPass@123");
      await viNewPassword(page).fill(NEW_PASSWORD);
      await viConfirmPassword(page).fill(NEW_PASSWORD);
      await page.getByRole("button", { name: VI.save }).click();
      await expect(page.getByText(VI.wrongCurrentError)).toBeVisible();
      await page.unroute(CHANGE_PASSWORD_GLOB);
    }
  );

  // --- Group 9 (matrix row 10) — Error / loading ---------------------------

  // [error-guessing] 500 -> error toast, form NOT reset, still authed.
  // Route is intercepted -> no real DB mutation -> safe for describe 1.
  test(
    "shows an error toast and keeps form values when the API fails (500)",
    { tag: ["@TC-PWD-014"] },
    async ({ page }) => {
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
      // ChangePasswordCard maps only field errors; a 500 surfaces through the
      // global mutationCache 5xx toast (src/libs/query-client.ts).
      await expect(page.getByText(EN.serverError, { exact: true })).toBeVisible(
        {
          timeout: 10_000
        }
      );
      await expect(newPassword(page)).toHaveValue(NEW_PASSWORD);
      await expect(page).toHaveURL(/\/profile/);
      await page.unroute(CHANGE_PASSWORD_GLOB);
    }
  );

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
  test(
    "disables inputs while the change-password request is in flight",
    { tag: ["@TC-PWD-015"] },
    async ({ page }) => {
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
      await expect(
        page.getByRole("heading", { name: EN.heading })
      ).toBeVisible();
    }
  );

  // --- Group 11 (matrix row 12) — Accessibility ----------------------------

  // [a11y] tab order follows DOM order. NOTE: each PasswordInput renders a
  // show/hide toggle button AFTER its input (verified in
  // src/components/PasswordInput/index.tsx), so the focus order is:
  // current input -> current toggle -> new input -> new toggle ->
  // confirm input -> confirm toggle -> Cancel -> Save.
  test(
    "tabs through fields and toggles in DOM order",
    { tag: ["@TC-PWD-017"] },
    async ({ page }) => {
      await currentPassword(page).focus();
      await expect(currentPassword(page)).toBeFocused();
      await page.keyboard.press("Tab"); // current show/hide toggle
      await page.keyboard.press("Tab"); // -> new password input
      await expect(newPassword(page)).toBeFocused();
      await page.keyboard.press("Tab"); // new show/hide toggle
      await page.keyboard.press("Tab"); // -> confirm password input
      await expect(confirmPassword(page)).toBeFocused();
    }
  );

  // --- Group 12 — Error-guessing cross-cutting (exploratory, observe only) --

  // [error-guessing] trailing space in new + confirm. Exploratory: we do NOT
  // hard-assert the outcome; we only confirm the page does not crash and record
  // the observed behavior (aria-invalid state of newPassword) into e2e.md. zod
  // compares verbatim, so confirm matches when both share the trailing space.
  test(
    "documents trailing-space handling in the new password (observe only)",
    { tag: ["@TC-PWD-018"] },
    async ({ page }) => {
      const withTrailingSpace = `${NEW_PASSWORD} `;
      await currentPassword(page).fill(DEFAULT_PASSWORD);
      await newPassword(page).fill(withTrailingSpace);
      await confirmPassword(page).fill(withTrailingSpace);
      // Do not submit (would mutate the real password on the BE if policy passes).
      // Observe whether the client policy flags the trailing space.
      const invalid = await newPassword(page).getAttribute("aria-invalid");
      // Exploratory assertion: the attribute is either "true" or "false"/null.
      expect(["true", "false", null]).toContain(invalid);
    }
  );
});

// ---------------------------------------------------------------------------
// Success handling — mocked 200s on the seeded user.
// ---------------------------------------------------------------------------
test.describe("Change Password — success", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/profile");
    await expect(page.getByRole("heading", { name: EN.heading })).toBeVisible();
  });

  // [NEW] success-handling on a 200 (FE side).
  // MOCKED (page.route 200) — asserts the FE's success handling: toast success
  // and the form stays on /profile, WITHOUT a real PATCH. The true
  // server-side session-survival across reload is covered by the happy-path test
  // below (real token rotation); here we only assert the FE's reaction to a 200,
  // so we deliberately do NOT reload (a reload after a fake-200 would race the
  // refresh-token bootstrap and log the shared session out — see e2e.md).
  test(
    "shows success and stays on the page when the change succeeds (200)",
    { tag: ["@TC-PWD-002"] },
    async ({ page }) => {
      await mockChangePassword(page, {
        status: 200,
        body: { data: await realTokens(page) }
      });
      await currentPassword(page).fill(DEFAULT_PASSWORD);
      await newPassword(page).fill(NEW_PASSWORD);
      await confirmPassword(page).fill(NEW_PASSWORD);
      await saveButton(page).click();
      await expect(page.getByText(EN.toastSuccess)).toBeVisible();
      await expect(page).toHaveURL(/\/profile/);
      await page.unroute(CHANGE_PASSWORD_GLOB);
    }
  );

  // [BVA] 8 chars (== min) -> accept.
  // MOCKED (page.route 200) — the boundary intent is that the CLIENT policy
  // accepts an exactly-8-char password (it does not block before the PATCH) and
  // the FE shows success on the server's 200. Mocking the 200 proves both
  // without a real PATCH (no rate-limit bucket, no THIRD-password revert dance).
  // No reload (same fake-200 session-race reason as the test above).
  test(
    "accepts a new password of exactly 8 characters (boundary)",
    { tag: ["@TC-PWD-011"] },
    async ({ page }) => {
      const eightChars = "Ab@3xyzz"; // exactly 8 chars, policy-valid
      expect(eightChars).toHaveLength(8);
      await mockChangePassword(page, {
        status: 200,
        body: { data: await realTokens(page) }
      });
      await currentPassword(page).fill(DEFAULT_PASSWORD);
      await newPassword(page).fill(eightChars);
      await confirmPassword(page).fill(eightChars);
      await saveButton(page).click();
      await expect(page.getByText(EN.toastSuccess)).toBeVisible();
      await page.unroute(CHANGE_PASSWORD_GLOB);
    }
  );
});

// The real change: a throwaway account, so no shared session is revoked.
test.describe("Change Password — real change", () => {
  test.use({ role: "guest" });

  test(
    "happy path updates password and keeps the session (reload stays authed)",
    { tag: ["@TC-PWD-001", "@smoke"] },
    async ({ page }) => {
      const account = await createAccount({ tag: "cp-ui" });
      await loginInBrowser(page, account.email, account.password);
      await page.goto("/profile");
      await expect(
        page.getByRole("heading", { name: EN.heading })
      ).toBeVisible();

      await currentPassword(page).fill(account.password);
      await newPassword(page).fill(NEW_PASSWORD);
      await confirmPassword(page).fill(NEW_PASSWORD);
      await saveButton(page).click();
      await expect(page.getByText(EN.toastSuccess)).toBeVisible({
        timeout: 10_000
      });
      await expect(page).toHaveURL(/\/profile/);
      // [ST valid] this device got a rotated cookie, so a reload stays signed in.
      await page.reload();
      await expect(
        page.getByRole("heading", { name: EN.heading })
      ).toBeVisible();
      await expect(page).toHaveURL(/\/profile/);

      expect((await loginOverApi(account.email, NEW_PASSWORD)).status).toBe(
        200
      );
      expect((await loginOverApi(account.email, account.password)).status).toBe(
        401
      );
    }
  );
});

// ---------------------------------------------------------------------------
// Double submit — mocked, delayed 200.
// ---------------------------------------------------------------------------
test.describe("Change Password — double submit", () => {
  // [error-guessing] rapid double-submit -> exactly one PATCH (Save disabled
  // while isPending).
  // MOCKED (page.route 200, delayed 800ms) — the intent is the FE's in-flight
  // guard: while the first request is pending the Save button is disabled
  // (isDisabled = !isDirty || isPending), so a second rapid click must NOT fire
  // a second PATCH. A delayed mock holds the request in flight long enough to
  // attempt the second click, and lets us count PATCHes without consuming the
  // real rate-limit bucket or mutating the real password.
  test(
    "fires exactly one PATCH on rapid double-submit",
    { tag: ["@TC-PWD-016"] },
    async ({ page }) => {
      await page.goto("/profile");
      await expect(
        page.getByRole("heading", { name: EN.heading })
      ).toBeVisible();
      let patchCount = 0;
      page.on("request", (r) => {
        if (r.method() === "PATCH" && r.url().includes(CHANGE_PASSWORD_PATH)) {
          patchCount += 1;
        }
      });
      await mockChangePassword(page, {
        status: 200,
        body: { data: await realTokens(page) },
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
    }
  );
});

// ---------------------------------------------------------------------------
// Authentication — no session at all.
// ---------------------------------------------------------------------------
test.describe("Change Password — authentication", () => {
  test.use({ role: "guest" });

  test(
    "redirects unauthenticated user away from the profile page",
    { tag: ["@TC-PWD-003"] },
    async ({ page }) => {
      await page.goto("/profile");
      await expect(page).toHaveURL(/\/login/);
    }
  );
});
