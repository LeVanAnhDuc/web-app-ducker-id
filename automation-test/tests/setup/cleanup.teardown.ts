import { test as teardown } from "@playwright/test";
import { closeMongo, deleteThrowawayAccounts, RUN_ID } from "@helpers/accounts";
import { clearRateLimits, closeRedis } from "@helpers/redis";

// Runs once after every project that depends on `setup` has finished.
// Removes the …@e2e.example.com accounts THIS run created, so list counts and
// "N users found" assertions in the next run see the seed data only.
teardown("remove throwaway accounts", async () => {
  const removed = await deleteThrowawayAccounts({ run: RUN_ID });
  await clearRateLimits();
  console.log(`[cleanup] removed ${removed} throwaway account(s)`);
  await closeMongo();
  await closeRedis();
});
