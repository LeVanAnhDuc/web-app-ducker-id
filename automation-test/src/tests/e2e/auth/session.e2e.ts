import { test, expect as baseExpect } from "@/fixtures";
import { USER_EMAIL } from "@/config/accounts";
import { API_PREFIX } from "@/config/urls";
import { copyVi } from "@/data/copy";
import { LoginPasswordPage } from "@/pages/auth/login-password.page";
import { LoginPage } from "@/pages/auth/login.page";
import type { BasePage } from "@/pages/base.page";
import { createAccount } from "@/utils/accounts";

// Session lifetime and page guards — client/src/layouts/{SessionGate,
// AuthGuardLayout,GuestGuardLayout}, client/src/stores/slices/auth.ts
// (tokens in memory only), client/src/components/UserMenu (Log out).

const expect = baseExpect.configure({ timeout: 15_000 });

async function expectSignedInAs(screen: BasePage, email: string) {
  await screen.userMenu.open();
  await expect(screen.userMenu.entry(email)).toBeVisible();
  await screen.userMenu.close();
}

test.describe("as a guest", () => {
  test.use({ role: "guest" });

  test(
    "The session survives a reload; the access token is never stored in the browser",
    { tag: ["@TC-AUTH-053", "@smoke"] },
    async ({ page, context, loginPage }) => {
      const account = await createAccount({ tag: "auth-ui-reload" });
      const login = page.waitForResponse(
        (r) =>
          r.url().endsWith(`${API_PREFIX}/auth/login`) && r.status() === 200
      );
      await loginPage.signIn(account.email, account.password);
      const accessToken = (await (await login).json()).data
        .accessToken as string;

      const refresh = page.waitForResponse((r) =>
        r.url().endsWith(`${API_PREFIX}/auth/token/refresh`)
      );
      await page.reload();
      expect((await refresh).status()).toBe(200);
      await expect(page).toHaveURL(/\/$/);
      await expectSignedInAs(loginPage, account.email);

      // Nothing readable by page script holds the access token…
      const stored = await page.evaluate(() =>
        JSON.stringify({
          local: { ...localStorage },
          session: { ...sessionStorage },
          cookie: document.cookie
        })
      );
      expect(stored).not.toContain(accessToken);
      expect(stored).not.toContain("refreshToken");
      // …and the refresh token is an HttpOnly cookie.
      const cookies = await context.cookies();
      const refreshCookie = cookies.find((c) => c.name === "refreshToken");
      expect(refreshCookie?.httpOnly).toBe(true);
      expect(refreshCookie?.sameSite).toBe("Lax");
    }
  );

  test(
    "Logging out from the user menu ends the session",
    { tag: ["@TC-AUTH-055", "@smoke"] },
    async ({ page, loginPage }) => {
      const account = await createAccount({ tag: "auth-ui-logout" });
      await loginPage.signIn(account.email, account.password);

      const logout = page.waitForResponse((r) =>
        r.url().endsWith(`${API_PREFIX}/auth/logout`)
      );
      await loginPage.userMenu.signOut();
      expect((await logout).status()).toBe(204);
      await expect(page).toHaveURL(/\/login$/);
      await expect(loginPage.heading()).toBeVisible();

      // A fresh load cannot restore the session and private pages bounce.
      await page.goto("/profile");
      await expect(page).toHaveURL(/\/login$/);
      await loginPage.userMenu.open();
      await expect(loginPage.userMenu.entry(account.email)).toHaveCount(0);
    }
  );

  test(
    "A guest opening a private page is sent to login and returned there after signing in",
    { tag: ["@TC-AUTH-059", "@smoke"] },
    async ({ page, loginPage, loginPasswordPage }) => {
      for (const path of ["/", "/profile", "/login-history"]) {
        await page.goto(path);
        await expect(page, path).toHaveURL(/\/login$/);
      }

      const account = await createAccount({ tag: "auth-ui-deeplink" });
      await page.goto("/profile");
      await expect(page).toHaveURL(/\/login$/);
      await loginPage.submitEmail(account.email);
      await loginPasswordPage.submitPassword(account.password);
      await expect(page).toHaveURL(/\/profile$/);
    }
  );

  test(
    "Vietnamese: guests are sent to /vi/login, which speaks Vietnamese",
    { tag: ["@TC-AUTH-060"] },
    async ({ page }) => {
      const loginVi = new LoginPage(page, copyVi);
      const passwordVi = new LoginPasswordPage(page, copyVi);
      const errors = copyVi.common.validation.email;

      await page.goto("/vi/profile");
      await expect(page).toHaveURL(/\/vi\/login$/);
      await expect(loginVi.heading()).toBeVisible();
      await expect(loginVi.description()).toBeVisible();

      const next = loginVi.continueButton();
      await next.click();
      await expect(loginVi.fieldError(errors.required)).toBeVisible();
      await loginVi.emailInput().fill("abc");
      await next.click();
      await expect(loginVi.fieldError(errors.invalid)).toBeVisible();

      await loginVi.emailInput().fill(USER_EMAIL);
      await next.click();
      await expect(page).toHaveURL(/\/vi\/login\/password\?email=/);
      await expect(passwordVi.heading()).toBeVisible();
      await expect(passwordVi.tryAnotherWayLink()).toBeVisible();
    }
  );

  test(
    "Logging out in one tab ends the session in the other tab after a reload",
    { tag: ["@TC-AUTH-075"] },
    async ({ page, context, loginPage }) => {
      const account = await createAccount({ tag: "auth-ui-twotabs" });
      await loginPage.signIn(account.email, account.password);

      // A second tab of the same browser restores the session from the
      // refresh cookie.
      const second = await context.newPage();
      const secondLogin = new LoginPage(second);
      await second.goto("/");
      await expect(second).toHaveURL(/\/$/);
      await expectSignedInAs(secondLogin, account.email);

      await loginPage.userMenu.signOut();
      await expect(page).toHaveURL(/\/login$/);

      await second.reload();
      await expect(second).toHaveURL(/\/login$/);
      await expect(secondLogin.heading()).toBeVisible();
    }
  );
});

test.describe("as a signed-in user", () => {
  test.use({ role: "user" });

  test(
    "A signed-in user is kept out of the login and sign-up pages",
    { tag: ["@TC-AUTH-058", "@smoke"] },
    async ({ page, loginPage }) => {
      const q = `?email=${encodeURIComponent("someone@e2e.example.com")}`;
      for (const path of [
        "/login",
        `/login/password${q}`,
        `/login/alternative${q}`,
        `/signup/otp${q}`
      ]) {
        await page.goto(path);
        await expect(page, path).toHaveURL(/\/$/);
        await expect(loginPage.heading()).toHaveCount(0);
      }
      await expectSignedInAs(loginPage, USER_EMAIL);

      await page.goto("/vi/login");
      await expect(page).toHaveURL(/\/vi$/);
      await expect(new LoginPage(page, copyVi).heading()).toHaveCount(0);
    }
  );
});
