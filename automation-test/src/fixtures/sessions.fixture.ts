import { request } from "@playwright/test";
import type { APIRequestContext, Browser, Page } from "@playwright/test";
import { ADMIN, USER } from "@/config/accounts";
import { ADMIN_AUTH_FILE, USER_AUTH_FILE } from "@/config/auth-state";
import { BASE_URL } from "@/config/urls";
import { EMPTY_STATE } from "@/api/base.client";
import { apiAs } from "@/api/session";
import { test as core } from "./core.fixture";

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

function stateFor(role: Role) {
  if (role === "admin") return ADMIN_AUTH_FILE;
  if (role === "user") return USER_AUTH_FILE;
  return EMPTY_STATE;
}

async function pageAs(
  browser: Browser,
  role: Role,
  use: (p: Page) => Promise<void>
) {
  const ctx = await browser.newContext({
    baseURL: BASE_URL,
    storageState: stateFor(role)
  });
  const p = await ctx.newPage();
  await use(p);
  await ctx.close();
}

export const test = core.extend<{
  /** Session `page` / `context` / `request` run under. Default "user". */
  role: Role;
  userPage: Page;
  adminPage: Page;
  guestPage: Page;
  userApi: APIRequestContext;
  adminApi: APIRequestContext;
  guestApi: APIRequestContext;
}>({
  role: ["user", { option: true }],
  // The role decides the storage state of the built-in page / context / request.
  storageState: async ({ role }, use) => {
    await use(stateFor(role));
  },

  userPage: async ({ browser }, use) => pageAs(browser, "user", use),
  adminPage: async ({ browser }, use) => pageAs(browser, "admin", use),
  guestPage: async ({ browser }, use) => pageAs(browser, "guest", use),

  userApi: async ({}, use) => {
    const api = await apiAs(USER.email, USER.password);
    await use(api);
    await api.dispose();
  },
  adminApi: async ({}, use) => {
    const api = await apiAs(ADMIN.email, ADMIN.password);
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
