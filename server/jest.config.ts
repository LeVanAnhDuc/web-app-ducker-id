// types
import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/src", "<rootDir>/test"],
  /**
   * Relative patterns, not `<rootDir>/…`. Jest escapes regex-special
   * characters when it expands `<rootDir>` into a glob, so a checkout whose
   * path contains a dot — `.worktrees/<branch>/server` — comes out as
   * `…\.worktrees/…` and micromatch then matches nothing, failing with
   * "No tests found". `roots` already scopes the search to src/ and test/.
   */
  testMatch: [
    "**/src/**/*.spec.ts",
    "**/test/integration/**/*.integration-spec.ts",
    "**/test/e2e/**/*.e2e-spec.ts"
  ],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "^@test/(.*)$": "<rootDir>/test/$1"
  },
  transform: {
    "^.+\\.ts$": [
      "ts-jest",
      {
        isolatedModules: true,
        diagnostics: {
          ignoreCodes: [151002]
        }
      }
    ]
  },
  setupFilesAfterEnv: ["<rootDir>/test/setup.ts"],
  resetMocks: true
};

export default config;
