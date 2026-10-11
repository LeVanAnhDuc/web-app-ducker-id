import type { APIRequestContext } from "@playwright/test";
import { request } from "@playwright/test";
import {
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
  BASE_URL,
  USER_EMAIL,
  USER_PASSWORD
} from "./env";

// Setup/teardown for the access-control suites. Overrides live in the real
// database now, so every spec that writes one must remove it again: tests
// call `clearOverrides` in afterAll, which flips each overridden cell back to
// its role default — the server then deletes the override instead of storing
// a redundant one.

export interface UserAccess {
  userId: string;
  grantedAppIds: string[];
  overriddenAppIds: string[];
}

export interface AccessChange {
  userId: string;
  appId: string;
  granted: boolean;
}

async function login(
  ctx: APIRequestContext,
  email: string,
  password: string
): Promise<string> {
  const res = await ctx.post("/api/v1/auth/login", {
    data: { email, password }
  });
  const body = (await res.json()) as { data?: { accessToken?: string } };
  const token = body?.data?.accessToken;
  if (!token) throw new Error(`entitlements helper: login failed for ${email}`);
  return token;
}

// Cached module-wide: the login rate limit (30 / 15 min) is shared by every
// suite's hooks.
let adminToken: string | null = null;

async function withAdmin<T>(
  fn: (ctx: APIRequestContext, headers: Record<string, string>) => Promise<T>
): Promise<T> {
  const ctx = await request.newContext({ baseURL: BASE_URL });
  try {
    if (!adminToken) adminToken = await login(ctx, ADMIN_EMAIL, ADMIN_PASSWORD);
    return await fn(ctx, { Authorization: `Bearer ${adminToken}` });
  } finally {
    await ctx.dispose();
  }
}

/** displayName → _id for the whole catalog, any status. */
export async function getAppIdsByName(): Promise<Record<string, string>> {
  return withAdmin(async (ctx, headers) => {
    const res = await ctx.get("/api/v1/admin/apps", {
      headers,
      params: { limit: 100 }
    });
    if (!res.ok()) throw new Error(`getAppIdsByName: ${res.status()}`);
    const body = (await res.json()) as {
      data?: { items?: { _id: string; displayName: string }[] };
    };
    return Object.fromEntries(
      (body.data?.items ?? []).map((app) => [app.displayName, app._id])
    );
  });
}

export async function getUserIdByEmail(email: string): Promise<string> {
  return withAdmin(async (ctx, headers) => {
    const res = await ctx.get("/api/v1/admin/users", {
      headers,
      params: { search: email }
    });
    if (!res.ok()) throw new Error(`getUserIdByEmail: ${res.status()}`);
    const body = (await res.json()) as {
      data?: { items?: { _id: string; email: string }[] };
    };
    const user = body.data?.items?.find((item) => item.email === email);
    if (!user) throw new Error(`getUserIdByEmail: ${email} not found`);
    return user._id;
  });
}

export async function getAccess(userId: string): Promise<UserAccess> {
  return withAdmin(async (ctx, headers) => {
    const res = await ctx.get("/api/v1/admin/entitlements", {
      headers,
      params: { userIds: userId }
    });
    if (!res.ok()) throw new Error(`getAccess: ${res.status()}`);
    const body = (await res.json()) as { data: { users: UserAccess[] } };
    return body.data.users[0];
  });
}

export async function setAccess(changes: AccessChange[]): Promise<void> {
  await withAdmin(async (ctx, headers) => {
    const res = await ctx.patch("/api/v1/admin/entitlements", {
      headers,
      data: { changes }
    });
    if (!res.ok()) throw new Error(`setAccess: ${res.status()}`);
  });
}

/** Drops every override of the user by sending each cell its role default. */
export async function clearOverrides(userId: string): Promise<void> {
  const access = await getAccess(userId);
  if (access.overriddenAppIds.length === 0) return;
  await setAccess(
    access.overriddenAppIds.map((appId) => ({
      userId,
      appId,
      granted: !access.grantedAppIds.includes(appId)
    }))
  );
}

/** A bearer token for the regular seeded user, for API-level authz checks. */
export async function userToken(): Promise<string> {
  const ctx = await request.newContext({ baseURL: BASE_URL });
  try {
    return await login(ctx, USER_EMAIL, USER_PASSWORD);
  } finally {
    await ctx.dispose();
  }
}

export { BASE_URL, USER_EMAIL };
