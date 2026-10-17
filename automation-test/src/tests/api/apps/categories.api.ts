import { test, expect } from "@/fixtures";
import { createApiClient } from "@/api";
import { errorOf } from "@/api/response";
import type { CatalogCategory } from "@/api/category.client";
import { serverMessage } from "@/data/copy";
import { clearIpLimit } from "@/utils/auth";

// GET /apps/categories — the PUBLIC category list behind the /apps filter
// (createCategoryUserRoutes): per-IP rate limit (100 / 5 min) →
// optionalAuthGuard → `Cache-Control: public, max-age=60`. No header passes
// as anonymous; a header with a bad token is still rejected. The apps LIST
// (GET /apps) needs a session — tests/api/apps/apps.api.ts.
// Test cases: test-cases/apps.md (TC-APPS-038 … 040, 065, 066).
//
// Read-only: every test only performs GET requests.

test(
  "Public categories are identical for anon, user and admin",
  { tag: "@TC-APPS-038" },
  async ({ guestApi, userApi, adminApi }) => {
    const [anonRes, userRes, adminRes] = await Promise.all(
      [guestApi, userApi, adminApi].map((ctx) =>
        createApiClient(ctx).categories.listPublic()
      )
    );

    expect(anonRes.status()).toBe(200);
    expect(userRes.status()).toBe(200);
    expect(adminRes.status()).toBe(200);

    const [anonBody, userBody, adminBody] = await Promise.all([
      anonRes.json(),
      userRes.json(),
      adminRes.json()
    ]);

    expect(anonBody.data).toEqual(userBody.data);
    expect(userBody.data).toEqual(adminBody.data);
  }
);

// Behaviour cliff — a present-but-invalid Bearer is still rejected
// (optionalAuthGuard delegates to authGuard when a header is present), while
// no header passes through anonymous (200). The app maps an invalid JWT to
// HTTP 403 (code JWT_INVALID), not 401 — global auth behaviour. The point is
// that a bad token does NOT silently degrade to anonymous.
test(
  "A bad Bearer on the public endpoint is rejected, no header is not",
  { tag: "@TC-APPS-039" },
  async ({ guestApi }) => {
    const categories = createApiClient(guestApi).categories;
    const noHeaderRes = await categories.listPublic({ Authorization: "" });
    expect(noHeaderRes.status()).toBe(200);

    const garbageRes = await categories.listPublic({
      Authorization: "Bearer garbage"
    });
    expect(garbageRes.status()).toBe(403);
  }
);

// category-management (DR-19) cut the cache from 300 s to 60 s so a renamed
// or deleted category leaves the filter fast.
test(
  "Categories are cacheable for 60 s",
  { tag: "@TC-APPS-040" },
  async ({ userApi }) => {
    const res = await createApiClient(userApi).categories.listPublic();
    expect(res.status()).toBe(200);
    expect(res.headers()["cache-control"]).toBe("public, max-age=60");
  }
);

test(
  "Public categories expose only id, slug and bilingual name",
  { tag: "@TC-APPS-065" },
  async ({ guestApi }) => {
    const res = await createApiClient(guestApi).categories.listPublic();
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Object.keys(body).sort()).toEqual(
      ["data", "message", "path", "timestamp"].sort()
    );
    const categories = body.data as CatalogCategory[];
    expect(categories.length).toBeGreaterThan(0);
    for (const category of categories) {
      // No app counts, order index, timestamps or anything about who may
      // open which app — the list is identical for every caller.
      expect(Object.keys(category).sort()).toEqual(["_id", "name", "slug"]);
      expect(Object.keys(category.name).sort()).toEqual(["en", "vi"]);
    }
  }
);

test.describe("rate limit", () => {
  test.use({ keepRateLimits: true });

  test(
    "The public category list is rate-limited per IP",
    { tag: "@TC-APPS-066" },
    async ({ newApi }) => {
      // Only this limiter's counters; every other test clears them all.
      await clearIpLimit("categories");
      const categories = (await newApi()).categories;

      // RATE_LIMIT_CONFIG.CATEGORIES.PER_IP: 100 requests / 300 s.
      for (let i = 1; i <= 100; i += 1) {
        const ok = await categories.listPublic();
        expect(ok.status(), `request #${i}`).toBe(200);
      }

      const limited = await categories.listPublic();
      expect(limited.status()).toBe(429);
      const error = await errorOf(limited);
      expect(error.code).toBe("TOO_MANY_REQUESTS");
      expect(error.message).toBe(
        serverMessage.category.errors.rateLimitExceeded
      );
    }
  );
});
