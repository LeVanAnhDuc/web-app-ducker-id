import { test, expect } from "@/fixtures";
import { createApiClient } from "@/api";
import { errorOf } from "@/api/response";
import { apiAs } from "@/api/session";
import { serverMessage } from "@/data/copy";
import { UNKNOWN_CATEGORY_ID } from "@/data/test-data";
import { createAccount } from "@/utils/accounts";
import { promoteToAdmin } from "@/utils/admin-users";
import { deleteKeys } from "@/utils/redis";

// Category mutations share one limiter — rate-limit:category-mutation,
// 120 requests / 60 s keyed by IP + the acting admin's auth id
// (server/src/constants/redis/rate-limit; design DR-21), applied in
// category.routes.ts after the admin guard and BEFORE the id and body are
// validated. The actor is a throwaway promoted to admin, so admin@test.com is
// never throttled; every call targets an id no category has, so nothing is
// mutated (each answers 404 until the limit trips).

const LIMIT = 120;
const KEYS = "rate-limit:category-mutation:*";
const EN = { "Accept-Language": "en" };

test.use({ keepRateLimits: true });
test.afterEach(async () => {
  await deleteKeys(KEYS);
});

test(
  "Category changes are rate limited per admin",
  { tag: "@TC-ADMINCATEGORIES-077" },
  async ({ adminApi }) => {
    // 121 sequential requests, each a round trip to the server's cloud Redis
    // (~0.2–0.6 s): slow by nature, not by waiting.
    test.slow();
    const actor = await createAccount({ tag: "cat-rl-actor" });
    await promoteToAdmin(actor.email);
    const actorApi = await apiAs(actor.email, actor.password);
    try {
      await deleteKeys(KEYS);
      const categories = createApiClient(actorApi).adminCategories;
      // update, move and delete draw on the same bucket.
      const calls = [
        () => categories.update(UNKNOWN_CATEGORY_ID, { name: { vi: "x" } }, EN),
        () => categories.move(UNKNOWN_CATEGORY_ID, "up", EN),
        () => categories.remove(UNKNOWN_CATEGORY_ID, { reassignments: [] }, EN)
      ];
      // The window is 60 s and each request is a round trip to the cloud Redis,
      // so 120 sequential calls can outlast the window and reset the count.
      // Send them in parallel batches so all of them land in one window.
      const BATCH = 20;
      for (let start = 1; start <= LIMIT; start += BATCH) {
        const ns = Array.from(
          { length: Math.min(BATCH, LIMIT - start + 1) },
          (_, i) => start + i
        );
        const statuses = await Promise.all(
          ns.map(async (n) => (await calls[n % calls.length]()).status())
        );
        statuses.forEach((status, i) =>
          expect(status, `request #${ns[i]}`).toBe(404)
        );
      }

      const over = await categories.move(UNKNOWN_CATEGORY_ID, "up", EN);
      expect(over.status()).toBe(429);
      const err = await errorOf(over);
      expect(err.code).toBe("TOO_MANY_REQUESTS");
      expect(err.message).toBe(serverMessage.category.errors.rateLimitExceeded);

      // Reads are not limited.
      expect((await categories.list()).status()).toBe(200);

      // The bucket is per admin: another admin from the same IP is not
      // throttled by it.
      const other = await createApiClient(adminApi).adminCategories.move(
        UNKNOWN_CATEGORY_ID,
        "up"
      );
      expect(other.status()).toBe(404);
    } finally {
      await actorApi.dispose();
    }
  }
);
