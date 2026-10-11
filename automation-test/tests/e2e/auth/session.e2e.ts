import { test, expect as baseExpect } from "@fixtures";
import type { Page } from "@playwright/test";
import { createAccount } from "@helpers/accounts";
import { USER_EMAIL } from "@helpers/env";
import { loginViaUi } from "@helpers/auth";

// Session lifetime and page guards — client/src/layouts/{SessionGate,
// AuthGuardLayout,GuestGuardLayout}, client/src/stores/slices/auth.ts
// (tokens in memory only), client/src/components/UserMenu (Log out).

const expect = baseExpect.configure({ timeout: 15_000 });

async function expectSignedInAs(page: Page, email: string) {
  await page.getByRole("button", { name: "Open user menu" }).click();
  await expect(page.getByRole("menu").getByText(email)).toBeVisible();
  await page.keyboard.press("Escape");
}

test.describe("as a guest", () => {
  test.use({ role: "guest" });

  test(
    "the session survives a reload and the access token is never stored in the browser",
    { tag: ["@TC-AUTH-053", "@smoke"] },
    async ({ page, context }) => {
      const account = await createAccount({ tag: "auth-ui-reload" });
      const login = page.waitForResponse(
        (r) => r.url().endsWith("/api/v1/auth/login") && r.status() === 200
      );
      await loginViaUi(page, account.email, account.password);
      const accessToken = (await (await login).json()).data
        .accessToken as string;

      const refresh = page.waitForResponse((r) =>
        r.url().endsWith("/api/v1/auth/token/refresh")
      );
      await page.reload();
      expect((await refresh).status()).toBe(200);
      await expect(page).toHaveURL(/\/$/);
      await expectSignedInAs(page, account.email);

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
    "logging out from the user menu ends the session",
    { tag: ["@TC-AUTH-055"] },
    async ({ page }) => {
      const account = await createAccount({ tag: "auth-ui-logout" });
      await loginViaUi(page, account.email, account.password);

      const logout = page.waitForResponse((r) =>
        r.url().endsWith("/api/v1/auth/logout")
      );
      await page.getByRole("button", { name: "Open user menu" }).click();
      await page.getByRole("menuitem", { name: /Log out/ }).click();
      expect((await logout).status()).toBe(204);
      await expect(page).toHaveURL(/\/login$/);
      await expect(
        page.getByRole("heading", { name: "Welcome" })
      ).toBeVisible();

      // A fresh load cannot restore the session and private pages bounce.
      await page.goto("/profile");
      await expect(page).toHaveURL(/\/login$/);
      await page.getByRole("button", { name: "Open user menu" }).click();
      await expect(page.getByRole("menu").getByText(account.email)).toHaveCount(
        0
      );
    }
  );

  test(
    "a guest opening a private page is sent to login and returned there after signing in",
    { tag: ["@TC-AUTH-059"] },
    async ({ page }) => {
      for (const path of ["/", "/profile", "/login-history"]) {
        await page.goto(path);
        await expect(page, path).toHaveURL(/\/login$/);
      }

      const account = await createAccount({ tag: "auth-ui-deeplink" });
      await page.goto("/profile");
      await expect(page).toHaveURL(/\/login$/);
      await page.getByLabel("Email").fill(account.email);
      await page.getByRole("button", { name: "Continue with email" }).click();
      await page.getByLabel("Enter your password").fill(account.password);
      await page.getByRole("button", { name: "Sign in", exact: true }).click();
      await expect(page).toHaveURL(/\/profile$/);
    }
  );

  test(
    "Vietnamese: guests are sent to /vi/login, which speaks Vietnamese",
    { tag: ["@TC-AUTH-060"] },
    async ({ page }) => {
      await page.goto("/vi/profile");
      await expect(page).toHaveURL(/\/vi\/login$/);
      await expect(
        page.getByRole("heading", { name: "Chào mừng" })
      ).toBeVisible();
      await expect(page.getByText("Tiếp tục để sử dụng dịch vụ")).toBeVisible();

      const next = page.getByRole("button", { name: "Tiếp tục với email" });
      await next.click();
      await expect(page.getByText("Vui lòng nhập email")).toBeVisible();
      await page.getByLabel("Email").fill("abc");
      await next.click();
      await expect(page.getByText("Email không đúng định dạng")).toBeVisible();

      await page.getByLabel("Email").fill(USER_EMAIL);
      await next.click();
      await expect(page).toHaveURL(/\/vi\/login\/password\?email=/);
      await expect(
        page.getByRole("heading", { name: "Nhập mật khẩu để đăng nhập" })
      ).toBeVisible();
      await expect(
        page.getByRole("link", { name: "Thử cách khác" })
      ).toBeVisible();
    }
  );
});

test.describe("as a signed-in user", () => {
  test.use({ role: "user" });

  test(
    "a signed-in user is kept out of the login and sign-up pages",
    { tag: ["@TC-AUTH-058", "@smoke"] },
    async ({ page }) => {
      const q = `?email=${encodeURIComponent("someone@e2e.example.com")}`;
      for (const path of [
        "/login",
        `/login/password${q}`,
        `/login/alternative${q}`,
        `/signup/otp${q}`
      ]) {
        await page.goto(path);
        await expect(page, path).toHaveURL(/\/$/);
        await expect(
          page.getByRole("heading", { name: "Welcome" })
        ).toHaveCount(0);
      }
      await expectSignedInAs(page, USER_EMAIL);

      await page.goto("/vi/login");
      await expect(page).toHaveURL(/\/vi$/);
      await expect(
        page.getByRole("heading", { name: "Chào mừng" })
      ).toHaveCount(0);
    }
  );
});
