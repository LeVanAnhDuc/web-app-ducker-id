import {
  expect,
  type APIRequestContext,
  type APIResponse
} from "@playwright/test";
import { createClient } from "redis";
import { MongoClient } from "mongodb";
import { createApiClient } from "@/api";
import type { AdminUserItem, AdminUsersPage } from "@/api/admin-users.client";
import { dataOf } from "@/api/response";
import { MONGO_DB_NAME, MONGO_URL, REDIS_URL } from "@/config/datastores";
import { THROWAWAY_DOMAIN } from "@/data/test-data";
import { findUserByEmail } from "./accounts";

// Admin user management (module ADMINUSERS) — lookups and the two things no
// HTTP endpoint exposes. Used by tests/{e2e,api}/admin-users and by the
// modules that need an account's id or an admin reset (notifications,
// admin-contact).
//
//   - the temporary password an admin reset issues is only ever sent by
//     email. The server enqueues that email on the BullMQ `email` queue and
//     keeps the 50 most recent completed jobs, so the plaintext sits in the
//     job's `data` hash field. `readTempPassword()` reads it from there.
//   - no endpoint grants the admin role. `promoteToAdmin()` flips a
//     throwaway account's `auths.roles` directly so a decision-table row can
//     target (or act as) "another admin". The teardown deletes the account.
//
// Lookups take an admin request context (`adminApi` fixture: Bearer token).

/** The admin-list row for an email, via `GET /admin/users?search=`. */
export async function adminUserByEmail(
  adminApi: APIRequestContext,
  email: string
): Promise<AdminUserItem> {
  const res = await createApiClient(adminApi).adminUsers.list({
    search: email
  });
  expect(res.ok(), `GET /admin/users?search=${email} → ${res.status()}`).toBe(
    true
  );
  const { items } = await dataOf<AdminUsersPage>(res);
  const match = items.find((u) => u.email === email.toLowerCase());
  expect(match, `no admin-list row for ${email}`).toBeTruthy();
  return match as AdminUserItem;
}

/** `_id` (users collection) of an account, as the admin API knows it. */
export async function adminUserId(
  adminApi: APIRequestContext,
  email: string
): Promise<string> {
  return (await adminUserByEmail(adminApi, email))._id;
}

/** The caller's own users `_id`, via `GET /users/me` (any Bearer context). */
export async function ownUserId(api: APIRequestContext): Promise<string> {
  const res = await createApiClient(api).call("get", "/users/me");
  expect(res.ok(), `GET /users/me → ${res.status()}`).toBe(true);
  return (await dataOf<{ _id: string }>(res))._id;
}

/** POST /admin/users/:id/reset-password on an admin context. */
export function resetPassword(
  adminApi: APIRequestContext,
  id: string
): Promise<APIResponse> {
  return createApiClient(adminApi).adminUsers.resetPassword(id);
}

const RECENT_JOBS = 100;

/**
 * The temporary password the server generated for `email` by an admin reset
 * issued at or after `sinceMs`. Polls the 100 newest BullMQ `email` job
 * hashes for an `ADMIN_RESET_PASSWORD` job addressed to that email.
 */
export async function readTempPassword(
  email: string,
  sinceMs: number,
  timeoutMs = 10_000
): Promise<string> {
  if (!REDIS_URL)
    throw new Error("REDIS_URL is not set (automation-test/.env)");
  const target = email.toLowerCase();
  const r = createClient({ url: REDIS_URL });
  r.on("error", () => undefined);
  await r.connect();
  try {
    let found: string | null = null;
    await expect
      .poll(
        async () => {
          let best: { ts: number; pw: string } | null = null;
          // Job ids are sequential (`bull:email:id` is the counter), so the
          // newest jobs are the highest ids — reading those is far cheaper
          // than SCANning a shared Redis keyspace.
          const lastId = Number((await r.get("bull:email:id")) ?? 0);
          const ids: number[] = [];
          for (let id = lastId; id > Math.max(0, lastId - RECENT_JOBS); id -= 1)
            ids.push(id);
          // Issued concurrently, so node-redis pipelines them in one round trip.
          const rows = await Promise.all(
            ids.map((id) =>
              r.hmGet(`bull:email:${id}`, ["name", "data", "timestamp"])
            )
          );
          for (const [name, data, ts] of rows) {
            if (name !== "ADMIN_RESET_PASSWORD" || !data) continue;
            const job = JSON.parse(data) as {
              email?: string;
              data?: { tempPassword?: string };
            };
            const at = Number(ts);
            if (
              job.email?.toLowerCase() === target &&
              job.data?.tempPassword &&
              at >= sinceMs &&
              (!best || at > best.ts)
            )
              best = { ts: at, pw: job.data.tempPassword };
          }
          found = best?.pw ?? null;
          return found !== null;
        },
        {
          message: `readTempPassword: no ADMIN_RESET_PASSWORD email job for ${email} since ${new Date(sinceMs).toISOString()}`,
          timeout: timeoutMs,
          intervals: [250]
        }
      )
      .toBe(true);
    return found as unknown as string;
  } finally {
    await r.quit().catch(() => undefined);
  }
}

/** Gives a THROWAWAY account the admin role (direct DB write). */
export async function promoteToAdmin(email: string): Promise<void> {
  if (!email.toLowerCase().endsWith(`@${THROWAWAY_DOMAIN}`))
    throw new Error(`promoteToAdmin: refusing non-throwaway ${email}`);
  const user = await findUserByEmail(email);
  if (!user) throw new Error(`promoteToAdmin: no user ${email}`);
  const client = new MongoClient(MONGO_URL);
  await client.connect();
  try {
    const res = await client
      .db(MONGO_DB_NAME)
      .collection("auths")
      .updateOne({ _id: user.authId }, { $set: { roles: "admin" } });
    expect(res.matchedCount, `auth record of ${email}`).toBe(1);
  } finally {
    await client.close();
  }
}
