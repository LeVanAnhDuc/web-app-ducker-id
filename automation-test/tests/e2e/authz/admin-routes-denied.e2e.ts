import { test, expect } from "@fixtures";
import type { Page, APIRequestContext } from "@playwright/test";

// A signed-in NON-admin must not reach admin data (REQ-AUTHZ-01/02).
// Runs as a regular user — the default `role` of @fixtures — on purpose: the
// denial is only observable with a non-admin session. Admin-only calls use the
// `userApi` fixture (user@test.com's Bearer token); token-less calls use
// `guestApi`. Test cases: test-cases/authz.md (TC-AUTHZ-001 … TC-AUTHZ-006,
// TC-AUTHZ-018).
//
// Confirmed behaviour (observed live, not assumed):
//   * There is NO client-side role guard for /admin/*. The (admin) route-group
//     layout only wraps AdminLayout; the private layout enforces
//     AUTHENTICATION (AuthGuardLayout), not AUTHORIZATION. A non-admin who
//     opens an admin route is NOT redirected — the URL stays on /admin/* and
//     the admin shell renders. TC-AUTHZ-018 records that gap as a bug.
//   * Authorization is enforced by the BACKEND: the page's React Query hooks
//     fire and the API answers 403 AUTH_ADMIN_ONLY.
//   * query-client.ts turns the 403 into a transient sonner toast, which
//     auto-dismisses — asserting it is flaky. Each page instead settles into a
//     STABLE deny state asserted per route (an empty list), and the
//     admin-only marker (admin@test.com) never renders.

// Seeded admin-only data that a non-admin must never see rendered.
const ADMIN_DATA_MARKER = "admin@test.com";

// Each admin list page + the STABLE deny signal it settles into for a
// non-admin (observed live) + the admin endpoint its hook calls.
const ADMIN_ROUTES = [
  {
    route: "/admin/users",
    apiPath: "/api/v1/admin/users",
    denySignal: "No users match"
  },
  {
    route: "/admin/apps",
    apiPath: "/api/v1/admin/apps",
    denySignal: "No apps registered yet."
  },
  {
    route: "/admin/login-history",
    apiPath: "/api/v1/admin/login-history",
    denySignal: "No login history found"
  },
  {
    route: "/admin/categories",
    apiPath: "/api/v1/admin/categories",
    denySignal: "No categories yet"
  },
  {
    route: "/admin/contact",
    apiPath: "/api/v1/admin/contacts",
    denySignal: "No contact requests found"
  }
] as const;

const expectDeniedUi = async (
  page: Page,
  route: string,
  denySignal: string
) => {
  await page.goto(route);

  // No FE guard => the non-admin is NOT redirected; URL stays on the admin route.
  await expect(page).toHaveURL(new RegExp(route.replace(/\//g, "\\/") + "$"));

  // Stable deny state for this route (empty state). Unlike the transient
  // permission toast, it persists.
  await expect(page.getByText(denySignal).first()).toBeVisible();

  // Protected admin-only data never renders for a non-admin.
  await expect(page.getByText(ADMIN_DATA_MARKER, { exact: true })).toHaveCount(
    0
  );
};

// The BE contract the page relies on: 403 AUTH_ADMIN_ONLY for a user token.
const expectBackend403 = async (api: APIRequestContext, apiPath: string) => {
  const res = await api.get(apiPath);
  expect(res.status()).toBe(403);
  const body = (await res.json()) as { code?: string };
  expect(body.code).toBe("AUTH_ADMIN_ONLY");
};

test.describe("Admin routes — non-admin authorization", () => {
  for (const { route, apiPath, denySignal } of ADMIN_ROUTES) {
    test(
      `non-admin is denied admin data at ${route}`,
      {
        tag: ["@TC-AUTHZ-001", ...(route === "/admin/users" ? ["@smoke"] : [])]
      },
      async ({ page, userApi }) => {
        await expectDeniedUi(page, route, denySignal);
        await expectBackend403(userApi, apiPath);
      }
    );
  }

  test(
    "non-admin's entitlement picker never lists any account",
    { tag: "@TC-AUTHZ-001" },
    async ({ page }) => {
      await page.goto("/admin/entitlements");
      await expect(page).toHaveURL(/\/admin\/entitlements$/);
      const search = page.getByRole("combobox", { name: /Search users/i });
      await search.fill("admin");
      await expect(page.getByText("No users found")).toBeVisible();
      await expect(
        page.getByText(ADMIN_DATA_MARKER, { exact: true })
      ).toHaveCount(0);
    }
  );

  test(
    "non-admin is kept out of the admin console shell",
    { tag: "@TC-AUTHZ-018" },
    async ({ page }) => {
      // BUG: BUG-010 — no client-side role guard — a non-admin gets the full admin shell ("Admin Mode", sidebar, landing cards) on /admin/*.
      test.fail();
      await page.goto("/admin");
      // Wait until the session has hydrated (the header avatar shows the
      // user's initials on every private shell) — before that an absence
      // check passes vacuously.
      await expect(page.getByText("TU", { exact: true }).first()).toBeVisible();
      await expect(page.getByText("Admin Mode")).toHaveCount(0, {
        timeout: 3_000
      });
    }
  );
});

// ---------------------------------------------------------------------------
// Lock/unlock endpoints — AuthZ denial (non-admin) + AuthN denial (no token).
//
// [DT] role × endpoint: non-admin → 403 on BOTH /lock and /unlock. adminGuard
// rejects a non-admin BEFORE the service's self-lock check ever runs, so a
// non-admin targeting ANY id (including their own) gets 403 AUTH_ADMIN_ONLY —
// never ADMIN_CANNOT_LOCK_SELF. A placeholder ObjectId-shaped id is enough:
// the guard short-circuits before existence/format validation of the target.
// ---------------------------------------------------------------------------
const PLACEHOLDER_ID = "aaaaaaaaaaaaaaaaaaaaaaaa";

test.describe("Admin lock/unlock — non-admin authorization (403)", () => {
  test(
    "non-admin PATCH /admin/users/:id/lock → 403 AUTH_ADMIN_ONLY",
    { tag: "@TC-AUTHZ-002" },
    async ({ userApi }) => {
      const res = await userApi.patch(
        `/api/v1/admin/users/${PLACEHOLDER_ID}/lock`
      );
      expect(res.status()).toBe(403);
      const body = (await res.json()) as { code?: string };
      expect(body.code).toBe("AUTH_ADMIN_ONLY");
    }
  );

  test(
    "non-admin PATCH /admin/users/:id/unlock → 403 AUTH_ADMIN_ONLY",
    { tag: "@TC-AUTHZ-002" },
    async ({ userApi }) => {
      const res = await userApi.patch(
        `/api/v1/admin/users/${PLACEHOLDER_ID}/unlock`
      );
      expect(res.status()).toBe(403);
      const body = (await res.json()) as { code?: string };
      expect(body.code).toBe("AUTH_ADMIN_ONLY");
    }
  );
});

test.describe("Admin lock/unlock — AuthN denial (no token)", () => {
  test(
    "token-less PATCH /admin/users/:id/lock → 401 AUTH_MISSING_TOKEN",
    { tag: "@TC-AUTHZ-003" },
    async ({ guestApi }) => {
      const res = await guestApi.patch(
        `/api/v1/admin/users/${PLACEHOLDER_ID}/lock`
      );
      expect(res.status()).toBe(401);
      const body = (await res.json()) as { code?: string };
      expect(body.code).toBe("AUTH_MISSING_TOKEN");
    }
  );
});

// ---------------------------------------------------------------------------
// Reset-password endpoint — same shape as lock/unlock: adminGuard rejects a
// non-admin BEFORE the service's self-reset check runs, so the placeholder id
// is enough. The admin-authenticated contract (self-reset 403, format 400,
// not-found 404, valid target 200) lives in the admin-users module.
// ---------------------------------------------------------------------------
test.describe("Admin reset-password — non-admin authorization (403)", () => {
  test(
    "non-admin POST /admin/users/:id/reset-password → 403 AUTH_ADMIN_ONLY",
    { tag: "@TC-AUTHZ-002" },
    async ({ userApi }) => {
      const res = await userApi.post(
        `/api/v1/admin/users/${PLACEHOLDER_ID}/reset-password`
      );
      expect(res.status()).toBe(403);
      const body = (await res.json()) as { code?: string };
      expect(body.code).toBe("AUTH_ADMIN_ONLY");
    }
  );
});

test.describe("Admin reset-password — AuthN denial (no token)", () => {
  test(
    "token-less POST /admin/users/:id/reset-password → 401 AUTH_MISSING_TOKEN",
    { tag: "@TC-AUTHZ-003" },
    async ({ guestApi }) => {
      const res = await guestApi.post(
        `/api/v1/admin/users/${PLACEHOLDER_ID}/reset-password`
      );
      expect(res.status()).toBe(401);
      const body = (await res.json()) as { code?: string };
      expect(body.code).toBe("AUTH_MISSING_TOKEN");
    }
  );
});

// ---------------------------------------------------------------------------
// Categories.
// [DT] role × method: every admin category endpoint answers a non-admin with
// 403 and a token-less caller with 401; the public list stays open to both.
// ---------------------------------------------------------------------------
const CATEGORY_CALLS = [
  ["GET", "/api/v1/admin/categories"],
  ["POST", "/api/v1/admin/categories"],
  ["PATCH", `/api/v1/admin/categories/${PLACEHOLDER_ID}`],
  ["POST", `/api/v1/admin/categories/${PLACEHOLDER_ID}/move`],
  ["GET", `/api/v1/admin/categories/${PLACEHOLDER_ID}/delete-impact`],
  ["DELETE", `/api/v1/admin/categories/${PLACEHOLDER_ID}`]
] as const;

test.describe("Admin categories — authorization matrix", () => {
  for (const [method, path] of CATEGORY_CALLS) {
    test(
      `non-admin ${method} ${path} → 403, token-less → 401`,
      { tag: "@TC-AUTHZ-004" },
      async ({ userApi, guestApi }) => {
        const asUser = await userApi.fetch(path, {
          method,
          data: method === "GET" ? undefined : {}
        });
        expect(asUser.status()).toBe(403);
        expect(((await asUser.json()) as { code?: string }).code).toBe(
          "AUTH_ADMIN_ONLY"
        );

        const anon = await guestApi.fetch(path, {
          method,
          data: method === "GET" ? undefined : {}
        });
        expect(anon.status()).toBe(401);
      }
    );
  }

  test(
    "the public category list stays open to a non-admin",
    { tag: "@TC-AUTHZ-005" },
    async ({ userApi, guestApi }) => {
      expect((await userApi.get("/api/v1/apps/categories")).status()).toBe(200);
      expect((await guestApi.get("/api/v1/apps/categories")).status()).toBe(
        200
      );
    }
  );

  test(
    "an anonymous visitor to /admin/categories is sent to login",
    { tag: "@TC-AUTHZ-006" },
    async ({ guestPage }) => {
      await guestPage.goto("/admin/categories");
      await expect(guestPage).toHaveURL(/\/login/);
    }
  );
});
