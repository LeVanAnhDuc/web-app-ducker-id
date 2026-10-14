import { test, expect } from "@/fixtures";
import { loginInBrowser, loginOverApi } from "@/api/session";
import { API_PREFIX } from "@/config/urls";
import { copy } from "@/data/copy";
import { createAccount } from "@/utils/accounts";
import { jwtPayload } from "@/utils/jwt";
import { adminResetAndReadTempPassword } from "@/utils/password";

// Admin reset → forced change, end to end with no mocks. Test case:
// test-cases/password.md (TC-PASSWORD-042). An admin (adminApi) resets a
// throwaway account; the temp password is read from the queued
// ADMIN_RESET_PASSWORD email; the user signs in with it in an empty (`guest`)
// context, is held on /change-password, changes it and lands on HOME.

test.use({ role: "guest" });

const NEW_PASSWORD = "MyOwnPass@123";

test(
  "Real admin reset: forced change with the emailed temp password",
  { tag: ["@TC-PASSWORD-042", "@smoke"] },
  async ({ page, adminApi, forceChangePasswordPage: screen }) => {
    const account = await createAccount({ tag: "ar-ui" });
    const temp = await adminResetAndReadTempPassword(adminApi, account.email);
    expect((await loginOverApi(account.email, account.password)).status).toBe(
      401
    );

    await loginInBrowser(page, account.email, temp);
    await page.goto("/");
    await expect(page).toHaveURL(/\/change-password$/);
    await expect(screen.heading()).toBeVisible();

    // The rest of the site stays out of reach while the flag is set.
    await page.goto("/apps");
    await expect(page).toHaveURL(/\/change-password$/);

    await screen.fill(temp, NEW_PASSWORD);
    const changed = page.waitForResponse(
      (r) =>
        r.url().includes(`${API_PREFIX}/auth/change-password`) &&
        r.request().method() === "PATCH",
      { timeout: 30_000 }
    );
    await screen.submit();
    expect((await changed).status()).toBe(200);
    await expect(
      screen.toast.withText(copy.account.changePassword.toast.success)
    ).toBeVisible({ timeout: 10_000 });
    await expect(page).toHaveURL((url) => url.pathname === "/");

    await page.goto("/apps");
    await expect(page).toHaveURL(/\/apps$/);

    const after = await loginOverApi(account.email, NEW_PASSWORD);
    expect(after.status).toBe(200);
    expect(
      jwtPayload<{ mustChangePassword: boolean }>(after.idToken!)
        .mustChangePassword
    ).toBe(false);
    expect((await loginOverApi(account.email, temp)).status).toBe(401);
  }
);
