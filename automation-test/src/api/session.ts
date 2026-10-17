import type { APIRequestContext, Page } from "@playwright/test";
import { createAuthClient } from "./auth.client";
import { createBaseClient, newContext, bearerHeaders } from "./base.client";
import { sessionOf } from "./response";
import { ADMIN, USER } from "@/config/accounts";

/**
 * Logs in over the API and returns a request context that sends the access
 * token as a Bearer header — the way the client's axios instance talks to the
 * API. For a session outside the role fixtures: an account of the test's own,
 * or one opened in `beforeAll`. The caller disposes it.
 */
export async function apiAs(
  email: string,
  password: string
): Promise<APIRequestContext> {
  const login = await newContext();
  try {
    const auth = createAuthClient(createBaseClient(login));
    const session = await sessionOf(await auth.login(email, password));
    return newContext(bearerHeaders(session));
  } finally {
    await login.dispose();
  }
}

/**
 * Bearer contexts of the seeded user / admin for `beforeAll` / `afterAll`,
 * where the test-scoped `userApi` / `adminApi` fixtures are not available.
 * The caller disposes them.
 */
export const userContext = (): Promise<APIRequestContext> =>
  apiAs(USER.email, USER.password);
export const adminContext = (): Promise<APIRequestContext> =>
  apiAs(ADMIN.email, ADMIN.password);

// ── Throwaway sessions (moved from helpers/password.ts) ────────────────────

export interface LoginResult {
  status: number;
  accessToken: string | null;
  idToken: string | null;
  /** Value of the `refreshToken` cookie the login set, if any. */
  refreshToken: string | null;
  body: unknown;
}

/**
 * POST /auth/login in its own empty context and reads back everything a test
 * may inspect: status, tokens, the refresh cookie. Never throws on a failed
 * login — the status is the answer.
 */
export async function loginOverApi(
  email: string,
  password: string
): Promise<LoginResult> {
  const ctx = await newContext();
  try {
    const res = await createAuthClient(createBaseClient(ctx)).login(
      email,
      password
    );
    const body = (await res.json().catch(() => null)) as {
      data?: { accessToken?: string; idToken?: string };
    } | null;
    const cookie = (await ctx.storageState()).cookies.find(
      (c) => c.name === "refreshToken"
    );
    return {
      status: res.status(),
      accessToken: body?.data?.accessToken ?? null,
      idToken: body?.data?.idToken ?? null,
      refreshToken: cookie?.value ?? null,
      body
    };
  } finally {
    await ctx.dispose();
  }
}

/** A request context that sends `accessToken` as a Bearer header. Caller disposes. */
export function bearerContext(
  accessToken: string,
  headers: Record<string, string> = {}
): Promise<APIRequestContext> {
  return newContext({ ...bearerHeaders({ accessToken }), ...headers });
}

/** POST /auth/token/refresh with an explicit refresh cookie; returns the status. */
export async function refreshStatus(refreshToken: string): Promise<number> {
  const ctx = await newContext();
  try {
    const res = await createAuthClient(createBaseClient(ctx)).refreshToken(
      refreshToken
    );
    return res.status();
  } finally {
    await ctx.dispose();
  }
}

/**
 * Signs a browser context in as an account: the login response sets the
 * refresh cookie on the context, and SessionGate turns it into a session on
 * the next full navigation. Throws when the login is refused.
 */
export async function loginInBrowser(
  page: Page,
  email: string,
  password: string
): Promise<void> {
  const res = await createAuthClient(createBaseClient(page.request)).login(
    email,
    password
  );
  if (!res.ok()) {
    throw new Error(`browser login ${email} → ${res.status()}`);
  }
}
