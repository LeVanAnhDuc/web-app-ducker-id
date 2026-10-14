import { expect } from "@playwright/test";
import { MongoClient } from "mongodb";
import type { Db, ObjectId } from "mongodb";
import { MONGO_DB_NAME, MONGO_URL } from "@/config/datastores";
import { SEED_NOTIFICATIONS, THROWAWAY_DOMAIN } from "@/data/test-data";

// Notification rows straight in MongoDB, for what the API cannot do:
//   - there is no mark-unread API, so a seeded row a test marks read through
//     the real PATCH is put back with `markUnreadByAppName` in afterAll;
//   - API cases seed rows for a throwaway account (`insertNotifications`, the
//     shape the real producers write); teardown deletes them with the account;
//   - producer cases read what an event stored (`notificationsOf`) when the
//     event itself ended the session that could read the list;
//   - specs that anchor on the seed drop what other specs produced for the
//     seeded user earlier in the run (`removeNonSeedNotifications`).

async function withDb<T>(fn: (db: Db) => Promise<T>): Promise<T> {
  const client = new MongoClient(MONGO_URL);
  await client.connect();
  try {
    return await fn(client.db(MONGO_DB_NAME));
  } finally {
    await client.close();
  }
}

async function userOf(
  db: Db,
  email: string
): Promise<{ _id: ObjectId; authId: ObjectId }> {
  const user = await db
    .collection("users")
    .findOne({ email: email.toLowerCase() });
  if (!user) throw new Error(`notifications: no user ${email}`);
  return { _id: user._id as ObjectId, authId: user.authId as ObjectId };
}

/** Sets `email`'s APP_AVAILABLE rows for the given app names back to unread. */
export async function markUnreadByAppName(
  email: string,
  appNames: readonly string[]
): Promise<number> {
  if (appNames.length === 0) return 0;
  return withDb(async (db) => {
    const { _id } = await userOf(db, email);
    const res = await db.collection("notifications").updateMany(
      {
        userId: _id,
        type: "APP_AVAILABLE",
        "params.appName": { $in: [...appNames] }
      },
      { $set: { isRead: false, readAt: null } }
    );
    return res.modifiedCount;
  });
}

/**
 * Rows the seeder writes (server/src/database/seeders/data/notifications.ts).
 * PASSWORD_CHANGED and ACCOUNT_LOCKED can only be seed rows for a seeded
 * account: no spec changes its password or locks it.
 */
const SEED_ROWS = [
  {
    type: "APP_AVAILABLE",
    "params.appName": { $in: [...SEED_NOTIFICATIONS.appNames] }
  },
  { type: "PASSWORD_CHANGED" },
  { type: "ACCOUNT_LOCKED" },
  {
    type: "LOGIN_ANOMALY",
    "params.reason": SEED_NOTIFICATIONS.anomaly.reason,
    "params.browser": SEED_NOTIFICATIONS.anomaly.browser,
    "params.os": SEED_NOTIFICATIONS.anomaly.os,
    "params.country": SEED_NOTIFICATIONS.anomaly.country
  }
];

/**
 * Deletes every notification of `email` that the seeder did not write — the
 * APP_AVAILABLE broadcasts, entitlement changes and sign-in alerts other specs
 * produced earlier in the run, which push the seed anchors off the first page.
 * Seed rows keep their read state.
 */
export async function removeNonSeedNotifications(
  email: string
): Promise<number> {
  return withDb(async (db) => {
    const { _id } = await userOf(db, email);
    const res = await db
      .collection("notifications")
      .deleteMany({ userId: _id, $nor: SEED_ROWS });
    return res.deletedCount;
  });
}

/**
 * Waits until a sign-in of `email` with `userAgent` made after `since` is
 * recorded, and — when the server judged it unusual — until its LOGIN_ANOMALY
 * row is stored. Both are written fire-and-forget after the login answers.
 */
export async function waitForSignInRecorded(
  email: string,
  userAgent: string,
  since: Date
): Promise<void> {
  await withDb(async (db) => {
    const { _id, authId } = await userOf(db, email);
    let isAnomaly = false;
    await expect
      .poll(
        async () => {
          const row = await db
            .collection("login_histories")
            .findOne(
              { userId: authId, userAgent, createdAt: { $gte: since } },
              { sort: { createdAt: -1 } }
            );
          isAnomaly = !!row?.isAnomaly;
          return !!row;
        },
        { message: `login history of ${email}`, timeout: 15_000 }
      )
      .toBe(true);
    if (!isAnomaly) return;
    await expect
      .poll(
        () =>
          db.collection("notifications").countDocuments({
            userId: _id,
            type: "LOGIN_ANOMALY",
            createdAt: { $gte: since }
          }),
        { message: `LOGIN_ANOMALY of ${email}`, timeout: 15_000 }
      )
      .toBeGreaterThan(0);
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
    const { _id } = await userOf(db, email);
    const now = Date.now();
    const docs = items.map((item, i) => {
      const type = item.type ?? "APP_AVAILABLE";
      return {
        userId: _id,
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

/** Every notification stored for `email`, newest first. */
export async function notificationsOf(
  email: string
): Promise<StoredNotification[]> {
  return withDb(async (db) => {
    const { _id } = await userOf(db, email);
    return db
      .collection<StoredNotification>("notifications")
      .find({ userId: _id }, { projection: { _id: 0, userId: 0 } })
      .sort({ createdAt: -1 })
      .toArray();
  });
}
