import { expect, mergeTests } from "@playwright/test";
import { test as accountsTest } from "./accounts.fixture";
import { test as apiTest } from "./api.fixture";
import { test as pagesTest } from "./pages.fixture";

// The only `test` / `expect` specs import. Each fixture file owns one concern:
//   core      env (worker), urls, rate-limit reset (auto) + keepRateLimits
//   sessions  role → storageState; userPage / adminPage / guestPage; userApi / adminApi / guestApi
//   accounts  account (credentials of the declared role)
//   api       api, newApi
//   pages     page objects
// A new concern gets its own *.fixture.ts and joins mergeTests here.
export const test = mergeTests(accountsTest, apiTest, pagesTest);
export { expect };
