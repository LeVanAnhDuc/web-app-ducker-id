import { test, expect, request as playwrightRequest } from "@playwright/test";
import type { Page, APIRequestContext } from "@playwright/test";
import {
  USER_EMAIL as NON_ADMIN_EMAIL,
  USER_PASSWORD as NON_ADMIN_PASSWORD
} from "../helpers/env";

// AuthZ coverage: a logged-in NON-admin must not gain access to admin data.
// Runs under the `chromium` project (regular-user storageState `user.json`).
//
// IMPORTANT — confirmed behavior (observed LIVE, not assumed):
//   * There is NO client-side route-level role guard for /admin/*. The admin
//     route group layout (src/app/[locale]/(private)/(admin)/layout.tsx) only
//     wraps AdminLayout; the private layout enforces AUTHENTICATION via
//     AuthGuardLayout but NOT authorization. So a non-admin who navigates to an
//     admin route is NOT redirected — the URL stays on /admin/*. Asserting a
//     redirect would be WRONG.
//   * Authorization is enforced by the BACKEND: the admin React Query hooks fire
//     their API calls and the BE rejects a non-admin with 403 AUTH_ADMIN_ONLY
//     (confirmed directly below via the API contract check).
//   * query-client.ts maps the 403 to a transient sonner permission toast
//     ("You do not have permission to perform this action."). That toast
//     auto-dismisses, so asserting it is flaky. Instead each page settles into a
//     STABLE deny state that we assert per route:
//       - /admin/users         => empty state "No users match" (base PR #54
//         changed the unified-list refactor's 403 deny rendering from an error
//         UI to an empty state; the security assertion below — admin@test.com
//         never rendered — is unaffected by this drift)
//       - /admin/apps          => empty registry "No apps registered yet."
//       - /admin/login-history => empty table "No login history found"
//     In every case the protected admin-only data (admin@test.com) never renders.
//
// NOTE on the BE 403 check: the FE access token lives in the in-memory Zustand
// auth store and is injected as a `Bearer` header by axios (src/libs/axios.ts).
// Playwright's `request` fixture inherits only storageState COOKIES, not that
// in-memory token, so a bare `request.get(adminApi)` arrives token-less and
// returns 401 AUTH_MISSING_TOKEN — not the authorization 403 we want to assert.
// We therefore do ONE fresh non-admin login in beforeAll, capture the access
// token, and reuse it for all three route checks (keeps logins to a minimum,
// mindful of the 30/IP/15min rate limit).
//
// FOLLOW-UP (flagged, not fixed here): the missing FE role guard is an
// authorization gap — direct navigation renders the admin shell before the BE
// 403 lands. Tracked in docs/specs/e2e-coverage-backfill.

// Seeded admin-only data that a non-admin must never see rendered.
const ADMIN_DATA_MARKER = "admin@test.com";

// Each admin route + the STABLE deny signal it settles into for a non-admin
// (observed live). `apiPath` is the backend admin endpoint the page's React
// Query hook calls — we assert it returns 403 AUTH_ADMIN_ONLY directly.
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
  }
] as const;

let apiContext: APIRequestContext;
let nonAdminToken: string;

test.beforeAll(async ({ baseURL }) => {
  apiContext = await playwrightRequest.newContext({ baseURL });
  const res = await apiContext.post("/api/v1/auth/login", {
    data: { email: NON_ADMIN_EMAIL, password: NON_ADMIN_PASSWORD }
  });
  expect(res.ok()).toBeTruthy();
  const body = (await res.json()) as { data?: { accessToken?: string } };
  const token = body.data?.accessToken;
  expect(token).toBeTruthy();
  nonAdminToken = token as string;
});

test.afterAll(async () => {
  await apiContext.dispose();
});

const expectDeniedUi = async (
  page: Page,
  route: string,
  denySignal: string
) => {
  await page.goto(route);

  // No FE guard => the non-admin is NOT redirected; URL stays on the admin route.
  await expect(page).toHaveURL(new RegExp(route.replace(/\//g, "\\/") + "$"));

  // Stable deny state for this route (error UI or empty state). This is the
  // robust signal — unlike the transient permission toast, it persists.
  await expect(page.getByText(denySignal).first()).toBeVisible();

  // Protected admin-only data never renders for a non-admin.
  await expect(page.getByText(ADMIN_DATA_MARKER, { exact: true })).toHaveCount(
    0
  );
};

// Confirm the BE contract directly: the non-admin token must be rejected with
// 403 AUTH_ADMIN_ONLY on the admin API the page consumes.
const expectBackend403 = async (apiPath: string) => {
  const res = await apiContext.get(apiPath, {
    headers: { Authorization: `Bearer ${nonAdminToken}` }
  });
  expect(res.status()).toBe(403);
  const body = (await res.json()) as { code?: string };
  expect(body.code).toBe("AUTH_ADMIN_ONLY");
};

test.describe("Admin routes — non-admin authorization", () => {
  for (const { route, apiPath, denySignal } of ADMIN_ROUTES) {
    test(`non-admin is denied admin data at ${route}`, async ({ page }) => {
      await expectDeniedUi(page, route, denySignal);
      await expectBackend403(apiPath);
    });
  }
});

// ---------------------------------------------------------------------------
// Lock/unlock endpoints — AuthZ denial (non-admin) + AuthN denial (no token).
//
// [DT] role × endpoint: non-admin → 403 on BOTH /lock and /unlock. Guard order
// confirmed by design.md: adminGuard rejects a non-admin BEFORE the service's
// self-lock check ever runs, so a non-admin targeting ANY id (including their
// own) still gets 403 AUTH_ADMIN_ONLY — never ADMIN_CANNOT_LOCK_SELF. A
// placeholder ObjectId-shaped id is used since the guard short-circuits before
// existence/format validation of the target.
// ---------------------------------------------------------------------------
const PLACEHOLDER_ID = "aaaaaaaaaaaaaaaaaaaaaaaa";

test.describe("Admin lock/unlock — non-admin authorization (403)", () => {
  test("non-admin PATCH /admin/users/:id/lock → 403 AUTH_ADMIN_ONLY", async () => {
    const res = await apiContext.patch(
      `/api/v1/admin/users/${PLACEHOLDER_ID}/lock`,
      { headers: { Authorization: `Bearer ${nonAdminToken}` } }
    );
    expect(res.status()).toBe(403);
    const body = (await res.json()) as { code?: string };
    expect(body.code).toBe("AUTH_ADMIN_ONLY");
  });

  test("non-admin PATCH /admin/users/:id/unlock → 403 AUTH_ADMIN_ONLY", async () => {
    const res = await apiContext.patch(
      `/api/v1/admin/users/${PLACEHOLDER_ID}/unlock`,
      { headers: { Authorization: `Bearer ${nonAdminToken}` } }
    );
    expect(res.status()).toBe(403);
    const body = (await res.json()) as { code?: string };
    expect(body.code).toBe("AUTH_ADMIN_ONLY");
  });
});

test.describe("Admin lock/unlock — AuthN denial (no token)", () => {
  test("token-less PATCH /admin/users/:id/lock → 401 AUTH_MISSING_TOKEN", async ({
    baseURL
  }) => {
    const tokenLessContext = await playwrightRequest.newContext({ baseURL });
    try {
      const res = await tokenLessContext.patch(
        `/api/v1/admin/users/${PLACEHOLDER_ID}/lock`
      );
      expect(res.status()).toBe(401);
      const body = (await res.json()) as { code?: string };
      expect(body.code).toBe("AUTH_MISSING_TOKEN");
    } finally {
      await tokenLessContext.dispose();
    }
  });
});

// ---------------------------------------------------------------------------
// Reset-password endpoint — AuthZ denial (non-admin) + AuthN denial (no token).
// Mirrors the lock/unlock blocks above (admin-reset-password feature, matrix
// rows #2/#3): adminGuard rejects a non-admin BEFORE the service's self-reset
// check ever runs, so the placeholder id (not a real user) is sufficient —
// the guard short-circuits before existence/format validation of the target.
// The full reset-action test suite (client/e2e/admin-users-reset/) covers the
// admin-authenticated contract (self-reset 403, format 400, not-found 404,
// valid-target 200) and the UI happy path; non-admin/token-less denial for
// this endpoint lives HERE, consistent with the lock/unlock convention above.
// ---------------------------------------------------------------------------
test.describe("Admin reset-password — non-admin authorization (403)", () => {
  test("non-admin POST /admin/users/:id/reset-password → 403 AUTH_ADMIN_ONLY", async () => {
    const res = await apiContext.post(
      `/api/v1/admin/users/${PLACEHOLDER_ID}/reset-password`,
      { headers: { Authorization: `Bearer ${nonAdminToken}` } }
    );
    expect(res.status()).toBe(403);
    const body = (await res.json()) as { code?: string };
    expect(body.code).toBe("AUTH_ADMIN_ONLY");
  });
});

test.describe("Admin reset-password — AuthN denial (no token)", () => {
  test("token-less POST /admin/users/:id/reset-password → 401 AUTH_MISSING_TOKEN", async ({
    baseURL
  }) => {
    const tokenLessContext = await playwrightRequest.newContext({ baseURL });
    try {
      const res = await tokenLessContext.post(
        `/api/v1/admin/users/${PLACEHOLDER_ID}/reset-password`
      );
      expect(res.status()).toBe(401);
      const body = (await res.json()) as { code?: string };
      expect(body.code).toBe("AUTH_MISSING_TOKEN");
    } finally {
      await tokenLessContext.dispose();
    }
  });
});
