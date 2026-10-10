import { test, expect } from "@fixtures";
import { createAccount } from "@helpers/accounts";
import {
  adminResetAndReadTempPassword,
  decodeJwt,
  loginInBrowser,
  loginOverApi
} from "@helpers/password";

// Admin reset → forced change, end to end with no mocks. Test case:
// test-cases/password.md (TC-PWD-042). An admin (adminApi) resets a
// throwaway account; the temp password is read from the queued
// ADMIN_RESET_PASSWORD email; the user signs in with it in an empty (`guest`)
// context, is held on /change-password, changes it and lands on HOME.

test.use({ role: "guest" });

const NEW_PASSWORD = "MyOwnPass@123";

const EN = {
  title: "Set a new password",
  temp: "Temporary password",
  newPassword: "New password",
  confirm: "Confirm new password",
  submit: "Set new password",
  toastSuccess: "Password updated successfully"
} as const;

test(
  "after an admin reset the user is forced to change the temp password, then uses the site",
  { tag: ["@TC-PWD-042", "@smoke"] },
  async ({ page, adminApi }) => {
    const account = await createAccount({ tag: "ar-ui" });
    const temp = await adminResetAndReadTempPassword(adminApi, account.email);
    expect((await loginOverApi(account.email, account.password)).status).toBe(
      401
    );

    await loginInBrowser(page, account.email, temp);
    await page.goto("/");
    await expect(page).toHaveURL(/\/change-password$/);
    await expect(page.getByRole("heading", { name: EN.title })).toBeVisible();

    // The rest of the site stays out of reach while the flag is set.
    await page.goto("/apps");
    await expect(page).toHaveURL(/\/change-password$/);

    await page.getByLabel(EN.temp, { exact: true }).fill(temp);
    await page.getByLabel(EN.newPassword, { exact: true }).fill(NEW_PASSWORD);
    await page.getByLabel(EN.confirm, { exact: true }).fill(NEW_PASSWORD);
    const changed = page.waitForResponse(
      (r) =>
        r.url().includes("/api/v1/auth/change-password") &&
        r.request().method() === "PATCH",
      { timeout: 30_000 }
    );
    await page.getByRole("button", { name: EN.submit }).click();
    expect((await changed).status()).toBe(200);
    await expect(page.getByText(EN.toastSuccess)).toBeVisible({
      timeout: 10_000
    });
    await expect(page).toHaveURL((url) => url.pathname === "/");

    await page.goto("/apps");
    await expect(page).toHaveURL(/\/apps$/);

    const after = await loginOverApi(account.email, NEW_PASSWORD);
    expect(after.status).toBe(200);
    expect(decodeJwt(after.idToken!).mustChangePassword).toBe(false);
    expect((await loginOverApi(account.email, temp)).status).toBe(401);
  }
);
