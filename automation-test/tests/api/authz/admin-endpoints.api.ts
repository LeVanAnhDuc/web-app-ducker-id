import { test, expect } from "@fixtures";
import { request } from "@playwright/test";
import type { APIRequestContext } from "@playwright/test";
import { API_URL } from "@helpers/env";

// Every `/api/v1/admin/*` endpoint, swept as guest, user and admin.
// Test cases: test-cases/authz.md (TC-AUTHZ-007 … TC-AUTHZ-011).
//
// [DT] role × endpoint. The guard order on every admin router is
// `authGuard → adminGuard → params/body validation`, so a placeholder id and
// an empty body are enough: a guest is stopped with 401 and a user with 403
// before the id or body is ever looked at. The admin row is the control —
// it must get past both guards (anything but 401/403).
//
// The list comes from the route files under server/src/modules/*/*.routes.ts
// (web-app, category, user, login-history, contact-admin). A new admin route
// belongs here too.

const ID = "aaaaaaaaaaaaaaaaaaaaaaaa";

type Method = "GET" | "POST" | "PATCH" | "DELETE";

const ADMIN_ENDPOINTS: readonly [Method, string][] = [
  ["GET", "/api/v1/admin/users"],
  ["PATCH", `/api/v1/admin/users/${ID}/lock`],
  ["PATCH", `/api/v1/admin/users/${ID}/unlock`],
  ["POST", `/api/v1/admin/users/${ID}/reset-password`],
  ["GET", "/api/v1/admin/login-history"],
  ["GET", `/api/v1/admin/login-history/${ID}`],
  ["GET", "/api/v1/admin/contacts"],
  ["GET", `/api/v1/admin/contacts/${ID}`],
  ["PATCH", `/api/v1/admin/contacts/${ID}/status`],
  ["GET", "/api/v1/admin/apps"],
  ["POST", "/api/v1/admin/apps"],
  ["PATCH", `/api/v1/admin/apps/${ID}`],
  ["GET", "/api/v1/admin/categories"],
  ["POST", "/api/v1/admin/categories"],
  ["PATCH", `/api/v1/admin/categories/${ID}`],
  ["POST", `/api/v1/admin/categories/${ID}/move`],
  ["GET", `/api/v1/admin/categories/${ID}/delete-impact`],
  ["DELETE", `/api/v1/admin/categories/${ID}`]
];

/**
 * Sends a call that cannot change anything even if it got through: the id
 * matches no document and the body is empty, so validation rejects it.
 */
const call = (
  api: APIRequestContext,
  method: Method,
  path: string,
  headers: Record<string, string> = {}
) =>
  api.fetch(path, {
    method,
    headers,
    data: method === "GET" ? undefined : {}
  });

type ErrorBody = {
  code?: string;
  message?: string;
  timestamp?: string;
  path?: string;
};

test.describe("Admin endpoints — guest", () => {
  test(
    "every admin endpoint answers a guest with 401 AUTH_MISSING_TOKEN",
    { tag: ["@TC-AUTHZ-007", "@smoke"] },
    async ({ guestApi }) => {
      for (const [method, path] of ADMIN_ENDPOINTS) {
        const res = await call(guestApi, method, path);
        expect(res.status(), `${method} ${path}`).toBe(401);
        expect(
          ((await res.json()) as ErrorBody).code,
          `${method} ${path}`
        ).toBe("AUTH_MISSING_TOKEN");
      }
    }
  );

  test(
    "a forged, malformed or non-Bearer token is refused",
    { tag: "@TC-AUTHZ-009" },
    async ({ guestApi }) => {
      // No usable Bearer → 401 AUTH_MISSING_TOKEN. A Bearer that fails
      // verification → 403 JWT_INVALID: verifyToken (modules/token/helpers)
      // throws ForbiddenError, which the client relies on to tell "refresh
      // and retry" from "signed out".
      const cases: [string, Record<string, string>, number, string][] = [
        [
          "empty Bearer",
          { Authorization: "Bearer " },
          401,
          "AUTH_MISSING_TOKEN"
        ],
        [
          "Basic scheme",
          { Authorization: "Basic YWRtaW46QWRtaW5AMTIz" },
          401,
          "AUTH_MISSING_TOKEN"
        ],
        [
          "garbage Bearer",
          { Authorization: "Bearer not-a-jwt" },
          403,
          "JWT_INVALID"
        ],
        [
          "unsigned alg:none JWT claiming admin",
          {
            Authorization:
              "Bearer eyJhbGciOiJub25lIn0.eyJzdWIiOiJ4Iiwicm9sZXMiOiJhZG1pbiJ9."
          },
          403,
          "JWT_INVALID"
        ]
      ];
      for (const [label, headers, status, code] of cases) {
        const res = await call(guestApi, "GET", "/api/v1/admin/users", headers);
        expect(res.status(), label).toBe(status);
        expect(((await res.json()) as ErrorBody).code, label).toBe(code);
      }
    }
  );
});

test.describe("Admin endpoints — regular user", () => {
  test(
    "every admin endpoint answers a regular user with 403 AUTH_ADMIN_ONLY",
    { tag: ["@TC-AUTHZ-008", "@smoke"] },
    async ({ userApi }) => {
      for (const [method, path] of ADMIN_ENDPOINTS) {
        const res = await call(userApi, method, path);
        expect(res.status(), `${method} ${path}`).toBe(403);
        expect(
          ((await res.json()) as ErrorBody).code,
          `${method} ${path}`
        ).toBe("AUTH_ADMIN_ONLY");
      }
    }
  );

  test(
    "the denial uses the error envelope and is translated per request",
    { tag: "@TC-AUTHZ-011" },
    async ({ userApi }) => {
      const en = await userApi.get("/api/v1/admin/apps", {
        headers: { "Accept-Language": "en" }
      });
      const enBody = (await en.json()) as ErrorBody;
      expect(Object.keys(enBody).sort()).toEqual(
        expect.arrayContaining(["code", "message", "path", "timestamp"])
      );
      expect(enBody.path).toBe("/api/v1/admin/apps");
      expect(enBody.message).toBe("Forbidden access");

      const vi = await userApi.get("/api/v1/admin/apps", {
        headers: { "Accept-Language": "vi" }
      });
      expect(((await vi.json()) as ErrorBody).message).toBe(
        "Truy cập bị từ chối"
      );
    }
  );
});

test.describe("Admin endpoints — admin (control row)", () => {
  test(
    "an admin gets past both guards on every admin endpoint",
    { tag: "@TC-AUTHZ-010" },
    async ({ adminApi }) => {
      for (const [method, path] of ADMIN_ENDPOINTS) {
        const res = await call(adminApi, method, path);
        // 200 for lists, 400 / 404 for the placeholder id or empty body —
        // never an authentication or authorisation failure.
        expect([401, 403], `${method} ${path}`).not.toContain(res.status());
        expect(res.status(), `${method} ${path}`).toBeLessThan(500);
      }
    }
  );
});

test.describe("Admin surfaces outside /api/v1", () => {
  test(
    "the Bull Board queue dashboard refuses a guest",
    { tag: "@TC-AUTHZ-012" },
    async () => {
      // BUG: BUG-001 — /admin/queues (Bull Board) is mounted in server/src/loaders/queue.loader.ts with no guard — a guest gets 200.
      test.fail();
      // Served only on the API origin; the client does not proxy it.
      const api = await request.newContext({
        baseURL: API_URL,
        storageState: { cookies: [], origins: [] }
      });
      try {
        const res = await api.get("/admin/queues", { maxRedirects: 0 });
        expect([401, 403, 302]).toContain(res.status());
      } finally {
        await api.dispose();
      }
    }
  );
});
