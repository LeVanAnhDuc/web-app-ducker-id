import { defineConfig, devices } from "@playwright/test";
import { resolveBaseUrl } from "./helpers/env";

// One id per run, inherited by every worker — see RUN_ID in helpers/accounts.ts.
process.env.E2E_RUN_ID ??= Date.now().toString(36);

const BASE_URL = resolveBaseUrl();

// Three projects, and none of them decides a role. Each spec declares the
// session it runs as through the `role` fixture (fixtures/index.ts), so a
// folder can be added or renamed without touching this file.
//
//   setup → logs user and admin in once, writes .auth/{user,admin}.json
//   e2e   → tests/e2e/**/*.e2e.ts in Desktop Chrome
//   api   → tests/api/**/*.api.ts, request context only (no browser)
//   cleanup → after everything: deletes the run's throwaway accounts
//
// One worker, no parallelism: every spec shares one seeded database, and
// several (lock/unlock, change password, notifications) mutate it.
export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: 0,
  outputDir: "./test-results",
  reporter: [
    ["list"],
    ["html", { open: "never", outputFolder: "reports/html" }],
    ["json", { outputFile: "reports/html/results.json" }]
  ],
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure"
  },
  projects: [
    {
      name: "setup",
      testMatch: /setup\/.*\.setup\.ts/,
      teardown: "cleanup"
    },
    { name: "cleanup", testMatch: /setup\/.*\.teardown\.ts/ },
    {
      name: "e2e",
      testMatch: /e2e\/.*\.e2e\.ts/,
      use: { ...devices["Desktop Chrome"] },
      dependencies: ["setup"]
    },
    {
      name: "api",
      testMatch: /api\/.*\.api\.ts/,
      dependencies: ["setup"]
    }
  ]
});
