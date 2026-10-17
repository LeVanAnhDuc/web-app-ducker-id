import { test, expect } from "@/fixtures";
import { errorOf } from "@/api/response";
import { USER } from "@/config/accounts";
import { serverMessage } from "@/data/copy";
import { list, owner, signedIn, unreadCount } from "./helpers";
import type { NotificationItem } from "./helpers";

// /notifications — list, read and type filters, paging, unread count, mark
// one, mark all, privacy between users and the session guard.
// server/src/modules/notification, validators/schemas/notification.ts.
// Test cases: test-cases/notifications.md (TC-NOTIFICATIONS-030 … 038, 057 … 059).
//
// Rows carry type + category + params + link, never text. Each case seeds
// rows for a throwaway account directly in the database (insertNotifications,
// the shape the real producers write); teardown deletes the account and its
// rows. The seeded user's notifications are never marked here.

test.use({ role: "guest" });

const ZERO_ID = "ffffffffffffffffffffffff";

/** The fields of NotificationItemDto (server/src/modules/notification/dtos). */
const ITEM_FIELDS = [
  "category",
  "createdAt",
  "id",
  "isRead",
  "link",
  "params",
  "readAt",
  "type"
];

test(
  "List contract and sort order",
  { tag: ["@TC-NOTIFICATIONS-030", "@smoke"] },
  async ({ newApi }) => {
    const { notifications, ids } = await owner(newApi, "notif-contract", [
      { name: "Oldest", ageMinutes: 30 },
      { name: "Middle", ageMinutes: 20, isRead: true },
      { name: "Newest", ageMinutes: 10 }
    ]);
    const { items, meta } = await list(notifications);
    expect(items.map((i) => i.params.appName)).toEqual([
      "Newest",
      "Middle",
      "Oldest"
    ]);
    expect(meta).toMatchObject({ total: 3, page: 1, totalPages: 1 });
    expect(items.map((i) => i.id).sort()).toEqual([...ids].sort());
    for (const i of items) {
      expect(i).toMatchObject({ type: "APP_AVAILABLE", category: "app" });
      // Text is never stored: the client renders the type in its locale.
      expect(i).not.toHaveProperty("title");
      expect(i).not.toHaveProperty("message");
      expect(i).not.toHaveProperty("dedupeKey");
      expect(typeof i.isRead).toBe("boolean");
      expect(i.isRead ? i.readAt : null).toEqual(
        i.isRead ? expect.any(String) : null
      );
    }
    const asc = await list(notifications, { sortOrder: "asc" });
    expect(asc.items.map((i) => i.params.appName)).toEqual([
      "Oldest",
      "Middle",
      "Newest"
    ]);
  }
);

test(
  "The type filter narrows the list and combines with isRead",
  { tag: "@TC-NOTIFICATIONS-038" },
  async ({ newApi }) => {
    const { notifications } = await owner(newApi, "notif-category", [
      { name: "App one" },
      { name: "App two", isRead: true },
      {
        name: "anomaly",
        type: "LOGIN_ANOMALY",
        params: {
          reason: "device",
          browser: "Safari",
          os: "macOS",
          country: "VN"
        }
      },
      {
        name: "locked",
        type: "ACCOUNT_LOCKED",
        params: { minutes: 30 },
        isRead: true
      }
    ]);
    const security = await list(notifications, { category: "security" });
    expect(security.meta.total).toBe(2);
    expect(security.items.every((i) => i.category === "security")).toBe(true);
    const app = await list(notifications, { category: "app" });
    expect(app.items.map((i) => i.params.appName).sort()).toEqual([
      "App one",
      "App two"
    ]);
    const unreadSecurity = await list(notifications, {
      category: "security",
      isRead: false
    });
    expect(unreadSecurity.items.map((i) => i.type)).toEqual(["LOGIN_ANOMALY"]);
    expect((await list(notifications, { category: "system" })).items).toEqual(
      []
    );
    for (const category of ["bogus", "SECURITY", ""]) {
      const res = await notifications.list({ category });
      expect(res.status(), `category=${category}`).toBe(400);
    }
  }
);

test(
  "The account filter returns access changes only",
  { tag: "@TC-NOTIFICATIONS-057" },
  async ({ newApi }) => {
    const { notifications } = await owner(newApi, "notif-account", [
      {
        name: "granted",
        type: "ENTITLEMENT_GRANTED",
        params: { appName: "G" }
      },
      {
        name: "revoked",
        type: "ENTITLEMENT_REVOKED",
        params: { appName: "R" },
        isRead: true
      },
      { name: "App one" },
      {
        name: "locked",
        type: "ACCOUNT_LOCKED",
        params: { minutes: 30 }
      }
    ]);
    const account = await list(notifications, { category: "account" });
    expect(account.meta.total).toBe(2);
    expect(account.items.map((i) => i.type).sort()).toEqual([
      "ENTITLEMENT_GRANTED",
      "ENTITLEMENT_REVOKED"
    ]);
    expect(account.items.every((i) => i.category === "account")).toBe(true);
    const unreadAccount = await list(notifications, {
      category: "account",
      isRead: false
    });
    expect(unreadAccount.items.map((i) => i.type)).toEqual([
      "ENTITLEMENT_GRANTED"
    ]);
  }
);

test(
  "Read filter and unread count agree",
  { tag: "@TC-NOTIFICATIONS-031" },
  async ({ newApi }) => {
    const { notifications } = await owner(newApi, "notif-split", [
      { name: "U1" },
      { name: "U2" },
      { name: "R1", isRead: true }
    ]);
    const u = await list(notifications, { isRead: false });
    const r = await list(notifications, { isRead: true });
    expect(u.items.every((i) => !i.isRead)).toBe(true);
    expect(r.items.every((i) => i.isRead)).toBe(true);
    expect(u.meta.total).toBe(2);
    expect(r.meta.total).toBe(1);
    expect(await unreadCount(notifications)).toBe(2);
  }
);

test(
  "Paging boundaries and query validation",
  { tag: "@TC-NOTIFICATIONS-032" },
  async ({ newApi }) => {
    const { notifications } = await owner(
      newApi,
      "notif-paging",
      Array.from({ length: 21 }, (_, i) => ({ name: `P${i}`, ageMinutes: i }))
    );
    // Default limit is 20: 21 rows → 2 pages, the last holds 1.
    const p1 = await list(notifications);
    expect(p1.items).toHaveLength(20);
    expect(p1.meta).toMatchObject({ total: 21, limit: 20, totalPages: 2 });
    expect((await list(notifications, { page: 2 })).items).toHaveLength(1);
    expect((await list(notifications, { page: 3 })).items).toEqual([]);

    for (const [query, status] of [
      [{ page: 0 }, 400],
      [{ page: "abc" }, 400],
      [{ limit: 0 }, 400],
      [{ limit: 1 }, 200],
      [{ limit: 100 }, 200],
      [{ limit: 101 }, 400],
      [{ isRead: "maybe" }, 400],
      [{ category: "bogus" }, 400],
      [{ sortOrder: "sideways" }, 400]
    ] as const) {
      const res = await notifications.list(query);
      expect(res.status(), JSON.stringify(query)).toBe(status);
    }
  }
);

test(
  "Marking one read is idempotent",
  { tag: ["@TC-NOTIFICATIONS-033", "@smoke"] },
  async ({ newApi }) => {
    const { notifications, ids } = await owner(newApi, "notif-mark", [
      { name: "A" },
      { name: "B" }
    ]);
    expect(await unreadCount(notifications)).toBe(2);
    const res = await notifications.markRead(ids[0]);
    expect(res.status()).toBe(200);
    const { data } = (await res.json()) as { data: NotificationItem };
    expect(data).toMatchObject({ id: ids[0], isRead: true });
    expect(data.readAt).toBeTruthy();
    expect(await unreadCount(notifications)).toBe(1);

    // Again: still 200, still read, count unchanged.
    expect((await notifications.markRead(ids[0])).status()).toBe(200);
    expect(await unreadCount(notifications)).toBe(1);
    expect(
      (await list(notifications, { isRead: true })).items.map((i) => i.id)
    ).toEqual([ids[0]]);
  }
);

test("Mark all read", { tag: "@TC-NOTIFICATIONS-034" }, async ({ newApi }) => {
  const { notifications } = await owner(newApi, "notif-all", [
    { name: "A" },
    { name: "B" },
    { name: "C", isRead: true }
  ]);
  const first = await notifications.markAllRead();
  expect(first.status()).toBe(200);
  expect((await first.json()).data).toMatchObject({ updated: 2 });
  expect(await unreadCount(notifications)).toBe(0);

  const again = await notifications.markAllRead();
  expect((await again.json()).data).toMatchObject({ updated: 0 });
  expect((await list(notifications, { isRead: false })).items).toEqual([]);
});

test(
  "Notifications are private to each user",
  { tag: ["@TC-NOTIFICATIONS-035", "@smoke"] },
  async ({ newApi }) => {
    const alice = await owner(newApi, "notif-alice", [{ name: "Alice only" }]);
    const bob = await owner(newApi, "notif-bob", [{ name: "Bob only" }]);
    expect(
      (await list(bob.notifications)).items.map((i) => i.params.appName)
    ).toEqual(["Bob only"]);
    const cross = await bob.notifications.markRead(alice.ids[0]);
    expect(cross.status()).toBe(404);
    await bob.notifications.markAllRead();
    expect(await unreadCount(alice.notifications)).toBe(1);
    expect((await list(alice.notifications)).items[0].isRead).toBe(false);
  }
);

test(
  "Another user's id is answered exactly like an unknown id",
  { tag: "@TC-NOTIFICATIONS-058" },
  async ({ newApi }) => {
    const alice = await owner(newApi, "notif-enum-a", [{ name: "Alice only" }]);
    const bob = await owner(newApi, "notif-enum-b", [{ name: "Bob only" }]);
    const foreign = await bob.notifications.markRead(alice.ids[0]);
    const unknown = await bob.notifications.markRead(ZERO_ID);
    expect(foreign.status()).toBe(404);
    expect(unknown.status()).toBe(404);
    const expected = {
      code: "NOTIFICATION_NOT_FOUND",
      message: serverMessage.notification.errors.notFound
    };
    expect(await errorOf(foreign)).toMatchObject(expected);
    expect(await errorOf(unknown)).toMatchObject(expected);
  }
);

test(
  "List items never expose their owner",
  { tag: "@TC-NOTIFICATIONS-059" },
  async ({ newApi }) => {
    const { notifications } = await owner(newApi, "notif-fields", [
      { name: "Unread" },
      { name: "Read", isRead: true }
    ]);
    const { items } = await list(notifications);
    expect(items).toHaveLength(2);
    for (const i of items) expect(Object.keys(i).sort()).toEqual(ITEM_FIELDS);
  }
);

test("Id validation", { tag: "@TC-NOTIFICATIONS-036" }, async ({ newApi }) => {
  const { notifications } = await signedIn(newApi, USER.email, USER.password);
  expect((await notifications.markRead("not-an-id")).status()).toBe(400);
  const unknown = await notifications.markRead(ZERO_ID);
  expect(unknown.status()).toBe(404);
  expect((await errorOf(unknown)).code).toBeTruthy();
});

test(
  "Every endpoint requires a session",
  { tag: ["@TC-NOTIFICATIONS-037", "@smoke"] },
  async ({ newApi }) => {
    const { notifications } = await newApi();
    expect((await notifications.list()).status()).toBe(401);
    expect((await notifications.unreadCount()).status()).toBe(401);
    expect((await notifications.markAllRead()).status()).toBe(401);
    expect((await notifications.markRead(ZERO_ID)).status()).toBe(401);
  }
);
