import { test as setup, expect } from "@playwright/test";
import { USER_EMAIL, USER_PASSWORD, USER_AUTH_FILE } from "./helpers/env";

setup("authenticate", async ({ page }) => {
  const res = await page.request.post("/api/v1/auth/login", {
    data: { email: USER_EMAIL, password: USER_PASSWORD }
  });
  expect(res.ok()).toBeTruthy();

  const state = await page.context().storageState({ path: USER_AUTH_FILE });
  // Fail loudly here if the refresh cookie wasn't captured — otherwise every
  // test would 401 after SessionGate's /token/refresh, far from the root cause.
  expect(state.cookies.some((c) => c.name === "refreshToken")).toBeTruthy();
});
