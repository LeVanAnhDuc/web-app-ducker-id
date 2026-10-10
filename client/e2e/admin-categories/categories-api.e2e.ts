import { test, expect } from "@playwright/test";
import {
  CategoryApi,
  CATEGORIES_API,
  PUBLIC_CATEGORIES_API,
  uniqueName
} from "../helpers/categories";

// Feature `category-management` — API contract with tampered input and races.
// Matrix rows: 3 (public shape), 4-API (EP / tampered), 6 (limits), 11
// (concurrency, IDOR-style reassignment). Every category is "E2E …" and
// removed in afterAll; borrowed apps are restored.

test.describe.configure({ mode: "serial" });

let api: CategoryApi;
let snapshot: Map<string, string[]>;
let contentId: string;
let identityId: string;
const ZERO_ID = "000000000000000000000000";

test.beforeAll(async () => {
  api = await CategoryApi.login();
  snapshot = await api.snapshotApps();
  contentId = (await api.bySlug("content"))._id;
  identityId = (await api.bySlug("identity"))._id;
});

test.afterAll(async () => {
  await api.restoreApps(snapshot);
  await api.removeAllE2E(contentId);
  await api.dispose();
});

test("public list exposes only _id, slug and name [row 3]", async ({
  request
}) => {
  const res = await request.get(PUBLIC_CATEGORIES_API);
  expect(res.status()).toBe(200);
  expect(res.headers()["cache-control"]).toContain("max-age=60");
  const { data } = (await res.json()) as { data: Record<string, unknown>[] };
  for (const category of data) {
    expect(Object.keys(category).sort()).toEqual(["_id", "name", "slug"]);
  }
});

test("app DTOs carry categories in the admin's order [row 3, 8]", async () => {
  await api.setAppCategories("notes", [identityId, contentId]);
  const res = await api.raw.get("/api/v1/apps?search=notes");
  const { data } = (await res.json()) as {
    data: {
      items: { displayName: string; categories: Record<string, unknown>[] }[];
    };
  };
  const notes = data.items.find((a) => a.displayName === "Notes");
  expect(notes?.categories.map((c) => c._id)).toEqual([identityId, contentId]);
  for (const category of notes?.categories ?? []) {
    expect(Object.keys(category).sort()).toEqual(["_id", "name", "slug"]);
  }
});

test.describe("tampered create / update [row 4]", () => {
  test("slug and sortOrder in the body are ignored", async () => {
    const res = await api.raw.post(CATEGORIES_API, {
      name: { en: uniqueName("Tamper"), vi: "x" },
      slug: "hacked",
      sortOrder: -5
    });
    expect(res.status()).toBe(201);
    const { data } = await res.json();
    expect(data.slug).not.toBe("hacked");
    expect(data.sortOrder).toBeGreaterThanOrEqual(0);
  });

  for (const [label, body] of [
    ["empty body", {}],
    ["empty name", { name: {} }],
    ["whitespace vi", { name: { vi: "   " } }]
  ] as const) {
    test(`PATCH with ${label} → 400`, async () => {
      const created = await api.create({ en: uniqueName("Patch"), vi: "p" });
      const res = await api.raw.patch(`${CATEGORIES_API}/${created._id}`, body);
      expect(res.status()).toBe(400);
    });
  }

  test("zero-width duplicate of an existing name → 409", async () => {
    const res = await api.raw.post(CATEGORIES_API, {
      name: { en: "Con​tent", vi: "x" }
    });
    expect(res.status()).toBe(409);
  });

  test("emoji-only English name → 400", async () => {
    const res = await api.raw.post(CATEGORIES_API, {
      name: { en: "🚀🚀", vi: "x" }
    });
    expect(res.status()).toBe(400);
  });

  test("[BVA] two 100-char names with the same slug both succeed, slug ≤ 100", async () => {
    const base = `E2E ${"q".repeat(94)}`;
    const a = await api.raw.post(CATEGORIES_API, {
      name: { en: `${base}!a`, vi: "a" }
    });
    const b = await api.raw.post(CATEGORIES_API, {
      name: { en: `${base}?a`, vi: "b" }
    });
    expect(a.status()).toBe(201);
    expect(b.status()).toBe(201);
    const slugB = (await b.json()).data.slug as string;
    expect(slugB.length).toBeLessThanOrEqual(100);
    expect(slugB).toMatch(/-2$/);
  });

  test("bad id → 400, unknown id → 404, bad direction → 400", async () => {
    expect(
      (await api.raw.get(`${CATEGORIES_API}/garbage/delete-impact`)).status()
    ).toBe(400);
    expect(
      (await api.raw.get(`${CATEGORIES_API}/${ZERO_ID}/delete-impact`)).status()
    ).toBe(404);
    expect((await api.move(contentId, "sideways" as "up")).status()).toBe(400);
  });

  test("list ignores pagination params", async () => {
    const all = await api.list();
    const res = await api.raw.get(`${CATEGORIES_API}?page=2&limit=1`);
    expect(((await res.json()).data as unknown[]).length).toBe(all.length);
  });
});

test.describe("tampered delete [row 4, 11]", () => {
  test("an appId that still has another category → 409 and the app is untouched", async () => {
    const temp = await api.create({ en: uniqueName("Idor"), vi: "x" });
    await api.setAppCategories("notes", [contentId, temp._id]);
    const notes = await api.app("notes");
    const res = await api.raw.delete(`${CATEGORIES_API}/${temp._id}`, {
      reassignments: [{ appId: notes._id, categoryId: identityId }]
    });
    expect(res.status()).toBe(409);
    expect((await api.app("notes")).categoryIds).toEqual([contentId, temp._id]);
  });

  test("no body while orphans exist → 400 REASSIGN_REQUIRED", async () => {
    const temp = await api.create({ en: uniqueName("Required"), vi: "x" });
    await api.setAppCategories("team-calendar", [temp._id]);
    const res = await api.raw.delete(`${CATEGORIES_API}/${temp._id}`);
    expect(res.status()).toBe(400);
    expect((await res.json()).code).toBe("CATEGORY_REASSIGN_REQUIRED");
  });

  test("target = itself or not an ObjectId or 501 entries → 400", async () => {
    const temp = await api.create({ en: uniqueName("BadTarget"), vi: "x" });
    await api.setAppCategories("team-calendar", [temp._id]);
    const app = await api.app("team-calendar");
    const self = await api.raw.delete(`${CATEGORIES_API}/${temp._id}`, {
      reassignments: [{ appId: app._id, categoryId: temp._id }]
    });
    expect((await self.json()).code).toBe("CATEGORY_REASSIGN_INVALID");
    const garbage = await api.raw.delete(`${CATEGORIES_API}/${temp._id}`, {
      reassignments: [{ appId: app._id, categoryId: "garbage" }]
    });
    expect(garbage.status()).toBe(400);
    const tooMany = await api.raw.delete(`${CATEGORIES_API}/${temp._id}`, {
      reassignments: Array.from({ length: 501 }, (_, i) => ({
        appId: i.toString(16).padStart(24, "0"),
        categoryId: contentId
      }))
    });
    expect(tooMany.status()).toBe(400);
  });
});

test.describe("app categoryIds limits [row 6]", () => {
  test("0, 6, duplicate and unknown ids are rejected; 5 is accepted", async () => {
    const extra = await Promise.all(
      [1, 2, 3].map((i) =>
        api.create({ en: uniqueName(`Five${i}`), vi: `${i}` })
      )
    );
    const five = [contentId, identityId, ...extra.map((c) => c._id)];
    const app = await api.app("notes");
    const patch = (categoryIds: string[]) =>
      api.raw.patch(`/api/v1/admin/apps/${app._id}`, { categoryIds });

    expect((await patch([])).status()).toBe(400);
    expect((await patch([...five, ZERO_ID])).status()).toBe(400);
    expect((await patch([contentId, contentId])).status()).toBe(400);
    expect((await patch([ZERO_ID])).status()).toBe(400);
    expect((await patch(five)).status()).toBe(200);
  });
});

test.describe("races [row 11]", () => {
  test("two creates with the same name → one 201, one 409, never 500", async () => {
    const name = { en: uniqueName("Race"), vi: "x" };
    const statuses = (
      await Promise.all([
        api.raw.post(CATEGORIES_API, { name }),
        api.raw.post(CATEGORIES_API, { name })
      ])
    )
      .map((r) => r.status())
      .sort();
    expect(statuses).toEqual([201, 409]);
  });

  test("two creates with the same slug → both 201, one suffixed", async () => {
    const base = uniqueName("Slugrace");
    const [a, b] = await Promise.all([
      api.raw.post(CATEGORIES_API, { name: { en: `${base}!`, vi: "a" } }),
      api.raw.post(CATEGORIES_API, { name: { en: `${base}?`, vi: "b" } })
    ]);
    expect([a.status(), b.status()]).toEqual([201, 201]);
    const slugs = [
      (await a.json()).data.slug,
      (await b.json()).data.slug
    ].sort();
    expect(slugs[1]).toBe(`${slugs[0]}-2`);
  });
});
