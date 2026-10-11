import { test, expect } from "@fixtures";
import type { Page, Route } from "@playwright/test";
import { mockSessionWithClaims, fakeJwt } from "@helpers/session";
import {
  mockChangePassword,
  trackPatch,
  expectNoPatch
} from "@helpers/changePassword";
import { announcements, recordAnnouncements } from "@helpers/password";

test.use({ role: "admin" });

// Forced change-password screen (/change-password) — the client gate and form
// mechanics. Test cases: test-cases/password.md (TC-PWD-030 … TC-PWD-041).
//
// The declared role barely matters: each test fabricates its session by
// mocking `POST /api/v1/auth/token/refresh` (helpers/session.ts) with an
// unsigned idToken carrying the `mustChangePassword` claim it needs. The
// client decodes but never verifies that token, which lets every claim
// combination be driven deterministically and without mutating anything.
//
// The real round trip — admin resets a throwaway, the user signs in with the
// emailed temp password, is forced here, changes it — is
// tests/e2e/password/admin-reset.e2e.ts (TC-PWD-042); revocation of
// pre-reset sessions is tests/api/password/admin-reset.api.ts (TC-PWD-043).

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
  test(
    "mustChangePassword=true redirects HOME -> /change-password; a successful change lands HOME",
    { tag: ["@TC-PWD-030"] },
    async ({ page }) => {
      await mockSessionWithClaims(page, { mustChangePassword: true });
      // HOME's own loading announcements overwrite the shared live region, so
      // check that the redirect announcement was made, not that it is last.
      await recordAnnouncements(page);
      await page.goto("/");

      await expect(page).toHaveURL(/\/change-password$/);
      await expect(page.getByRole("heading", { name: EN.title })).toBeVisible();
      await expect
        .poll(() => announcements(page))
        .toContain(EN.redirectedAnnounce);

      await mockChangePasswordSuccess(page);
      await currentPassword(page).fill(TEMP_PASSWORD);
      await newPassword(page).fill(NEW_PASSWORD);
      await confirmPassword(page).fill(NEW_PASSWORD);
      await submitButton(page).click();

      await expect(page.getByText(EN.toastSuccess)).toBeVisible();
      await expect(page).toHaveURL("/");

      await page.unroute(CHANGE_PASSWORD_GLOB);
    }
  );
});

// ---------------------------------------------------------------------------
// 2. AuthN — unauthenticated visit redirects to /login (real, no mocking).
// ---------------------------------------------------------------------------
test.describe("Force change-password — authentication", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test(
    "unauthenticated visit to /change-password redirects to /login",
    { tag: ["@TC-PWD-031"] },
    async ({ page }) => {
      await page.goto("/change-password");
      await expect(page).toHaveURL(/\/login/);
    }
  );
});

// ---------------------------------------------------------------------------
// 3. AuthZ — the gate is role-agnostic: an admin who must change the password
//    cannot reach the admin console either.
// ---------------------------------------------------------------------------
test.describe("Force change-password — authorization", () => {
  test(
    "an admin with mustChangePassword is sent from /admin to /change-password",
    { tag: ["@TC-PWD-041"] },
    async ({ page }) => {
      await mockSessionWithClaims(page, {
        mustChangePassword: true,
        roles: "admin"
      });
      await page.goto("/admin");
      await expect(page).toHaveURL(/\/change-password$/);
      await expect(page.getByRole("heading", { name: EN.title })).toBeVisible();
    }
  );

  test(
    "a user with mustChangePassword cannot stay on another page",
    { tag: ["@TC-PWD-041"] },
    async ({ page }) => {
      await mockSessionWithClaims(page, { mustChangePassword: true });
      for (const path of ["/apps", "/profile", "/vi/favorites"]) {
        await page.goto(path);
        await expect(page).toHaveURL(/\/change-password$/);
      }
    }
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

  test(
    "blocks confirm mismatch on the client (no API call)",
    { tag: ["@TC-PWD-032"] },
    async ({ page }) => {
      const tracker = trackPatch(page);
      await currentPassword(page).fill(TEMP_PASSWORD);
      await newPassword(page).fill(NEW_PASSWORD);
      await confirmPassword(page).fill("Different@123");
      await submitButton(page).click();
      await expect(confirmPassword(page)).toHaveAttribute(
        "aria-invalid",
        "true"
      );
      expectNoPatch(tracker);
    }
  );

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
    test(
      `[EP] rejects new password ${label} (no API call)`,
      { tag: ["@TC-PWD-032"] },
      async ({ page }) => {
        const tracker = trackPatch(page);
        await currentPassword(page).fill(TEMP_PASSWORD);
        await newPassword(page).fill(value);
        await confirmPassword(page).fill(value);
        await submitButton(page).click();
        await expect(newPassword(page)).toHaveAttribute("aria-invalid", "true");
        expectNoPatch(tracker);
      }
    );
  }

  test(
    "[EP] rejects an empty temporary (current) password (no API call)",
    { tag: ["@TC-PWD-032"] },
    async ({ page }) => {
      const tracker = trackPatch(page);
      await newPassword(page).fill(NEW_PASSWORD);
      await confirmPassword(page).fill(NEW_PASSWORD);
      await currentPassword(page).fill("x");
      await currentPassword(page).fill("");
      await submitButton(page).click();
      await expect(currentPassword(page)).toHaveAttribute(
        "aria-invalid",
        "true"
      );
      expectNoPatch(tracker);
    }
  );

  // [DT row i] currentWrong (temp sai) + newValid -> BE 400 -> inline field
  // error mapped to the currentPassword field (ForceChangePasswordForm's own
  // FIELD_ERROR_MAP, same mapping as ChangePasswordCard's).
  test(
    "[DT] currentWrong + newValid → BE 400 wrong-current maps to an inline field error",
    { tag: ["@TC-PWD-033"] },
    async ({ page }) => {
      await mockChangePassword(page, {
        status: 400,
        body: {
          code: "CHANGE_PASSWORD_WRONG_CURRENT",
          message: "Wrong current"
        }
      });
      await currentPassword(page).fill("WrongTemp@123");
      await newPassword(page).fill(NEW_PASSWORD);
      await confirmPassword(page).fill(NEW_PASSWORD);
      await submitButton(page).click();
      await expect(
        page.getByText("Current password is incorrect")
      ).toBeVisible();
      await expect(currentPassword(page)).toHaveAttribute(
        "aria-invalid",
        "true"
      );
      await page.unroute(CHANGE_PASSWORD_GLOB);
    }
  );

  // [DT row iii] currentOK + newInvalid -> client policy wins (no PATCH).
  test(
    "[DT] currentOK + newInvalid → client policy blocks before any API call",
    { tag: ["@TC-PWD-033"] },
    async ({ page }) => {
      const tracker = trackPatch(page);
      await currentPassword(page).fill(TEMP_PASSWORD);
      await newPassword(page).fill("newpass@123");
      await confirmPassword(page).fill("newpass@123");
      await submitButton(page).click();
      await expect(newPassword(page)).toHaveAttribute("aria-invalid", "true");
      expectNoPatch(tracker);
    }
  );
});

// ---------------------------------------------------------------------------
// 5. Empty/null — flag-gated visibility, not literal empty state.
// ---------------------------------------------------------------------------
test.describe("Force change-password — empty/null (flag-gated visibility)", () => {
  test(
    "mustChangePassword=false visiting /change-password directly redirects HOME",
    { tag: ["@TC-PWD-034"] },
    async ({ page }) => {
      await mockSessionWithClaims(page, { mustChangePassword: false });
      await page.goto("/change-password");
      await expect(page).toHaveURL("/");
    }
  );
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

  test(
    "[BVA] rejects a new password of 7 characters (below the minimum, no API call)",
    { tag: ["@TC-PWD-035"] },
    async ({ page }) => {
      const tracker = trackPatch(page);
      const sevenChars = "Ab@3xyz";
      expect(sevenChars).toHaveLength(7);
      await currentPassword(page).fill(TEMP_PASSWORD);
      await newPassword(page).fill(sevenChars);
      await confirmPassword(page).fill(sevenChars);
      await submitButton(page).click();
      await expect(newPassword(page)).toHaveAttribute("aria-invalid", "true");
      expectNoPatch(tracker);
    }
  );

  test(
    "[BVA] accepts a new password of exactly 8 characters (boundary, mocked 200)",
    { tag: ["@TC-PWD-035"] },
    async ({ page }) => {
      const eightChars = "Ab@3xyzz";
      expect(eightChars).toHaveLength(8);
      await mockChangePasswordSuccess(page);
      await currentPassword(page).fill(TEMP_PASSWORD);
      await newPassword(page).fill(eightChars);
      await confirmPassword(page).fill(eightChars);
      await submitButton(page).click();
      await expect(page.getByText(EN.toastSuccess)).toBeVisible();
      await page.unroute(CHANGE_PASSWORD_GLOB);
    }
  );

  test(
    "[BVA] accepts a new password of exactly 128 characters (boundary, mocked 200)",
    { tag: ["@TC-PWD-035"] },
    async ({ page }) => {
      const maxChars = "Ab@3" + "x".repeat(124); // 128 chars
      expect(maxChars).toHaveLength(128);
      await mockChangePasswordSuccess(page);
      await currentPassword(page).fill(TEMP_PASSWORD);
      await newPassword(page).fill(maxChars);
      await confirmPassword(page).fill(maxChars);
      await submitButton(page).click();
      await expect(page.getByText(EN.toastSuccess)).toBeVisible();
      await page.unroute(CHANGE_PASSWORD_GLOB);
    }
  );

  test(
    "[BVA] rejects a new password of 129 characters (above the maximum, no API call)",
    { tag: ["@TC-PWD-035"] },
    async ({ page }) => {
      const tracker = trackPatch(page);
      const tooLong = "Ab@3" + "x".repeat(125); // 129 chars
      expect(tooLong).toHaveLength(129);
      await currentPassword(page).fill(TEMP_PASSWORD);
      await newPassword(page).fill(tooLong);
      await confirmPassword(page).fill(tooLong);
      await submitButton(page).click();
      await expect(newPassword(page)).toHaveAttribute("aria-invalid", "true");
      expectNoPatch(tracker);
    }
  );
});

// ---------------------------------------------------------------------------
// 8. Data rendering — i18n labels only, never a raw key or the raw claim.
// ---------------------------------------------------------------------------
test.describe("Force change-password — data rendering", () => {
  test(
    "renders i18n labels; never a raw key or the mustChangePassword claim as text",
    { tag: ["@TC-PWD-036"] },
    async ({ page }) => {
      await mockSessionWithClaims(page, { mustChangePassword: true });
      await page.goto("/change-password");

      await expect(currentPassword(page)).toBeVisible();
      await expect(newPassword(page)).toBeVisible();
      await expect(confirmPassword(page)).toBeVisible();
      await expect(submitButton(page)).toBeVisible();

      await expect(page.getByText(/forceChangePassword\./)).toHaveCount(0);
      await expect(page.getByText("mustChangePassword")).toHaveCount(0);
      await expect(page.getByText("true", { exact: true })).toHaveCount(0);
    }
  );
});

// ---------------------------------------------------------------------------
// 9. i18n (en + vi) — title/description/labels/submit/announce.
// ---------------------------------------------------------------------------
test.describe("Force change-password — i18n", () => {
  test(
    "EN: redirect + title/labels render English strings",
    { tag: ["@TC-PWD-037"] },
    async ({ page }) => {
      await mockSessionWithClaims(page, { mustChangePassword: true });
      await page.goto("/");
      await expect(page).toHaveURL(/\/change-password$/);
      await expect(page.getByRole("heading", { name: EN.title })).toBeVisible();
      await expect(currentPassword(page)).toBeVisible();
    }
  );

  test(
    "VI: title/labels/submit render Vietnamese strings, no raw key leaks",
    { tag: ["@TC-PWD-037"] },
    async ({ page }) => {
      await mockSessionWithClaims(page, { mustChangePassword: true });
      await page.goto("/vi/change-password");
      await expect(page.getByRole("heading", { name: VI.title })).toBeVisible();
      await expect(currentPassword(page, VI.currentLabel)).toBeVisible();
      await expect(newPassword(page, VI.newLabel)).toBeVisible();
      await expect(confirmPassword(page, VI.confirmLabel)).toBeVisible();
      await expect(submitButton(page, VI.submit)).toBeVisible();
      await expect(page.getByText(/forceChangePassword\./)).toHaveCount(0);
    }
  );
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

  // [error-guessing] 500 -> ForceChangePasswordForm has no onError of its
  // own (only field-error mapping), so the global mutationCache 5xx branch
  // (src/libs/query-client.ts) shows the generic toast. The profile card
  // differs: it defines onError and shows "Failed to update password".
  test(
    "BE 500 → generic server-error toast, stays on /change-password (flag still true)",
    { tag: ["@TC-PWD-038"] },
    async ({ page }) => {
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
    }
  );

  // [error-guessing] loading: delayed PATCH -> inputs + submit disabled while
  // in flight, then aborted (no fake success handler runs -> nothing to
  // clean up), matching change-password.e2e.ts's loading-test convention.
  test(
    "disables inputs and submit while the change-password request is in flight",
    { tag: ["@TC-PWD-038"] },
    async ({ page }) => {
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
    }
  );
});

// ---------------------------------------------------------------------------
// 11. Mutation safety.
// ---------------------------------------------------------------------------
test.describe("Force change-password — mutation safety", () => {
  test(
    "[ST valid] a successful change lands on HOME and does not bounce back to /change-password",
    { tag: ["@TC-PWD-039"] },
    async ({ page }) => {
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
    }
  );

  test(
    "double-submit fires exactly one PATCH (guarded by useSubmitGuard + disabled submit)",
    { tag: ["@TC-PWD-039"] },
    async ({ page }) => {
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
    }
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
  test(
    "tabs through fields and toggles in DOM order",
    { tag: ["@TC-PWD-040"] },
    async ({ page }) => {
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
    }
  );

  test(
    "keyboard-only submit (focus + Enter) fires exactly one PATCH",
    { tag: ["@TC-PWD-040"] },
    async ({ page }) => {
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
    }
  );
});
