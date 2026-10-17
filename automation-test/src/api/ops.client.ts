import {
  request as playwrightRequest,
  type APIRequestContext,
  type APIResponse
} from "@playwright/test";
import { API_URL, CORS_ORIGINS } from "@/config/urls";
import { EMPTY_STATE } from "./base.client";

// Operator endpoints — server/src/loaders/{health,queue}.loader.ts and
// server/src/libs/swagger/swagger.setup.ts.
//
// NOT on the client origin: client/next.config.ts proxies only the API prefix,
// /oauth/* and /.well-known/*, so /health/*, /api-docs* and /admin/queues are
// reachable on the Express origin alone (API_URL: E2E_API_URL → client
// API_SERVER_URL → server APP_PORT). This client therefore owns its own request
// context on that origin and never prepends API_PREFIX — paths are origin-root.
//
// Reached through the `ops` fixture (fixtures/api.fixture.ts), which opens a
// cookie-less context per test and disposes it.

/** A cookie-less request context on the API origin. The caller disposes it. */
export function newOpsContext(
  extraHTTPHeaders?: Record<string, string>
): Promise<APIRequestContext> {
  return playwrightRequest.newContext({
    baseURL: API_URL,
    storageState: EMPTY_STATE,
    extraHTTPHeaders
  });
}

type Headers = Record<string, string>;

export function createOpsClient(request: APIRequestContext) {
  return {
    request,
    /** Origins the server allows cross-origin calls from (server CORS_ORIGINS); may be empty. */
    allowedOrigins: CORS_ORIGINS,

    /** GET any origin-root path on the API, redirects not followed. */
    get(path: string, headers?: Headers): Promise<APIResponse> {
      return request.get(path, { headers, maxRedirects: 0 });
    },

    // ── health ────────────────────────────────────────────────────────────
    /** GET /health/all — MongoDB and Redis together. */
    healthAll(headers?: Headers): Promise<APIResponse> {
      return request.get("/health/all", { headers });
    },
    /** GET /health/mongodb. */
    healthMongo(headers?: Headers): Promise<APIResponse> {
      return request.get("/health/mongodb", { headers });
    },
    /** GET /health/redis. */
    healthRedis(headers?: Headers): Promise<APIResponse> {
      return request.get("/health/redis", { headers });
    },

    // ── Swagger ───────────────────────────────────────────────────────────
    /** GET /api-docs, following the redirect to /api-docs/. */
    swaggerUi(): Promise<APIResponse> {
      return request.get("/api-docs");
    },
    /** GET /api-docs/swagger-ui-init.js — the script the UI page boots from. */
    swaggerInit(): Promise<APIResponse> {
      return request.get("/api-docs/swagger-ui-init.js");
    },
    /** GET /api-docs.json — the OpenAPI document. */
    openApi(): Promise<APIResponse> {
      return request.get("/api-docs.json");
    },

    // ── Bull Board ────────────────────────────────────────────────────────
    /** GET /admin/queues{subpath}, redirects not followed. */
    queues(subpath = ""): Promise<APIResponse> {
      return request.get(`/admin/queues${subpath}`, { maxRedirects: 0 });
    },

    // ── CORS ──────────────────────────────────────────────────────────────
    /** A browser's CORS preflight: OPTIONS `path` from `origin`. */
    preflight(
      path: string,
      origin: string,
      method = "POST"
    ): Promise<APIResponse> {
      return request.fetch(path, {
        method: "OPTIONS",
        headers: {
          Origin: origin,
          "Access-Control-Request-Method": method,
          "Access-Control-Request-Headers": "content-type"
        },
        maxRedirects: 0
      });
    }
  };
}

export type OpsClient = ReturnType<typeof createOpsClient>;
