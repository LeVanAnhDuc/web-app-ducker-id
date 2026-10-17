import { test, expect } from "@/fixtures";
import { createApiClient } from "@/api";
import { errorOf } from "@/api/response";
import { serverMessage } from "@/data/copy";
import { deleteKeys } from "@/utils/redis";

// PATCH /admin/entitlements rate limit — server/src/constants/redis/
// rate-limit/index.ts ENTITLEMENTS.MUTATION.PER_IP_USER: 60 requests per
// 60 s, keyed by IP + the admin's auth id, applied BEFORE validation
// (REQ-ADMINENTITLEMENTS-07). Test case: TC-ADMINENTITLEMENTS-047.
//
// Every request carries an invalid body (`changes: []` → 400), so the limit
// is reached without writing an override or notifying anyone (Q7). The
// counters are deleted before and after, so a 429 cannot leak into the next
// admin spec.

test.use({ keepRateLimits: true });

const COUNTERS = "rate-limit:entitlement-mutation:*";
const LIMIT = 60;

test.beforeEach(async () => {
  await deleteKeys(COUNTERS);
});
test.afterEach(async () => {
  await deleteKeys(COUNTERS);
});

test(
  "Entitlement saves are limited to 60 a minute",
  { tag: "@TC-ADMINENTITLEMENTS-047" },
  async ({ adminApi }) => {
    const api = createApiClient(adminApi).adminEntitlements;
    const EN = { "Accept-Language": "en" };

    // The window is 60 s and every request is a round trip to the cloud Redis,
    // so sequential calls can outlast the window and reset the count. Send
    // them in parallel batches so all of them land in one window.
    const BATCH = 20;
    for (let start = 1; start <= LIMIT; start += BATCH) {
      const ns = Array.from(
        { length: Math.min(BATCH, LIMIT - start + 1) },
        (_, i) => start + i
      );
      const statuses = await Promise.all(
        ns.map(async () => (await api.update([], EN)).status())
      );
      statuses.forEach((status, i) =>
        expect(status, `request #${ns[i]}`).toBe(400)
      );
    }

    const over = await api.update([], EN);
    expect(over.status()).toBe(429);
    expect(await errorOf(over)).toMatchObject({
      code: "TOO_MANY_REQUESTS",
      message: serverMessage.entitlement.errors.rateLimitExceeded
    });
  }
);
