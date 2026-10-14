import { test, expect } from "@/fixtures";
import { createApiClient } from "@/api";
import { errorOf } from "@/api/response";
import { apiAs } from "@/api/session";
import { serverMessage } from "@/data/copy";
import { UNKNOWN_USER_ID } from "@/data/test-data";
import { createAccount } from "@/utils/accounts";
import { promoteToAdmin } from "@/utils/admin-users";
import { deleteKeys } from "@/utils/redis";

// Admin user mutations share one limiter — rate-limit:admin-user-mutation,
// 20 requests / 15 min keyed by IP + the acting admin's auth id
// (server/src/constants/redis/rate-limit, applied in user.routes.ts after the
// admin guard and BEFORE the id is validated). The actor is a throwaway
// promoted to admin, so admin@test.com is never throttled; every call targets
// an id no account has, so nothing is mutated (each answers 404 until the
// limit trips).

const LIMIT = 20;
const KEYS = "rate-limit:admin-user-mutation:*";

test.use({ keepRateLimits: true });
test.afterEach(async () => {
  await deleteKeys(KEYS);
});

test(
  "Admin mutations are rate limited per admin",
  { tag: "@TC-ADMINUSERS-062" },
  async ({ adminApi }) => {
    const actor = await createAccount({ tag: "adm-rl-actor" });
    await promoteToAdmin(actor.email);
    const actorApi = await apiAs(actor.email, actor.password);
    try {
      await deleteKeys(KEYS);
      const admin = createApiClient(actorApi).adminUsers;
      const en = { "Accept-Language": "en" };
      // lock, unlock and reset draw on the same bucket.
      const calls = [
        () => admin.lock(UNKNOWN_USER_ID, en),
        () => admin.unlock(UNKNOWN_USER_ID, en),
        () => admin.resetPassword(UNKNOWN_USER_ID, en)
      ];
      for (let n = 1; n <= LIMIT; n += 1) {
        const res = await calls[n % calls.length]();
        expect(res.status(), `request #${n}`).toBe(404);
      }

      const over = await admin.lock(UNKNOWN_USER_ID, en);
      expect(over.status()).toBe(429);
      const err = await errorOf(over);
      expect(err.code).toBe("TOO_MANY_REQUESTS");
      expect(err.message).toBe(serverMessage.user.errors.rateLimitExceeded);

      // The bucket is per admin: another admin from the same IP is not
      // throttled by it.
      const other =
        await createApiClient(adminApi).adminUsers.lock(UNKNOWN_USER_ID);
      expect(other.status()).toBe(404);
    } finally {
      await actorApi.dispose();
    }
  }
);
