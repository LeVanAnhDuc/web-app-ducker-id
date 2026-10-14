import type { APIResponse } from "@playwright/test";
import { createApiClient, type ApiClient } from "@/api";
import type { AccessChange, UserAccess } from "@/api/admin-entitlements.client";
import { bearerHeaders, newContext, type Session } from "@/api/base.client";
import { dataOf, sessionOf } from "@/api/response";
import { ADMIN } from "@/config/accounts";

// Entitlement state set up and torn down through the admin API, for the
// access-control specs (tests/*/admin-entitlements, tests/e2e/apps/
// launcher-access.e2e.ts). Overrides live in the real database, so every spec
// that writes one removes it again: `clearOverrides` flips each overridden
// cell back to its role default — the server then deletes the override
// instead of storing a redundant one.
//
// Only ever write overrides for THROWAWAY accounts: every flip notifies its
// user, and the seeded users' inboxes are anchors of the notifications suite.

export type { AccessChange, UserAccess };

// Cached for the worker: the login rate limit (30 / 15 min per IP) is shared
// by every suite's hooks.
let adminSession: Session | null = null;

/** Runs `fn` with a client that carries the seeded admin's Bearer token. */
async function asAdmin<T>(fn: (api: ApiClient) => Promise<T>): Promise<T> {
  if (!adminSession) {
    const login = await newContext();
    try {
      const res = await createApiClient(login).auth.login(
        ADMIN.email,
        ADMIN.password
      );
      adminSession = await sessionOf(res);
    } finally {
      await login.dispose();
    }
  }
  const ctx = await newContext(bearerHeaders(adminSession));
  try {
    return await fn(createApiClient(ctx));
  } finally {
    await ctx.dispose();
  }
}

/** Throws with the response's status and body unless it is a 2xx. */
async function ok<T>(what: string, res: APIResponse): Promise<T> {
  if (!res.ok()) {
    throw new Error(`${what}: ${res.status()} ${await res.text()}`);
  }
  return dataOf<T>(res);
}

/** One app of GET /admin/apps (fields the access-control specs read). */
export interface AdminAppItem {
  _id: string;
  displayName: string;
  status: string;
  requiredRoles: string[];
}

/** The whole admin catalog, every status. */
export function getAdminApps(): Promise<AdminAppItem[]> {
  return asAdmin(async (api) => {
    const data = await ok<{ items?: AdminAppItem[] }>(
      "getAdminApps",
      await api.adminApps.list({ limit: 100 })
    );
    return data.items ?? [];
  });
}

/** displayName → _id for the whole catalog, any status. */
export async function getAppIdsByName(): Promise<Record<string, string>> {
  return Object.fromEntries(
    (await getAdminApps()).map((app) => [app.displayName, app._id])
  );
}

export function getUserIdByEmail(email: string): Promise<string> {
  return asAdmin(async (api) => {
    const data = await ok<{ items?: { _id: string; email: string }[] }>(
      "getUserIdByEmail",
      await api.adminUsers.list({ search: email })
    );
    const user = data.items?.find((item) => item.email === email);
    if (!user) throw new Error(`getUserIdByEmail: ${email} not found`);
    return user._id;
  });
}

export function getAccess(userId: string): Promise<UserAccess> {
  return asAdmin(async (api) => {
    const data = await ok<{ users: UserAccess[] }>(
      "getAccess",
      await api.adminEntitlements.matrix([userId])
    );
    return data.users[0];
  });
}

export function setAccess(changes: AccessChange[]): Promise<void> {
  return asAdmin(async (api) => {
    await ok<unknown>("setAccess", await api.adminEntitlements.update(changes));
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
