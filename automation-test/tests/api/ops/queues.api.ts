import { test, expect } from "@fixtures";
import type { APIRequestContext } from "@fixtures";
import { apiOriginContext } from "@helpers/ops";

// Bull Board — server/src/loaders/queue.loader.ts mounts it at /admin/queues
// on the API origin. It is an admin surface and must not be open to guests.

test.use({ role: "guest" });

let api: APIRequestContext;
test.beforeAll(async () => {
  api = await apiOriginContext();
});
test.afterAll(async () => {
  await api.dispose();
});

test("the Bull Board queue dashboard requires an admin", { tag: "@TC-OPS-012" }, async () => {
  // BUG: BUG-001 — /admin/queues and its JSON API answer 200 to anonymous callers and expose email job data, including plaintext OTP codes.
  test.fail();
  for (const path of [
    "/admin/queues",
    "/admin/queues/api/queues?activeQueue=email&status=completed"
  ]) {
    const res = await api.get(path, { maxRedirects: 0 });
    expect([401, 403, 404], `${path} → ${res.status()}`).toContain(res.status());
  }
});
