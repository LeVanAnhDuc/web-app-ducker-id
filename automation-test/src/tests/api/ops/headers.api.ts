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
  "Every response carries a server-minted X-Request-Id, ignoring the caller's",
  { tag: "@TC-OPS-014" },
  async ({ ops }) => {
    // No id sent → a fresh UUID per request.
    const first = (await ops.healthAll()).headers()["x-request-id"];
    const second = (await ops.healthAll()).headers()["x-request-id"];
    expect(first).toMatch(UUID);
    expect(second).toMatch(UUID);
    expect(second).not.toBe(first);

    // A caller's id is never echoed — the server always mints its own.
    const callerId = "caller-chosen-id";
    const sent = await ops.healthAll({ "X-Request-Id": callerId });
    const minted = sent.headers()["x-request-id"];
    expect(minted).toMatch(UUID);
    expect(minted).not.toBe(callerId);
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
