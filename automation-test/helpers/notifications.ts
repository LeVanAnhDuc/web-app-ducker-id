import type { APIRequestContext } from "@playwright/test";
import { request } from "@playwright/test";

import { MongoClient } from "mongodb";
import type { Db, ObjectId } from "mongodb";
import {
  BASE_URL,
  MONGO_DB_NAME,
  MONGO_URL,
  USER_EMAIL,
  USER_PASSWORD
} from "./env";
import { THROWAWAY_DOMAIN } from "./accounts";
export { BASE_URL, USER_EMAIL, USER_PASSWORD };

// Shared helpers for the notifications suite (e2e + api).

// Seed anchors (server/src/database/seeders/data/notifications.ts). Rows 6-26
// are APP_AVAILABLE for "Seed App <N>", read when N is odd, so each renders a
// unique sentence. Anchors sit inside the first page (20 rows, newest first)
// of every tab. Each has ONE job:
//   - read-only assertions use #10 (unread) and #11 (read) — never clicked;
//   - "mark single" consumes #12, "persists after reload" consumes #14, and
//     the spec puts both back to unread in afterAll (`markUnreadByAppName`) —
//     there is no mark-unread API.
export const seedAppBody = (n: number) =>
  `Seed App ${n} is now in your launcher.`;
export const SEED_UNREAD_N = 10;
export const SEED_UNREAD_BODY = seedAppBody(SEED_UNREAD_N);
export const SEED_READ_BODY = seedAppBody(11);
export const SEED_MARK_SINGLE_BODY = seedAppBody(12);
export const SEED_PERSIST_BODY = seedAppBody(14);
/** Seed app names whose notifications the mutation tests mark read. */
export const SEED_CONSUMED_APPS = ["Seed App 12", "Seed App 14"];

// Every API login below uses this one User-Agent, so after the first call the
// device is known and these helpers stop producing LOGIN_ANOMALY rows of their
// own (which would skew unread-count deltas).
export const HELPER_USER_AGENT =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36 E2E-Helper";

interface ApiEnvelope<T> {
  data?: T;
}

export async function apiLogin(
  ctx: APIRequestContext,
  userAgent = HELPER_USER_AGENT
): Promise<string> {
  const login = await ctx.post("/api/v1/auth/login", {
    data: { email: USER_EMAIL, password: USER_PASSWORD },
    headers: { "User-Agent": userAgent }
  });
  if (!login.ok()) throw new Error(`apiLogin failed (${login.status()})`);
  const body = (await login.json()) as ApiEnvelope<{ accessToken?: string }>;
  const token = body?.data?.accessToken;
  if (!token) throw new Error("apiLogin: no access token in response");
  return token;
}

export async function withApi<T>(
  fn: (ctx: APIRequestContext) => Promise<T>
): Promise<T> {
  const ctx = await request.newContext({ baseURL: BASE_URL });
  try {
    return await fn(ctx);
  } finally {
    await ctx.dispose();
  }
}

/** The caller's unread count straight from the API, for delta assertions. */
export async function fetchUnreadCount(): Promise<number> {
  return withApi(async (ctx) => {
    const token = await apiLogin(ctx);
    const res = await ctx.get("/api/v1/notifications/unread-count", {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok()) throw new Error(`unread-count failed (${res.status()})`);
    const json = (await res.json()) as ApiEnvelope<{ count?: number }>;
    return json?.data?.count ?? 0;
  });
}

export interface ApiNotificationRow {
  id: string;
  type: string;
  params: Record<string, string | number>;
  createdAt: string;
}

export async function fetchNotifications(
  query = ""
): Promise<ApiNotificationRow[]> {
  return withApi(async (ctx) => {
    const token = await apiLogin(ctx);
    const res = await ctx.get(`/api/v1/notifications${query}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok()) throw new Error(`list failed (${res.status()})`);
    const json = (await res.json()) as ApiEnvelope<{
      items?: ApiNotificationRow[];
    }>;
    return json?.data?.items ?? [];
  });
}

/**
 * Makes the helper's own device known before a test measures deltas: the
 * first helper login of a fresh DB is itself an "unusual sign-in", delivered
 * through the queue a moment later.
 */
export async function warmUpHelperDevice(): Promise<void> {
  await fetchUnreadCount();
  await new Promise((resolve) => setTimeout(resolve, 2_000));
}

// Distinct browser/OS pairs. The real LOGIN_ANOMALY test signs a throwaway
// account in with the first one, then with the second — a device the account
// has never used — so it never depends on what earlier runs did.
export const ANOMALY_USER_AGENTS: { ua: string; browser: string }[] = [
  {
    ua: "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15",
    browser: "Safari"
  },
  {
    ua: "Mozilla/5.0 (X11; Linux x86_64; rv:126.0) Gecko/20100101 Firefox/126.0",
    browser: "Firefox"
  },
  {
    ua: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36 Edg/126.0.0.0",
    browser: "Edge"
  },
  {
    ua: "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:126.0) Gecko/20100101 Firefox/126.0",
    browser: "Firefox"
  },
  {
    ua: "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36 OPR/111.0.0.0",
    browser: "Opera"
  },
  {
    ua: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1",
    browser: "Mobile Safari"
  },
  {
    ua: "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36",
    browser: "Chrome"
  },
  {
    ua: "Mozilla/5.0 (Macintosh; Intel Mac OS X 14.4; rv:126.0) Gecko/20100101 Firefox/126.0",
    browser: "Firefox"
  }
];

// ── Direct database access ─────────────────────────────────────────────────
//
// There is no mark-unread API, so a test that marks a seeded notification
// read through the real PATCH puts it back with `markUnreadByAppName` in its
// afterAll. API tests that need notifications of their own seed rows for a
// throwaway account with `insertNotifications`; the cleanup project deletes
// them together with the account.

async function withDb<T>(fn: (db: Db) => Promise<T>): Promise<T> {
  const client = new MongoClient(MONGO_URL);
  await client.connect();
  try {
    return await fn(client.db(MONGO_DB_NAME));
  } finally {
    await client.close();
  }
}

async function userIdOf(db: Db, email: string): Promise<ObjectId> {
  const user = await db
    .collection("users")
    .findOne({ email: email.toLowerCase() });
  if (!user) throw new Error(`notifications helper: no user ${email}`);
  return user._id as ObjectId;
}

/**
 * Sets `email`'s APP_AVAILABLE notifications for the given app names back to
 * unread.
 */
export async function markUnreadByAppName(
  email: string,
  appNames: string[]
): Promise<number> {
  if (appNames.length === 0) return 0;
  return withDb(async (db) => {
    const userId = await userIdOf(db, email);
    const res = await db.collection("notifications").updateMany(
      {
        userId,
        type: "APP_AVAILABLE",
        "params.appName": { $in: appNames }
      },
      { $set: { isRead: false, readAt: null } }
    );
    return res.modifiedCount;
  });
}

const CATEGORY_BY_TYPE: Record<string, string> = {
  LOGIN_ANOMALY: "security",
  ACCOUNT_LOCKED: "security",
  PASSWORD_CHANGED: "security",
  ENTITLEMENT_GRANTED: "account",
  ENTITLEMENT_REVOKED: "account",
  APP_AVAILABLE: "app",
  SYSTEM_ANNOUNCEMENT: "system"
};

export interface SeedNotification {
  /** Stored as `params.appName` of an APP_AVAILABLE row unless `type` says otherwise. */
  name: string;
  isRead?: boolean;
  /** Minutes before now. */
  ageMinutes?: number;
  type?: string;
  params?: Record<string, string | number>;
}

/**
 * Inserts notifications for a throwaway account, in the shape the real
 * producers write (type + category + params + link), and returns their ids in
 * the order given. Refuses any account outside the throwaway domain.
 */
export async function insertNotifications(
  email: string,
  items: SeedNotification[]
): Promise<string[]> {
  if (!email.endsWith(`@${THROWAWAY_DOMAIN}`))
    throw new Error(`insertNotifications: ${email} is not a throwaway account`);
  return withDb(async (db) => {
    const userId = await userIdOf(db, email);
    const now = Date.now();
    const docs = items.map((item, i) => {
      const type = item.type ?? "APP_AVAILABLE";
      return {
        userId,
        type,
        category: CATEGORY_BY_TYPE[type] ?? "system",
        params: item.params ?? { appName: item.name },
        link:
          type === "APP_AVAILABLE"
            ? `/apps?search=${encodeURIComponent(item.name)}`
            : null,
        dedupeKey: null,
        isRead: item.isRead ?? false,
        readAt: item.isRead ? new Date(now) : null,
        createdAt: new Date(now - (item.ageMinutes ?? i) * 60_000),
        __v: 0
      };
    });
    const res = await db.collection("notifications").insertMany(docs);
    return Object.values(res.insertedIds).map((id) => id.toString());
  });
}

export interface StoredNotification {
  type: string;
  category: string;
  params: Record<string, string | number>;
  link: string | null;
  isRead: boolean;
}

/**
 * Every notification stored for `email`, newest first — for producer tests
 * that cannot read the list API (the event itself ended the session).
 */
export async function notificationsOf(
  email: string
): Promise<StoredNotification[]> {
  return withDb(async (db) => {
    const userId = await userIdOf(db, email);
    return db
      .collection<StoredNotification>("notifications")
      .find({ userId }, { projection: { _id: 0, userId: 0 } })
      .sort({ createdAt: -1 })
      .toArray();
  });
}
