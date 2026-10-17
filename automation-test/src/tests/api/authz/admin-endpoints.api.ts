import { test, expect } from "@/fixtures";
import type { APIResponse } from "@playwright/test";
import { createApiClient, type ApiClient } from "@/api";
import { errorOf } from "@/api/response";
import { API_PREFIX } from "@/config/urls";
import { serverMessage, serverMessageVi } from "@/data/copy";
import { UNKNOWN_USER_ID } from "@/data/test-data";

// Every admin endpoint, swept as guest, user and admin.
// Test cases: test-cases/authz.md (TC-AUTHZ-002 … 005, 007, 008, 010 … 012).
//
// [DT] role × endpoint. The guard order on every admin router is
// `authGuard → adminGuard → params/body validation`, so a placeholder id and
// an empty body are enough: a guest is stopped with 401 and a user with 403
// before the id or body is ever looked at. The admin row is the control —
// it must get past both guards (anything but 401/403).
//
// The list comes from the route files under server/src/modules/*/*.routes.ts
// (user, login-history, contact-admin, web-app, category, entitlement), all
// mounted by server/src/loaders/modules.loader.ts. A new admin route belongs
// here too. Paths are relative to the client's API prefix (api.call).

/** An ObjectId no document has — the guards run before any lookup. */
const ID = UNKNOWN_USER_ID;

type Method = "get" | "post" | "patch" | "delete";

/**
 * A row of the sweep: method + path, sent through `api.call` — or, for a
 * resource whose client already has the method, that method as the third
 * element (sent instead, with the same body: none for a GET, `{}` otherwise).
 */
type Endpoint = readonly [
  Method,
  string,
  ((api: ApiClient) => Promise<APIResponse>)?
];

const ADMIN_ENDPOINTS: readonly Endpoint[] = [
  ["get", "/admin/users"],
  ["patch", `/admin/users/${ID}/lock`],
  ["patch", `/admin/users/${ID}/unlock`],
  ["post", `/admin/users/${ID}/reset-password`],
  ["get", "/admin/login-history"],
  ["get", `/admin/login-history/${ID}`],
  ["get", "/admin/contacts", (api) => api.contact.adminList()],
  ["get", `/admin/contacts/${ID}`, (api) => api.contact.adminGet(ID)],
  [
    "patch",
    `/admin/contacts/${ID}/status`,
    (api) => api.contact.adminUpdateStatus(ID, {})
  ],
  ["get", "/admin/apps"],
  ["post", "/admin/apps"],
  ["patch", `/admin/apps/${ID}`],
  ["get", "/admin/categories"],
  ["post", "/admin/categories"],
  ["patch", `/admin/categories/${ID}`],
  ["post", `/admin/categories/${ID}/move`],
  ["get", `/admin/categories/${ID}/delete-impact`],
  ["delete", `/admin/categories/${ID}`],
  ["get", "/admin/entitlements"],
  ["patch", "/admin/entitlements"]
];

/**
 * Sends a call that cannot change anything even if it got through: the id
 * matches no document and the body is empty, so validation rejects it.
 */
const call = (
  api: ApiClient,
  method: Method,
  path: string,
  send?: (api: ApiClient) => Promise<APIResponse>
) =>
  send
    ? send(api)
    : api.call(method, path, { data: method === "get" ? undefined : {} });

test(
  "Every admin endpoint answers a guest with 401",
  { tag: ["@TC-AUTHZ-007", "@smoke"] },
  async ({ guestApi }) => {
    const api = createApiClient(guestApi);
    for (const [method, path, send] of ADMIN_ENDPOINTS) {
      const res = await call(api, method, path, send);
      expect(res.status(), `${method} ${path}`).toBe(401);
      expect((await errorOf(res)).code, `${method} ${path}`).toBe(
        "AUTH_MISSING_TOKEN"
      );
    }
  }
);

test(
  "Every admin endpoint answers a regular user with 403",
  { tag: ["@TC-AUTHZ-008", "@smoke"] },
  async ({ userApi }) => {
    const api = createApiClient(userApi);
    for (const [method, path, send] of ADMIN_ENDPOINTS) {
      const res = await call(api, method, path, send);
      expect(res.status(), `${method} ${path}`).toBe(403);
      expect((await errorOf(res)).code, `${method} ${path}`).toBe(
        "AUTH_ADMIN_ONLY"
      );
    }
  }
);

test(
  "The denial uses the error envelope and is translated",
  { tag: "@TC-AUTHZ-011" },
  async ({ userApi }) => {
    const api = createApiClient(userApi);
    const en = await errorOf(
      await api.adminApps.list({}, { "Accept-Language": "en" })
    );
    expect(Object.keys(en).sort()).toEqual(
      expect.arrayContaining(["code", "message", "path", "timestamp"])
    );
    expect(en.path).toBe(`${API_PREFIX}/admin/apps`);
    expect(en.message).toBe(serverMessage.common.errors.forbidden);

    const vi = await errorOf(
      await api.adminApps.list({}, { "Accept-Language": "vi" })
    );
    expect(vi.message).toBe(serverMessageVi.common.errors.forbidden);
  }
);

test(
  "An admin gets past both guards on every admin endpoint",
  { tag: "@TC-AUTHZ-010" },
  async ({ adminApi }) => {
    const api = createApiClient(adminApi);
    for (const [method, path, send] of ADMIN_ENDPOINTS) {
      const res = await call(api, method, path, send);
      // 200 for lists, 400 / 404 for the placeholder id or empty body —
      // never an authentication or authorisation failure.
      expect([401, 403], `${method} ${path}`).not.toContain(res.status());
      expect(res.status(), `${method} ${path}`).toBeLessThan(500);
    }
  }
);

test(
  "The Bull Board queue dashboard requires an admin",
  { tag: ["@TC-AUTHZ-012", "@smoke"] },
  async ({ ops }) => {
    // /admin/queues (Bull Board) sits behind adminGuard (fixed BUG-AUTHZ-01).
    // Served only on the API origin (the `ops` client); the client does not proxy it.
    const res = await ops.queues();
    expect([401, 403, 302]).toContain(res.status());
  }
);

// ---------------------------------------------------------------------------
// Lock / unlock / reset-password — named regressions for the most dangerous
// admin mutations (decisions Q7). adminGuard rejects a non-admin BEFORE the
// service's self-lock / self-reset check runs, so a non-admin targeting ANY id
// gets 403 AUTH_ADMIN_ONLY — never ADMIN_CANNOT_LOCK_SELF or 404. The
// admin-authenticated contract lives in the admin-users module.
// ---------------------------------------------------------------------------

const expectCode = async (
  res: APIResponse,
  status: number,
  code: string
): Promise<void> => {
  expect(res.status()).toBe(status);
  expect((await errorOf(res)).code).toBe(code);
};

test.describe("A non-admin cannot lock, unlock or reset an account", () => {
  test(
    "non-admin PATCH /admin/users/:id/lock → 403 AUTH_ADMIN_ONLY",
    { tag: ["@TC-AUTHZ-002", "@smoke"] },
    async ({ userApi }) => {
      const res = await createApiClient(userApi).adminUsers.lock(ID);
      await expectCode(res, 403, "AUTH_ADMIN_ONLY");
    }
  );

  test(
    "non-admin PATCH /admin/users/:id/unlock → 403 AUTH_ADMIN_ONLY",
    { tag: ["@TC-AUTHZ-002", "@smoke"] },
    async ({ userApi }) => {
      const res = await createApiClient(userApi).adminUsers.unlock(ID);
      await expectCode(res, 403, "AUTH_ADMIN_ONLY");
    }
  );

  test(
    "non-admin POST /admin/users/:id/reset-password → 403 AUTH_ADMIN_ONLY",
    { tag: ["@TC-AUTHZ-002", "@smoke"] },
    async ({ userApi }) => {
      const res = await createApiClient(userApi).adminUsers.resetPassword(ID);
      await expectCode(res, 403, "AUTH_ADMIN_ONLY");
    }
  );
});

test.describe("Token-less admin mutations are refused with 401", () => {
  test(
    "token-less PATCH /admin/users/:id/lock → 401 AUTH_MISSING_TOKEN",
    { tag: ["@TC-AUTHZ-003", "@smoke"] },
    async ({ guestApi }) => {
      const res = await createApiClient(guestApi).adminUsers.lock(ID);
      await expectCode(res, 401, "AUTH_MISSING_TOKEN");
    }
  );

  test(
    "token-less POST /admin/users/:id/reset-password → 401 AUTH_MISSING_TOKEN",
    { tag: ["@TC-AUTHZ-003", "@smoke"] },
    async ({ guestApi }) => {
      const res = await createApiClient(guestApi).adminUsers.resetPassword(ID);
      await expectCode(res, 401, "AUTH_MISSING_TOKEN");
    }
  );
});

// ---------------------------------------------------------------------------
// Categories. [DT] role × method: every admin category endpoint answers a
// non-admin with 403 and a token-less caller with 401; the public list stays
// open to both.
// ---------------------------------------------------------------------------

const CATEGORY_CALLS: readonly [
  string,
  (c: ApiClient["adminCategories"]) => Promise<APIResponse>
][] = [
  ["GET /admin/categories", (c) => c.list()],
  ["POST /admin/categories", (c) => c.create({})],
  ["PATCH /admin/categories/:id", (c) => c.update(ID, {})],
  ["POST /admin/categories/:id/move", (c) => c.move(ID, "up")],
  ["GET /admin/categories/:id/delete-impact", (c) => c.deleteImpact(ID)],
  ["DELETE /admin/categories/:id", (c) => c.remove(ID, {})]
];

test.describe("Every admin category endpoint: user 403, guest 401", () => {
  for (const [label, send] of CATEGORY_CALLS) {
    test(
      `non-admin ${label} → 403, token-less → 401`,
      { tag: ["@TC-AUTHZ-004", "@smoke"] },
      async ({ userApi, guestApi }) => {
        const asUser = await send(createApiClient(userApi).adminCategories);
        await expectCode(asUser, 403, "AUTH_ADMIN_ONLY");

        const anon = await send(createApiClient(guestApi).adminCategories);
        expect(anon.status()).toBe(401);
      }
    );
  }
});

test(
  "The public category list stays open",
  { tag: "@TC-AUTHZ-005" },
  async ({ userApi, guestApi }) => {
    expect(
      (await createApiClient(userApi).categories.listPublic()).status()
    ).toBe(200);
    expect(
      (await createApiClient(guestApi).categories.listPublic()).status()
    ).toBe(200);
  }
);
