import { test, expect } from "@/fixtures";

// Headers every API response carries, set in server/src/app.ts before any
// route: helmet() (security headers), cors({ origin: CORS_ORIGINS,
// credentials: true }) and the requestId middleware
// (server/src/middlewares/common/request-id.middleware.ts). Checked on the API
// origin (`ops` fixture), where nothing in between can add or strip a header.

test.use({ role: "guest" });

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const FOREIGN_ORIGIN = "https://evil.e2e.example.com";

test(
  "Every API response carries the Helmet security headers",
  { tag: "@TC-OPS-013" },
  async ({ ops }) => {
    // A success, an error envelope and the OpenAPI document.
    for (const path of ["/health/all", "/health/unknown", "/api-docs.json"]) {
      const res = await ops.get(path);
      const h = res.headers();
      expect(h["x-content-type-options"], path).toBe("nosniff");
      expect(h["x-frame-options"], path).toBe("SAMEORIGIN");
      expect(h["strict-transport-security"], path).toMatch(/max-age=\d+/);
      expect(h["content-security-policy"], path).toBeTruthy();
      expect(h, path).not.toHaveProperty("x-powered-by");
    }
  }
);

test(
  "Every response carries an X-Request-Id, echoing a caller's id up to 128 characters",
  { tag: "@TC-OPS-014" },
  async ({ ops }) => {
    // No id sent → a fresh UUID per request.
    const first = (await ops.healthAll()).headers()["x-request-id"];
    const second = (await ops.healthAll()).headers()["x-request-id"];
    expect(first).toMatch(UUID);
    expect(second).toMatch(UUID);
    expect(second).not.toBe(first);

    // Boundary: 128 characters is echoed, 129 is replaced.
    const atLimit = "a".repeat(128);
    const echoed = await ops.healthAll({ "X-Request-Id": atLimit });
    expect(echoed.headers()["x-request-id"]).toBe(atLimit);

    const overLimit = "a".repeat(129);
    const replaced = await ops.healthAll({ "X-Request-Id": overLimit });
    expect(replaced.headers()["x-request-id"]).toMatch(UUID);
  }
);

test(
  "CORS answers only the configured origins, with credentials",
  { tag: "@TC-OPS-015" },
  async ({ ops, urls }) => {
    const allowed = ops.allowedOrigins[0];
    test.skip(!allowed, "server CORS_ORIGINS is empty — nothing to allow");
    const path = `${urls.apiPrefix}/auth/login`;

    const ok = await ops.preflight(path, allowed);
    expect(ok.status()).toBe(204);
    expect(ok.headers()["access-control-allow-origin"]).toBe(allowed);
    expect(ok.headers()["access-control-allow-credentials"]).toBe("true");

    const foreign = await ops.preflight(path, FOREIGN_ORIGIN);
    expect(foreign.status()).toBeLessThan(500);
    // Without Allow-Origin the browser blocks the call; the cors package sends
    // Allow-Credentials regardless of the origin, which is harmless on its own.
    expect(foreign.headers()).not.toHaveProperty("access-control-allow-origin");
  }
);
