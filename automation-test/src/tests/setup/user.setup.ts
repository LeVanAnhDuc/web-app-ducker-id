import { test as setup, expect } from "@playwright/test";
import { USER_EMAIL, USER_PASSWORD } from "@/config/accounts";
import { USER_AUTH_FILE } from "@/config/auth-state";
import {
  assertSeededDatabase,
  deleteThrowawayAccounts
} from "@/utils/accounts";
import { clearEmailState, clearRateLimits } from "@/utils/redis";

setup("authenticate user", async ({ page }) => {
  // Stop before touching anything if this is not a seeded test database.
  const categories = await page.request.get("/api/v1/apps/categories");
  expect(
    categories.ok(),
    `GET /apps/categories → ${categories.status()}`
  ).toBeTruthy();
  const { data } = (await categories.json()) as { data: { _id: string }[] };
  await assertSeededDatabase(data.map((c) => c._id));

  // A previous run that died mid-lockout test must not lock the whole suite out.
  await clearRateLimits();
  await clearEmailState(USER_EMAIL);
  // …and leftovers of a run that never reached its teardown — only old
  // ones: a run going on right now still needs its accounts.
  await deleteThrowawayAccounts({ olderThanMs: 3 * 60 * 60 * 1000 });

  const res = await page.request.post("/api/v1/auth/login", {
    data: { email: USER_EMAIL, password: USER_PASSWORD }
  });
  expect(res.ok(), `user login → ${res.status()}`).toBeTruthy();

  const state = await page.context().storageState({ path: USER_AUTH_FILE });
  // Fail loudly here if the refresh cookie wasn't captured — otherwise every
  // test would 401 after SessionGate's /token/refresh, far from the root cause.
  expect(state.cookies.some((c) => c.name === "refreshToken")).toBeTruthy();
});
