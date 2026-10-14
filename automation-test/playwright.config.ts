import { defineConfig, devices } from "@playwright/test";
import { resolveEnv } from "./src/config/env";
import { buildGrepInvert } from "./src/config/env-guard";
import { BASE_URL } from "./src/config/urls";

// One id per run, inherited by every worker — see RUN_ID in src/stores/accounts.ts.
process.env.E2E_RUN_ID ??= Date.now().toString(36);

const env = resolveEnv(process.env.ENV);
const includeFull = process.env.FULL === "1";

// None of the projects decides a role. Each spec declares the session it runs
// as through the `role` fixture (src/fixtures/sessions.fixture.ts), so a
// folder can be added or renamed without touching this file.
//
//   session  → logs user and admin in once, writes .auth/{user,admin}.json
//   app      → e2e/**/*.e2e.ts (Desktop Chrome) + api/**/*.api.ts (request
//              only — no browser is launched unless a test asks for a page)
//              + seed.spec.ts. Variants (viewport, locale…) are extra
//              projects named "app-<variant>"; package.json runs --project=app*
//   teardown → after everything: deletes the run's throwaway accounts
//   unit    → src/**/*.test.ts (config, utils), no app needed
//
// One worker, no parallelism: every spec shares one seeded database, and
// several (lock/unlock, change password, notifications) mutate it.
export default defineConfig({
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: 0,
  outputDir: "./test-results",
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
    video: "retain-on-failure",
    screenshot: "only-on-failure"
  },
  // "app" first: the playwright-test MCP server (agents) treats the first project as primary.
  projects: [
    {
      name: "app",
      testDir: "./src/tests",
      testMatch: [/e2e\/.*\.e2e\.ts$/, /api\/.*\.api\.ts$/, /seed\.spec\.ts$/],
      grepInvert: buildGrepInvert(env, includeFull),
      use: { ...devices["Desktop Chrome"], baseURL: BASE_URL },
      dependencies: ["session"]
    },
    {
      name: "session",
      testDir: "./src/tests/setup",
      testMatch: /.*\.setup\.ts$/,
      teardown: "teardown"
    },
    {
      name: "teardown",
      testDir: "./src/tests/setup",
      testMatch: /.*\.teardown\.ts$/
    },
    { name: "unit", testDir: "./src", testMatch: /.*\.test\.ts$/ }
  ]
});
