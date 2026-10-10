import { test as base, expect, request } from "@playwright/test";
import type {
  APIRequestContext,
  Browser,
  BrowserContext,
  Page
} from "@playwright/test";
import {
  ADMIN_AUTH_FILE,
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
  BASE_URL,
  USER_AUTH_FILE,
  USER_EMAIL,
  USER_PASSWORD
} from "@helpers/env";
import { clearRateLimits } from "@helpers/redis";

// Role fixtures — the one place that decides which session a test runs as.
//
//   test.use({ role: "admin" });          // whole file / describe as admin
//   test("…", async ({ page }) => …);     // `page` carries that role
//
//   test("…", async ({ adminPage, userPage }) => …);  // several roles at once
//   test("…", async ({ adminApi, guestApi }) => …);   // API, no browser
//
// `role` defaults to "user". "guest" is a clean context with no cookies.
// The role is declared in the spec itself, so moving or renaming a folder can
// never silently change the session a test runs under.

export type Role = "user" | "admin" | "guest";

const EMPTY_STATE = { cookies: [], origins: [] };

function stateFor(role: Role) {
  if (role === "admin") return ADMIN_AUTH_FILE;
  if (role === "user") return USER_AUTH_FILE;
  return EMPTY_STATE;
}

const CREDENTIALS: Record<Exclude<Role, "guest">, [string, string]> = {
  user: [USER_EMAIL, USER_PASSWORD],
  admin: [ADMIN_EMAIL, ADMIN_PASSWORD]
};

/**
 * Logs in over the API and returns a request context that sends the access
 * token as a Bearer header — the way the client's axios instance talks to the
 * API. Exported for tests that need a session for an account of their own.
 */
export async function apiAs(
  email: string,
  password: string
): Promise<APIRequestContext> {
  const login = await request.newContext({
    baseURL: BASE_URL,
    storageState: EMPTY_STATE
  });
  const res = await login.post("/api/v1/auth/login", {
    data: { email, password }
  });
  expect(res.ok(), `login ${email} → ${res.status()}`).toBeTruthy();
  const body = (await res.json()) as { data?: { accessToken?: string } };
  const token = body.data?.accessToken;
  expect(token, `no accessToken for ${email}`).toBeTruthy();
  await login.dispose();
  return request.newContext({
    baseURL: BASE_URL,
    storageState: EMPTY_STATE,
    extraHTTPHeaders: { Authorization: `Bearer ${token}` }
  });
}

async function pageAs(
  browser: Browser,
  role: Role,
  use: (p: Page) => Promise<void>
) {
  const ctx: BrowserContext = await browser.newContext({
    baseURL: BASE_URL,
    storageState: stateFor(role)
  });
  const p = await ctx.newPage();
  await use(p);
  await ctx.close();
}

type Fixtures = {
  /** Session `page` / `context` / `request` run under. Default "user". */
  role: Role;
  /** Set true in a rate-limit test so the counters are NOT cleared first. */
  keepRateLimits: boolean;
  _resetRateLimits: void;
  userPage: Page;
  adminPage: Page;
  guestPage: Page;
  userApi: APIRequestContext;
  adminApi: APIRequestContext;
  guestApi: APIRequestContext;
};

export const test = base.extend<Fixtures>({
  role: ["user", { option: true }],
  keepRateLimits: [false, { option: true }],

  storageState: async ({ role }, use) => {
    await use(stateFor(role));
  },

  _resetRateLimits: [
    async ({ keepRateLimits }, use) => {
      if (!keepRateLimits) await clearRateLimits();
      await use();
    },
    { auto: true }
  ],

  userPage: async ({ browser }, use) => pageAs(browser, "user", use),
  adminPage: async ({ browser }, use) => pageAs(browser, "admin", use),
  guestPage: async ({ browser }, use) => pageAs(browser, "guest", use),

  userApi: async ({}, use) => {
    const api = await apiAs(...CREDENTIALS.user);
    await use(api);
    await api.dispose();
  },
  adminApi: async ({}, use) => {
    const api = await apiAs(...CREDENTIALS.admin);
    await use(api);
    await api.dispose();
  },
  guestApi: async ({}, use) => {
    // Explicitly empty: inside a test, request.newContext() would otherwise
    // inherit the test's storageState and carry the role's cookies.
    const api = await request.newContext({
      baseURL: BASE_URL,
      storageState: EMPTY_STATE
    });
    await use(api);
    await api.dispose();
  }
});

export { expect };
export type { Page, APIRequestContext };
