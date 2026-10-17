import { test as setup, expect } from "@playwright/test";
import { ADMIN_EMAIL, ADMIN_PASSWORD } from "@/config/accounts";
import { ADMIN_AUTH_FILE } from "@/config/auth-state";
import { clearEmailState } from "@/utils/redis";

setup("authenticate admin", async ({ page }) => {
  await clearEmailState(ADMIN_EMAIL);

  const res = await page.request.post("/api/v1/auth/login", {
    data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD }
  });
  expect(res.ok(), `admin login → ${res.status()}`).toBeTruthy();

  const state = await page.context().storageState({ path: ADMIN_AUTH_FILE });
  expect(state.cookies.some((c) => c.name === "refreshToken")).toBeTruthy();
});
