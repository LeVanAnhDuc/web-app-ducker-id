import { test, expect, apiAs } from "@fixtures";
import type { APIRequestContext } from "@playwright/test";
import { createAccount } from "@helpers/accounts";
import { insertNotifications } from "@helpers/notifications";

// /api/v1/notifications — list, read filter, paging, unread count, mark one,
// mark all, isolation between users and authorisation.
// Test cases: test-cases/notifications.md (TC-NOTIF-030 … 037).
//
// Notifications have no public producer, so each case seeds rows for a
// throwaway account directly in the database (insertNotifications); the
// cleanup project deletes the account and its rows. The seeded user's
// notifications are never marked here.

const N = "/api/v1/notifications";
const ZERO_ID = "ffffffffffffffffffffffff";

interface Item {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
}

async function owner(
  tag: string,
  items: Parameters<typeof insertNotifications>[1]
) {
  const account = await createAccount({ tag });
  const ids = await insertNotifications(account.email, items);
  const api = await apiAs(account.email, account.password);
  return { account, ids, api };
}

async function list(api: APIRequestContext, params = {}) {
  const res = await api.get(N, { params });
  expect(res.status(), await res.text()).toBe(200);
  return (
    (await res.json()) as {
      data: { items: Item[]; meta: Record<string, number> };
    }
  ).data;
}

async function unread(api: APIRequestContext) {
  const res = await api.get(`${N}/unread-count`);
  expect(res.status()).toBe(200);
  return ((await res.json()) as { data: { count: number } }).data.count;
}

test(
  "list contract: newest first, item fields and page meta",
  { tag: ["@TC-NOTIF-030", "@smoke"] },
  async () => {
    const { api, ids } = await owner("notif-contract", [
      { title: "Oldest", ageMinutes: 30 },
      { title: "Middle", ageMinutes: 20, isRead: true },
      { title: "Newest", ageMinutes: 10 }
    ]);
    try {
      const { items, meta } = await list(api);
      expect(items.map((i) => i.title)).toEqual(["Newest", "Middle", "Oldest"]);
      expect(meta).toMatchObject({ total: 3, page: 1, totalPages: 1 });
      expect(items.map((i) => i.id).sort()).toEqual([...ids].sort());
      for (const i of items) {
        expect(typeof i.message).toBe("string");
        expect(typeof i.isRead).toBe("boolean");
        expect(i.isRead ? i.readAt : null).toEqual(
          i.isRead ? expect.any(String) : null
        );
      }
      const asc = await list(api, { sortOrder: "asc" });
      expect(asc.items.map((i) => i.title)).toEqual([
        "Oldest",
        "Middle",
        "Newest"
      ]);
    } finally {
      await api.dispose();
    }
  }
);

test(
  "isRead splits the list and unread-count matches the unread side [EP]",
  { tag: "@TC-NOTIF-031" },
  async () => {
    const { api } = await owner("notif-split", [
      { title: "U1" },
      { title: "U2" },
      { title: "R1", isRead: true }
    ]);
    try {
      const u = await list(api, { isRead: false });
      const r = await list(api, { isRead: true });
      expect(u.items.every((i) => !i.isRead)).toBe(true);
      expect(r.items.every((i) => i.isRead)).toBe(true);
      expect(u.meta.total).toBe(2);
      expect(r.meta.total).toBe(1);
      expect(await unread(api)).toBe(2);
    } finally {
      await api.dispose();
    }
  }
);

test(
  "page / limit boundaries and query validation [BVA][EP]",
  { tag: "@TC-NOTIF-032" },
  async () => {
    const { api } = await owner(
      "notif-paging",
      Array.from({ length: 21 }, (_, i) => ({ title: `P${i}`, ageMinutes: i }))
    );
    try {
      // Default limit is 20: 21 rows → 2 pages, the last holds 1.
      const p1 = await list(api);
      expect(p1.items).toHaveLength(20);
      expect(p1.meta).toMatchObject({ total: 21, limit: 20, totalPages: 2 });
      expect((await list(api, { page: 2 })).items).toHaveLength(1);
      expect((await list(api, { page: 3 })).items).toEqual([]);

      for (const [params, status] of [
        [{ page: 0 }, 400],
        [{ page: "abc" }, 400],
        [{ limit: 0 }, 400],
        [{ limit: 1 }, 200],
        [{ limit: 100 }, 200],
        [{ limit: 101 }, 400],
        [{ isRead: "maybe" }, 400],
        [{ sortOrder: "sideways" }, 400]
      ] as const) {
        const res = await api.get(N, { params });
        expect(res.status(), JSON.stringify(params)).toBe(status);
      }
    } finally {
      await api.dispose();
    }
  }
);

test(
  "mark one read: unread → read, idempotent, count drops by one [ST]",
  { tag: ["@TC-NOTIF-033", "@smoke"] },
  async () => {
    const { api, ids } = await owner("notif-mark", [
      { title: "A" },
      { title: "B" }
    ]);
    try {
      expect(await unread(api)).toBe(2);
      const res = await api.patch(`${N}/${ids[0]}/read`);
      expect(res.status()).toBe(200);
      const { data } = (await res.json()) as { data: Item };
      expect(data).toMatchObject({ id: ids[0], isRead: true });
      expect(data.readAt).toBeTruthy();
      expect(await unread(api)).toBe(1);

      // Again: still 200, still read, count unchanged.
      expect((await api.patch(`${N}/${ids[0]}/read`)).status()).toBe(200);
      expect(await unread(api)).toBe(1);
      expect(
        (await list(api, { isRead: true })).items.map((i) => i.id)
      ).toEqual([ids[0]]);
    } finally {
      await api.dispose();
    }
  }
);

test(
  "mark all read: updates every unread row, then nothing [BVA]",
  { tag: "@TC-NOTIF-034" },
  async () => {
    const { api } = await owner("notif-all", [
      { title: "A" },
      { title: "B" },
      { title: "C", isRead: true }
    ]);
    try {
      const first = await api.patch(`${N}/read-all`);
      expect(first.status()).toBe(200);
      expect((await first.json()).data).toMatchObject({ updated: 2 });
      expect(await unread(api)).toBe(0);

      const again = await api.patch(`${N}/read-all`);
      expect((await again.json()).data).toMatchObject({ updated: 0 });
      expect((await list(api, { isRead: false })).items).toEqual([]);
    } finally {
      await api.dispose();
    }
  }
);

test(
  "a user can neither see nor mark another user's notifications",
  { tag: ["@TC-NOTIF-035", "@smoke"] },
  async () => {
    const alice = await owner("notif-alice", [{ title: "Alice only" }]);
    const bob = await owner("notif-bob", [{ title: "Bob only" }]);
    try {
      expect((await list(bob.api)).items.map((i) => i.title)).toEqual([
        "Bob only"
      ]);
      const cross = await bob.api.patch(`${N}/${alice.ids[0]}/read`);
      expect(cross.status()).toBe(404);
      await bob.api.patch(`${N}/read-all`);
      expect(await unread(alice.api)).toBe(1);
      expect((await list(alice.api)).items[0].isRead).toBe(false);
    } finally {
      await Promise.all([alice.api.dispose(), bob.api.dispose()]);
    }
  }
);

test(
  "id validation: malformed 400, unknown 404",
  { tag: "@TC-NOTIF-036" },
  async ({ userApi }) => {
    expect((await userApi.patch(`${N}/not-an-id/read`)).status()).toBe(400);
    const unknown = await userApi.patch(`${N}/${ZERO_ID}/read`);
    expect(unknown.status()).toBe(404);
    expect((await unknown.json()).code).toBeTruthy();
  }
);

test(
  "every endpoint requires a session",
  { tag: "@TC-NOTIF-037" },
  async ({ guestApi }) => {
    expect((await guestApi.get(N)).status()).toBe(401);
    expect((await guestApi.get(`${N}/unread-count`)).status()).toBe(401);
    expect((await guestApi.patch(`${N}/read-all`)).status()).toBe(401);
    expect((await guestApi.patch(`${N}/${ZERO_ID}/read`)).status()).toBe(401);
  }
);
