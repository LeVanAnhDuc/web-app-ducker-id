// types
import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/src", "<rootDir>/test"],
  testMatch: [
    "<rootDir>/src/**/*.spec.ts",
    "<rootDir>/test/integration/**/*.integration-spec.ts",
    "<rootDir>/test/e2e/**/*.e2e-spec.ts"
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
