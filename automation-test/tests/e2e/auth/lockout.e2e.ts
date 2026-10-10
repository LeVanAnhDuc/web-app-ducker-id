import { test, expect as baseExpect } from "@fixtures";
import type { Page } from "@playwright/test";
import { createAccount } from "@helpers/accounts";
import { WRONG_PASSWORD, failPasswords, lockAccount } from "@helpers/auth";

// Lockout as the user sees it — the password step shows the server's 429
// message (server/src/i18n/locales/en/login.json → errors.accountLocked).
// Attempts 1–9 are made over the API to keep the test short; the attempt
// that crosses the threshold is made in the browser.

test.use({ role: "guest" });

const expect = baseExpect.configure({ timeout: 15_000 });

const LOCKED =
  /Account temporarily locked after 10 failed attempts\. Please try again in \d+ seconds/;

/** Submits the password step and returns the login call's status. */
async function submitPassword(page: Page, password: string): Promise<number> {
  const login = page.waitForResponse(
    (r) =>
      r.url().endsWith("/api/v1/auth/login") && r.request().method() === "POST"
  );
  await page.getByLabel("Enter your password").fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  return (await login).status();
}

test(
  "the 10th wrong password locks the account and says for how long",
  { tag: ["@TC-AUTH-042", "@smoke"] },
  async ({ page }) => {
    const account = await createAccount({ tag: "auth-ui-lock" });
    const ninth = await failPasswords(account.email, 9);
    expect(ninth.status).toBe(401);

    await page.goto(
      `/login/password?email=${encodeURIComponent(account.email)}`
    );
    expect(await submitPassword(page, WRONG_PASSWORD)).toBe(429);
    await expect(page.getByText(LOCKED).first()).toBeVisible();
    await expect(page).toHaveURL(/\/login\/password\?email=/);

    // While locked even the right password is refused with the same message.
    await page.reload();
    expect(await submitPassword(page, account.password)).toBe(429);
    await expect(page.getByText(LOCKED).first()).toBeVisible();
    await expect(page).toHaveURL(/\/login\/password\?email=/);
  }
);

test(
  "a locked user is offered the self-service unlock from the sign-in screen",
  { tag: ["@TC-AUTH-048"] },
  async ({ page }) => {
    // BUG: BUG-007 — README / REQ-AUTH-10 promise "request an unlock code by email and
    // verify it", and the API exists (/api/v1/auth/unlock/*), but the client
    // has no unlock screen, route or link — a locked user only sees the toast.
    test.fail();
    const account = await createAccount({ tag: "auth-ui-unlock" });
    await lockAccount(account.email);

    await page.goto(
      `/login/password?email=${encodeURIComponent(account.email)}`
    );
    expect(await submitPassword(page, account.password)).toBe(429);
    await expect(page.getByText(LOCKED).first()).toBeVisible();
    await expect(
      page
        .getByRole("link", { name: /unlock/i })
        .or(page.getByRole("button", { name: /unlock/i }))
    ).toBeVisible({ timeout: 3_000 });
  }
);
