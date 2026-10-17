import { test as base } from "@playwright/test";
import { resolveEnv, type EnvName } from "@/config/env";
import { getUrls, type SiteUrls } from "@/config/urls";
import { clearRateLimits } from "@/utils/redis";

// Fixtures every other fixture file builds on: the environment, its URLs, and
// the rate-limit reset every test gets.
export const test = base.extend<
  {
    urls: SiteUrls;
    /** Set true in a rate-limit test so the counters are NOT cleared first. */
    keepRateLimits: boolean;
    _resetRateLimits: void;
  },
  { env: EnvName }
>({
  env: [
    async ({}, use) => use(resolveEnv(process.env.ENV)),
    { scope: "worker" }
  ],
  urls: async ({ env }, use) => use(getUrls(env)),
  keepRateLimits: [false, { option: true }],
  _resetRateLimits: [
    async ({ keepRateLimits }, use) => {
      if (!keepRateLimits) await clearRateLimits();
      await use();
    },
    { auto: true }
  ]
});
