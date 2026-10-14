import { test, expect as baseExpect } from "@/fixtures";
import { API_PREFIX } from "@/config/urls";
import { pattern, serverMessage } from "@/data/copy";
import { WRONG_PASSWORD } from "@/data/test-data";
import type { LoginPasswordPage } from "@/pages/auth/login-password.page";
import { createAccount } from "@/utils/accounts";
import { failPasswords, lockAccount } from "@/utils/auth";

// Lockout as the user sees it — the password step shows the server's 429
// message (server/src/i18n/locales/en/login.json → errors.accountLocked).
// Attempts 1–9 are made over the API to keep the test short; the attempt
// that crosses the threshold is made in the browser.

test.use({ role: "guest" });
// Locking takes ten real bcrypt sign-ins against the cloud Redis (~20 s).
test.slow(true, "every test locks an account with ten wrong passwords");

const expect = baseExpect.configure({ timeout: 15_000 });

const LOCKED = pattern(serverMessage.login.errors.accountLocked, {
  attempts: 10
});

/** Submits the password step and returns the login call's status. */
async function submitPassword(
  passwordPage: LoginPasswordPage,
  password: string
): Promise<number> {
  const login = passwordPage.page.waitForResponse(
    (r) =>
      r.url().endsWith(`${API_PREFIX}/auth/login`) &&
      r.request().method() === "POST"
  );
  await passwordPage.submitPassword(password);
  return (await login).status();
}

test(
  "The 10th wrong password locks the account and says for how long",
  { tag: ["@TC-AUTH-042", "@smoke"] },
  async ({ page, loginPasswordPage }) => {
    const account = await createAccount({ tag: "auth-ui-lock" });
    const ninth = await failPasswords(account.email, 9);
    expect(ninth.status).toBe(401);

    await loginPasswordPage.goto(account.email);
    expect(await submitPassword(loginPasswordPage, WRONG_PASSWORD)).toBe(429);
    await expect(
      loginPasswordPage.toast.withText(LOCKED).first()
    ).toBeVisible();
    await expect(page).toHaveURL(/\/login\/password\?email=/);

    // While locked even the right password is refused with the same message.
    await page.reload();
    expect(await submitPassword(loginPasswordPage, account.password)).toBe(429);
    await expect(
      loginPasswordPage.toast.withText(LOCKED).first()
    ).toBeVisible();
    await expect(page).toHaveURL(/\/login\/password\?email=/);
  }
);

test(
  "A locked user is offered the self-service unlock from the sign-in screen",
  { tag: ["@TC-AUTH-048"] },
  async ({ loginPasswordPage }) => {
    // README / REQ-AUTH-10 promise "request an unlock code by email and
    // verify it", and the API exists (/auth/unlock/*), but the client
    // has no unlock screen, route or link — a locked user only sees the toast.
    // BUG: defects/auth.md#bug-auth-03
    test.fail();
    const account = await createAccount({ tag: "auth-ui-unlock" });
    await lockAccount(account.email);

    await loginPasswordPage.goto(account.email);
    expect(await submitPassword(loginPasswordPage, account.password)).toBe(429);
    await expect(
      loginPasswordPage.toast.withText(LOCKED).first()
    ).toBeVisible();
    await expect(loginPasswordPage.unlockOffer()).toBeVisible({
      timeout: 3_000
    });
  }
);
