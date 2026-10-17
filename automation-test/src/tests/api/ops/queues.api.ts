import { test, expect } from "@/fixtures";

// Bull Board — server/src/loaders/queue.loader.ts mounts it at /admin/queues
// on the API origin (reached through the `ops` fixture). It is an admin
// surface and must not be open to guests. TC-AUTHZ-012 proves the page alone;
// this case adds the JSON API that leaks job payloads.

test.use({ role: "guest" });

test(
  "The Bull Board queue dashboard requires an admin",
  { tag: ["@TC-OPS-012", "@smoke"] },
  async ({ ops }) => {
    // /admin/queues and its JSON API answer 200 to anonymous callers and expose email job data, including plaintext OTP codes.
    // BUG: defects/authz.md#bug-authz-01
    test.fail();
    for (const subpath of [
      "",
      "/api/queues?activeQueue=email&status=completed"
    ]) {
      const res = await ops.queues(subpath);
      expect(
        [401, 403, 404],
        `/admin/queues${subpath} → ${res.status()}`
      ).toContain(res.status());
    }
  }
);
