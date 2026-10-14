import { test, expect } from "@/fixtures";
import type { Page, Route } from "@playwright/test";
import { clientLiteral, copy, copyVi } from "@/data/copy";
import { ForceChangePasswordPage } from "@/pages/force-password/force-change-password.page";
import {
  afterNextPaint,
  CHANGE_PASSWORD_GLOB,
  countPatches,
  fakeTokens,
  holdChangePassword,
  mockChangePassword,
  mockSessionWithClaims
} from "./helpers";

// Forced change-password screen (/change-password) — the client gate and form
// mechanics. Test cases: test-cases/password.md (TC-PASSWORD-030 …
// TC-PASSWORD-041).
//
// The declared role barely matters: each test fabricates its session by
// mocking `POST /auth/token/refresh` (./helpers → mockSessionWithClaims) with
// an unsigned idToken carrying the `mustChangePassword` claim it needs. The
// client decodes but never verifies that token, which lets every claim
// combination be driven deterministically and without mutating anything.
//
// The real round trip — admin resets a throwaway, the user signs in with the
// emailed temp password, is forced here, changes it — is
// tests/e2e/password/admin-reset.e2e.ts (TC-PASSWORD-042); revocation of
// pre-reset sessions is tests/api/password/admin-reset.api.ts (TC-PASSWORD-043).

test.use({ role: "admin" });

const t = copy.forceChangePassword;
const v = copy.common.validation;
const SUCCESS_TOAST = copy.account.changePassword.toast.success;

// The temporary password is never checked on the client beyond "non-empty";
// its server check is exercised through the mocked PATCH answers below.
const TEMP_PASSWORD = "TempPass@123";
const NEW_PASSWORD = "NewPass@123";

const mockChangePasswordSuccess = (page: Page) =>
  mockChangePassword(page, { status: 200, body: { data: fakeTokens(false) } });

test(
  "A must-change session is sent to /change-password and released after the change",
  { tag: ["@TC-PASSWORD-030", "@smoke"] },
  async ({ page, forceChangePasswordPage: screen }) => {
    await mockSessionWithClaims(page, { mustChangePassword: true });
    // HOME's own loading announcements overwrite the shared live region, so
    // check that the redirect announcement was made, not that it is last.
    await screen.announcer.record();
    await page.goto("/");

    await expect(page).toHaveURL(/\/change-password$/);
    await expect(screen.heading()).toBeVisible();
    await expect
      .poll(() => screen.announcer.history())
      .toContain(t.announce.redirected);

    await mockChangePasswordSuccess(page);
    await screen.fill(TEMP_PASSWORD, NEW_PASSWORD);
    await screen.submit();

    await expect(screen.toast.withText(SUCCESS_TOAST)).toBeVisible();
    await expect(page).toHaveURL("/");

    await page.unroute(CHANGE_PASSWORD_GLOB);
  }
);

test.describe("without a session", () => {
  test.use({ role: "guest" });

  test(
    "Signed-out visitors cannot open /change-password",
    { tag: ["@TC-PASSWORD-031"] },
    async ({ page, forceChangePasswordPage: screen }) => {
      await screen.goto();
      await expect(page).toHaveURL(/\/login/);
    }
  );
});

// The gate is role-agnostic: an admin who must change the password cannot
// reach the admin console either.
test.describe("The gate applies to every role and every page", () => {
  test(
    "an admin with mustChangePassword is sent from /admin to /change-password",
    { tag: ["@TC-PASSWORD-041", "@smoke"] },
    async ({ page, forceChangePasswordPage: screen }) => {
      await mockSessionWithClaims(page, {
        mustChangePassword: true,
        roles: "admin"
      });
      await page.goto("/admin");
      await expect(page).toHaveURL(/\/change-password$/);
      await expect(screen.heading()).toBeVisible();
    }
  );

  test(
    "a user with mustChangePassword cannot stay on another page",
    { tag: ["@TC-PASSWORD-041", "@smoke"] },
    async ({ page }) => {
      await mockSessionWithClaims(page, { mustChangePassword: true });
      for (const path of ["/apps", "/profile", "/vi/favorites"]) {
        await page.goto(path);
        await expect(page).toHaveURL(/\/change-password$/);
      }
    }
  );
});

test(
  "A normal session cannot open /change-password",
  { tag: ["@TC-PASSWORD-034"] },
  async ({ page, forceChangePasswordPage: screen }) => {
    await mockSessionWithClaims(page, { mustChangePassword: false });
    await screen.goto();
    await expect(page).toHaveURL("/");
  }
);

test(
  "The forced screen shows labels, never keys or claims",
  { tag: ["@TC-PASSWORD-036"] },
  async ({ page, forceChangePasswordPage: screen }) => {
    await mockSessionWithClaims(page, { mustChangePassword: true });
    await screen.goto();

    await expect(screen.tempPasswordInput()).toBeVisible();
    await expect(screen.newPasswordInput()).toBeVisible();
    await expect(screen.confirmPasswordInput()).toBeVisible();
    await expect(screen.submitButton()).toBeVisible();

    await expect(screen.message(/forceChangePassword\./)).toHaveCount(0);
    await expect(screen.message("mustChangePassword")).toHaveCount(0);
    await expect(screen.message("true", { exact: true })).toHaveCount(0);
  }
);

test.describe("The forced screen in English and Vietnamese", () => {
  test(
    "EN: redirect + title/labels render English strings",
    { tag: ["@TC-PASSWORD-037"] },
    async ({ page, forceChangePasswordPage: screen }) => {
      await mockSessionWithClaims(page, { mustChangePassword: true });
      await page.goto("/");
      await expect(page).toHaveURL(/\/change-password$/);
      await expect(screen.heading()).toBeVisible();
      await expect(screen.tempPasswordInput()).toBeVisible();
    }
  );

  test(
    "VI: title/labels/submit render Vietnamese strings, no raw key leaks",
    { tag: ["@TC-PASSWORD-037"] },
    async ({ page }) => {
      const vi = new ForceChangePasswordPage(page, copyVi);
      await mockSessionWithClaims(page, { mustChangePassword: true });
      await vi.goto("/vi");
      await expect(vi.heading()).toBeVisible();
      await expect(vi.tempPasswordInput()).toBeVisible();
      await expect(vi.newPasswordInput()).toBeVisible();
      await expect(vi.confirmPasswordInput()).toBeVisible();
      await expect(vi.submitButton()).toBeVisible();
      await expect(vi.message(/forceChangePassword\./)).toHaveCount(0);
    }
  );
});

// ---------------------------------------------------------------------------
// Must-change session already on /change-password.
// ---------------------------------------------------------------------------
test.describe("on the forced screen", () => {
  test.beforeEach(async ({ page, forceChangePasswordPage: screen }) => {
    await mockSessionWithClaims(page, { mustChangePassword: true });
    await screen.goto();
    await expect(screen.heading()).toBeVisible();
  });

  test.describe("Forced-change form blocks invalid input before the API", () => {
    test(
      "blocks confirm mismatch on the client (no API call)",
      { tag: ["@TC-PASSWORD-032"] },
      async ({ page, forceChangePasswordPage: screen }) => {
        const patches = countPatches(page);
        await screen.fill(TEMP_PASSWORD, NEW_PASSWORD, "Different@123");
        await screen.submit();
        await expect(screen.confirmPasswordInput()).toHaveAttribute(
          "aria-invalid",
          "true"
        );
        expect(patches.count).toBe(0);
      }
    );

    // [EP] invalid new-password classes — client zod (passwordSchema).
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
      test(
        `[EP] rejects new password ${label} (no API call)`,
        { tag: ["@TC-PASSWORD-032"] },
        async ({ page, forceChangePasswordPage: screen }) => {
          const patches = countPatches(page);
          await screen.fill(TEMP_PASSWORD, value);
          await screen.submit();
          await expect(screen.newPasswordInput()).toHaveAttribute(
            "aria-invalid",
            "true"
          );
          expect(patches.count).toBe(0);
        }
      );
    }

    test(
      "[EP] rejects an empty temporary (current) password (no API call)",
      { tag: ["@TC-PASSWORD-032"] },
      async ({ page, forceChangePasswordPage: screen }) => {
        const patches = countPatches(page);
        await screen.newPasswordInput().fill(NEW_PASSWORD);
        await screen.confirmPasswordInput().fill(NEW_PASSWORD);
        await screen.tempPasswordInput().fill("x");
        await screen.tempPasswordInput().fill("");
        await screen.submit();
        await expect(screen.tempPasswordInput()).toHaveAttribute(
          "aria-invalid",
          "true"
        );
        expect(patches.count).toBe(0);
      }
    );
  });

  test.describe("Wrong temp password vs. invalid new password", () => {
    // [DT row i] temp wrong + new valid → server 400 → inline error on the
    // temp field (ForceChangePasswordForm's FIELD_ERROR_MAP).
    test(
      "[DT] currentWrong + newValid → BE 400 wrong-current maps to an inline field error",
      { tag: ["@TC-PASSWORD-033"] },
      async ({ page, forceChangePasswordPage: screen }) => {
        await mockChangePassword(page, {
          status: 400,
          body: {
            code: "CHANGE_PASSWORD_WRONG_CURRENT",
            message: "Wrong current"
          }
        });
        await screen.fill("WrongTemp@123", NEW_PASSWORD);
        await screen.submit();
        await expect(
          screen.message(v.currentPassword.wrongCurrentPassword)
        ).toBeVisible();
        await expect(screen.tempPasswordInput()).toHaveAttribute(
          "aria-invalid",
          "true"
        );
        await page.unroute(CHANGE_PASSWORD_GLOB);
      }
    );

    // [DT row iii] temp ok + new invalid → client policy blocks.
    test(
      "[DT] currentOK + newInvalid → client policy blocks before any API call",
      { tag: ["@TC-PASSWORD-033"] },
      async ({ page, forceChangePasswordPage: screen }) => {
        const patches = countPatches(page);
        await screen.fill(TEMP_PASSWORD, "newpass@123");
        await screen.submit();
        await expect(screen.newPasswordInput()).toHaveAttribute(
          "aria-invalid",
          "true"
        );
        expect(patches.count).toBe(0);
      }
    );
  });

  test.describe("Forced-change new-password length boundaries", () => {
    test(
      "[BVA] rejects a new password of 7 characters (below the minimum, no API call)",
      { tag: ["@TC-PASSWORD-035"] },
      async ({ page, forceChangePasswordPage: screen }) => {
        const patches = countPatches(page);
        const sevenChars = "Ab@3xyz";
        expect(sevenChars).toHaveLength(7);
        await screen.fill(TEMP_PASSWORD, sevenChars);
        await screen.submit();
        await expect(screen.newPasswordInput()).toHaveAttribute(
          "aria-invalid",
          "true"
        );
        expect(patches.count).toBe(0);
      }
    );

    test(
      "[BVA] accepts a new password of exactly 8 characters (boundary, mocked 200)",
      { tag: ["@TC-PASSWORD-035"] },
      async ({ page, forceChangePasswordPage: screen }) => {
        const eightChars = "Ab@3xyzz";
        expect(eightChars).toHaveLength(8);
        await mockChangePasswordSuccess(page);
        await screen.fill(TEMP_PASSWORD, eightChars);
        await screen.submit();
        await expect(screen.toast.withText(SUCCESS_TOAST)).toBeVisible();
        await page.unroute(CHANGE_PASSWORD_GLOB);
      }
    );

    test(
      "[BVA] accepts a new password of exactly 128 characters (boundary, mocked 200)",
      { tag: ["@TC-PASSWORD-035"] },
      async ({ page, forceChangePasswordPage: screen }) => {
        const maxChars = "Ab@3" + "x".repeat(124); // 128 chars
        expect(maxChars).toHaveLength(128);
        await mockChangePasswordSuccess(page);
        await screen.fill(TEMP_PASSWORD, maxChars);
        await screen.submit();
        await expect(screen.toast.withText(SUCCESS_TOAST)).toBeVisible();
        await page.unroute(CHANGE_PASSWORD_GLOB);
      }
    );

    test(
      "[BVA] rejects a new password of 129 characters (above the maximum, no API call)",
      { tag: ["@TC-PASSWORD-035"] },
      async ({ page, forceChangePasswordPage: screen }) => {
        const patches = countPatches(page);
        const tooLong = "Ab@3" + "x".repeat(125); // 129 chars
        expect(tooLong).toHaveLength(129);
        await screen.fill(TEMP_PASSWORD, tooLong);
        await screen.submit();
        await expect(screen.newPasswordInput()).toHaveAttribute(
          "aria-invalid",
          "true"
        );
        expect(patches.count).toBe(0);
      }
    );
  });

  test.describe("Forced-change server failure and in-flight state", () => {
    // [error-guessing] 500 → the form has no onError of its own (only the
    // field-error mapping), so the global mutationCache 5xx toast shows.
    test(
      "BE 500 → generic server-error toast, stays on /change-password (flag still true)",
      { tag: ["@TC-PASSWORD-038"] },
      async ({ page, forceChangePasswordPage: screen }) => {
        await mockChangePassword(page, {
          status: 500,
          body: { code: "INTERNAL_SERVER_ERROR", message: "boom" }
        });
        await screen.fill(TEMP_PASSWORD, NEW_PASSWORD);
        await screen.submit();
        await expect(
          screen.toast.withText(clientLiteral.serverErrorToast, { exact: true })
        ).toBeVisible();
        await expect(page).toHaveURL(/\/change-password/);
        await page.unroute(CHANGE_PASSWORD_GLOB);
      }
    );

    // Held PATCH → inputs and submit disabled, then aborted (no fake success
    // handler runs, nothing to clean up).
    test(
      "disables inputs and submit while the change-password request is in flight",
      { tag: ["@TC-PASSWORD-038"] },
      async ({ page, forceChangePasswordPage: screen }) => {
        const release = await holdChangePassword(page);
        await screen.fill(TEMP_PASSWORD, NEW_PASSWORD);
        await screen.submit();
        await expect(screen.tempPasswordInput()).toBeDisabled();
        await expect(screen.newPasswordInput()).toBeDisabled();
        await expect(screen.confirmPasswordInput()).toBeDisabled();
        await expect(screen.submitButton()).toBeDisabled();
        await release();
        await page.unroute(CHANGE_PASSWORD_GLOB);
      }
    );
  });

  test.describe("The forced form works from the keyboard", () => {
    // Each PasswordInput renders a show/hide toggle AFTER its input: temp →
    // toggle → new → toggle → confirm → toggle → Submit.
    test(
      "tabs through fields and toggles in DOM order",
      { tag: ["@TC-PASSWORD-040"] },
      async ({ page, forceChangePasswordPage: screen }) => {
        await screen.tempPasswordInput().focus();
        await expect(screen.tempPasswordInput()).toBeFocused();
        await page.keyboard.press("Tab"); // temp show/hide toggle
        await page.keyboard.press("Tab"); // -> new password input
        await expect(screen.newPasswordInput()).toBeFocused();
        await page.keyboard.press("Tab"); // new show/hide toggle
        await page.keyboard.press("Tab"); // -> confirm password input
        await expect(screen.confirmPasswordInput()).toBeFocused();
        await page.keyboard.press("Tab"); // confirm show/hide toggle
        await page.keyboard.press("Tab"); // -> Submit button
        await expect(screen.submitButton()).toBeFocused();
      }
    );

    test(
      "keyboard-only submit (focus + Enter) fires exactly one PATCH",
      { tag: ["@TC-PASSWORD-040"] },
      async ({ page, forceChangePasswordPage: screen }) => {
        let patchCount = 0;
        await page.route(CHANGE_PASSWORD_GLOB, async (route: Route) => {
          if (route.request().method() !== "PATCH") return route.continue();
          patchCount += 1;
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({ data: fakeTokens(false) })
          });
        });
        await screen.fill(TEMP_PASSWORD, NEW_PASSWORD);
        await screen.submitButton().focus();
        await page.keyboard.press("Enter");
        await expect(page).toHaveURL("/");
        expect(patchCount).toBe(1);
        await page.unroute(CHANGE_PASSWORD_GLOB);
      }
    );
  });
});

test.describe("After the change the gate does not bounce back; one PATCH per submit", () => {
  test(
    "[ST valid] a successful change lands on HOME and does not bounce back to /change-password",
    { tag: ["@TC-PASSWORD-039"] },
    async ({ page, forceChangePasswordPage: screen }) => {
      await mockSessionWithClaims(page, { mustChangePassword: true });
      // Opened directly on /change-password, so the gate has no reason to
      // announce a redirect before the change — any later one is a bounce.
      await screen.announcer.record();
      await screen.goto();
      await mockChangePasswordSuccess(page);
      await screen.fill(TEMP_PASSWORD, NEW_PASSWORD);
      await screen.submit();
      await expect(page).toHaveURL("/");
      // MustChangePasswordGate re-evaluates on every render off the (now
      // mustChangePassword:false) in-memory session. Its redirect effect
      // announces (in a rAF) before it calls router.replace — so after the
      // next paint, the absence of that announcement proves no bounce began.
      await afterNextPaint(page);
      expect(await screen.announcer.history()).not.toContain(
        t.announce.redirected
      );
      await expect(page).toHaveURL("/");
      await page.unroute(CHANGE_PASSWORD_GLOB);
    }
  );

  test(
    "double-submit fires exactly one PATCH (guarded by useSubmitGuard + disabled submit)",
    { tag: ["@TC-PASSWORD-039"] },
    async ({ page, forceChangePasswordPage: screen }) => {
      await mockSessionWithClaims(page, { mustChangePassword: true });
      await screen.goto();

      let patchCount = 0;
      await page.route(CHANGE_PASSWORD_GLOB, async (route: Route) => {
        if (route.request().method() !== "PATCH") return route.continue();
        patchCount += 1;
        await new Promise((resolve) => setTimeout(resolve, 400));
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ data: fakeTokens(false) })
        });
      });

      await screen.fill(TEMP_PASSWORD, NEW_PASSWORD);
      await screen.submitButton().click();
      // Second click while the first is in flight: useSubmitGuard's
      // inFlightRef AND the disabled submit both block it — force-click to
      // prove the guard, not just the attribute.
      await screen.submitButton().click({ force: true });

      await expect(page).toHaveURL("/");
      expect(patchCount).toBe(1);
      await page.unroute(CHANGE_PASSWORD_GLOB);
    }
  );
});
