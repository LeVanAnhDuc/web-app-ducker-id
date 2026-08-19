import { defineConfig, devices } from "@playwright/test";
import { resolveBaseUrl } from "./e2e/helpers/env";

const BASE_URL = resolveBaseUrl();

export default defineConfig({
  testDir: "./e2e",
  testMatch: /.*\.e2e\.ts/,
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure"
  },
  projects: [
    { name: "setup", testMatch: /auth\.setup\.ts/ },
    { name: "admin-setup", testMatch: /admin\.setup\.ts/ },
    {
      name: "chromium",
      // Regular-user project. Ignore only the admin-only suites (they run
      // under the `admin` project). `admin-authz/` is NOT in this list, so its
      // AuthZ denial tests run here as a logged-in NON-admin — exactly what they
      // need to verify.
      testIgnore:
        /(?:admin-apps|admin-users-list|admin-users-lock|admin-users-reset|admin-login-history|admin-entitlements|contact)\//,
      use: {
        ...devices["Desktop Chrome"],
        storageState: "e2e/.auth/user.json"
      },
      dependencies: ["setup"]
    },
    {
      name: "admin",
      // All admin-only suites run under the admin storageState.
      testMatch:
        /(?:admin-apps|admin-users-list|admin-users-lock|admin-users-reset|admin-login-history|admin-entitlements|contact)\/.*\.e2e\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        storageState: "e2e/.auth/admin.json"
      },
      dependencies: ["admin-setup"]
    }
  ]
});
