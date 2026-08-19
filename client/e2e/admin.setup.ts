import { test as setup, expect } from "@playwright/test";
import { ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_AUTH_FILE } from "./helpers/env";

setup("authenticate admin", async ({ page }) => {
  const res = await page.request.post("/api/v1/auth/login", {
    data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD }
  });
  expect(res.ok()).toBeTruthy();

  const state = await page.context().storageState({ path: ADMIN_AUTH_FILE });
  expect(state.cookies.some((c) => c.name === "refreshToken")).toBeTruthy();
});
