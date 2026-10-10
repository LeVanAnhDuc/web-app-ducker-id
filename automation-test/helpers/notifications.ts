import type { APIRequestContext } from "@playwright/test";
import { request } from "@playwright/test";

// Shared config for the notifications E2E suite.
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

// Literal seed titles (BE seeder: server/src/database/seeders/data/notifications.ts).
// We assert these verbatim to prove the FE renders the stored string, not an
// i18n key or enum.
//
// IMPORTANT — pick titles the mutation tests never consume. The real seed pads
// to 26 rows by appending a UNIQUE "(#N)" suffix, with isRead = (N-1) % 2 === 0;
// each "(#N)" title is therefore globally unique AND deterministically read or
// unread. The serial mutation tests (mark-single, D9 persistence) permanently
// flip the NEWEST unread item (`.first()` = top of list) to read with no
// mark-unread API to revert (documented in the spec + afterAll). The bare
// titles (items 1-3, newest) get eaten by that drift across runs, so we anchor
// on OLD padded "(#N)" rows that sort to the bottom and are never clicked:
//   - "Unusual sign-in detected (#22)" → seeded UNREAD (item #22, even N-1).
//   - "Password changed" (bare item #4) → seeded READ; mutations only touch
//     UNREAD rows, so this read row is never flipped. Its exact match never
//     collides with the padded "Password changed (#11/#18/#25)" variants.
export const SEED_UNREAD_TITLE = "Unusual sign-in detected (#22)";
// A seed row that is seeded as read (4th item), used for read-tab assertions.
export const SEED_READ_TITLE = "Password changed";

interface UnreadCountResponse {
  data?: { count?: number };
}

// Fetch the caller's unread count straight from the API, for delta assertions
// in the mutation tests (badge math is more robust as a delta than an absolute).
// Logs in via password to get a fresh bearer token (the page storageState's
// cookie is not directly reusable from a bare request context).
export async function fetchUnreadCount(): Promise<number> {
  const ctx: APIRequestContext = await request.newContext({
    baseURL: BASE_URL
  });
  try {
    const login = await ctx.post("/api/v1/auth/login", {
      data: { email: USER_EMAIL, password: USER_PASSWORD }
    });
    if (!login.ok()) {
      throw new Error(`fetchUnreadCount: login failed (${login.status()})`);
    }
    const body = (await login.json()) as { data?: { accessToken?: string } };
    const token = body?.data?.accessToken;
    if (!token)
      throw new Error("fetchUnreadCount: no access token in response");

    const res = await ctx.get("/api/v1/notifications/unread-count", {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok()) {
      throw new Error(`fetchUnreadCount: request failed (${res.status()})`);
    }
    const json = (await res.json()) as UnreadCountResponse;
    return json?.data?.count ?? 0;
  } finally {
    await ctx.dispose();
  }
}

// ── Direct database access ─────────────────────────────────────────────────
//
// There is no mark-unread API, so a test that marks a seeded notification
// read through the real PATCH puts it back with `markUnreadByTitle` in its
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

/** Sets the given titles of `email`'s notifications back to unread. */
export async function markUnreadByTitle(
  email: string,
  titles: string[]
): Promise<number> {
  if (titles.length === 0) return 0;
  return withDb(async (db) => {
    const userId = await userIdOf(db, email);
    const res = await db
      .collection("notifications")
      .updateMany(
        { userId, title: { $in: titles } },
        { $set: { isRead: false, readAt: null } }
      );
    return res.modifiedCount;
  });
}

export interface SeedNotification {
  title: string;
  isRead?: boolean;
  /** Minutes before now. */
  ageMinutes?: number;
  type?: string;
}

/**
 * Inserts notifications for a throwaway account and returns their ids in the
 * order given. Refuses any account outside the throwaway domain.
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
    const docs = items.map((item, i) => ({
      userId,
      type: item.type ?? "SYSTEM_ANNOUNCEMENT",
      title: item.title,
      message: `${item.title} — regression fixture.`,
      meta: null,
      isRead: item.isRead ?? false,
      readAt: item.isRead ? new Date(now) : null,
      createdAt: new Date(now - (item.ageMinutes ?? i) * 60_000),
      __v: 0
    }));
    const res = await db.collection("notifications").insertMany(docs);
    return Object.values(res.insertedIds).map((id) => id.toString());
  });
}
