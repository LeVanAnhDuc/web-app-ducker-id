import { expect } from "@playwright/test";
import type { APIRequestContext, APIResponse } from "@playwright/test";
import { createClient } from "redis";
import { MongoClient } from "mongodb";
import { MONGO_DB_NAME, MONGO_URL, REDIS_URL } from "./env";

// Admin user-management helpers (module ADMUSERS).
//
// Lock / unlock / reset always target throwaway accounts from
// `createAccount()` — never user@test.com or admin@test.com. These helpers
// drive the real admin API with an admin Bearer context (`adminApi` fixture)
// and, for the two things no HTTP endpoint exposes, read the datastores the
// server writes to:
//
//   - the temporary password an admin reset issues is only ever sent by
//     email. The server enqueues that email on the BullMQ `email` queue and
//     keeps the 50 most recent completed jobs, so the plaintext sits in the
//     job's `data` hash field. `readTempPassword()` reads it from there.
//   - no endpoint grants the admin role. `promoteToAdmin()` flips a
//     throwaway account's `auths.roles` directly so a decision-table row can
//     target "another admin". The cleanup project deletes the account.

interface AdminUserItem {
  _id: string;
  email: string;
  fullName: string;
  role: "user" | "admin";
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

/** The admin-list row for an email, via `GET /admin/users?search=`. */
export async function adminUserByEmail(
  adminApi: APIRequestContext,
  email: string
): Promise<AdminUserItem> {
  const res = await adminApi.get("/api/v1/admin/users", {
    params: { search: email }
  });
  expect(res.ok(), `GET /admin/users?search=${email} → ${res.status()}`).toBe(
    true
  );
  const body = (await res.json()) as { data: { items: AdminUserItem[] } };
  const match = body.data.items.find((u) => u.email === email.toLowerCase());
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

/** The admin's own users `_id`, via `GET /users/me`. */
export async function ownUserId(api: APIRequestContext): Promise<string> {
  const res = await api.get("/api/v1/users/me");
  expect(res.ok(), `GET /users/me → ${res.status()}`).toBe(true);
  const body = (await res.json()) as { data: { _id: string } };
  return body.data._id;
}

/** PATCH /admin/users/:id/lock or /unlock. */
export function setActive(
  adminApi: APIRequestContext,
  id: string,
  active: boolean
): Promise<APIResponse> {
  return adminApi.patch(
    `/api/v1/admin/users/${id}/${active ? "unlock" : "lock"}`
  );
}

/** POST /admin/users/:id/reset-password. */
export function resetPassword(
  adminApi: APIRequestContext,
  id: string
): Promise<APIResponse> {
  return adminApi.post(`/api/v1/admin/users/${id}/reset-password`);
}

/** Decodes a JWT payload without verifying it (assertions only). */
export function decodeJwt(token: string): Record<string, unknown> {
  const part = token.split(".")[1] ?? "";
  return JSON.parse(Buffer.from(part, "base64url").toString("utf8")) as Record<
    string,
    unknown
  >;
}

async function withRedis<T>(
  fn: (r: ReturnType<typeof createClient>) => Promise<T>
): Promise<T> {
  if (!REDIS_URL)
    throw new Error("REDIS_URL is not set (automation-test/.env)");
  const r = createClient({ url: REDIS_URL });
  r.on("error", () => undefined);
  await r.connect();
  try {
    return await fn(r);
  } finally {
    await r.quit().catch(() => undefined);
  }
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
  const target = email.toLowerCase();
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const found = await withRedis(async (r) => {
      let best: { ts: number; pw: string } | null = null;
      // Job ids are sequential (`bull:email:id` is the counter), so the
      // newest jobs are the highest ids — reading those is far cheaper than
      // SCANning a shared Redis keyspace.
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
      return best?.pw ?? null;
    });
    if (found) return found;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(
    `readTempPassword: no ADMIN_RESET_PASSWORD email job for ${email} since ${new Date(sinceMs).toISOString()}`
  );
}

/** Gives a throwaway account the admin role (direct DB write). */
export async function promoteToAdmin(email: string): Promise<void> {
  if (!email.toLowerCase().endsWith("@e2e.example.com"))
    throw new Error(`promoteToAdmin: refusing non-throwaway ${email}`);
  const client = new MongoClient(MONGO_URL);
  await client.connect();
  try {
    const db = client.db(MONGO_DB_NAME);
    const user = await db
      .collection("users")
      .findOne({ email: email.toLowerCase() });
    if (!user) throw new Error(`promoteToAdmin: no user ${email}`);
    await db
      .collection("auths")
      .updateOne({ _id: user.authId }, { $set: { roles: "admin" } });
  } finally {
    await client.close();
  }
}

/** Plain (cookie-less) password login; returns the raw response. */
export function passwordLogin(
  api: APIRequestContext,
  email: string,
  password: string
): Promise<APIResponse> {
  return api.post("/api/v1/auth/login", { data: { email, password } });
}

/**
 * Makes sure the login history holds at least one failed attempt: a
 * throwaway account signs in with a wrong password, then waits until the
 * (asynchronously written) row is visible to the admin API.
 */
export async function ensureFailedAttempt(
  adminApi: APIRequestContext,
  guestApi: APIRequestContext,
  account: { email: string }
): Promise<void> {
  await passwordLogin(guestApi, account.email, "Wrong@Password1");
  await expect
    .poll(
      async () => {
        const res = await adminApi.get("/api/v1/admin/login-history", {
          params: { status: "failed", limit: 1 }
        });
        const body = (await res.json()) as {
          data: { meta: { total: number } };
        };
        return body.data.meta.total;
      },
      { timeout: 10_000 }
    )
    .toBeGreaterThan(0);
}
