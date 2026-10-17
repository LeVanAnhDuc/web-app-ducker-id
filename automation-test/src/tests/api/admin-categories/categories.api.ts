import { test, expect } from "@/fixtures";
import type { APIRequestContext } from "@playwright/test";
import { createApiClient, type ApiClient } from "@/api";
import type {
  AdminCategory,
  DeleteImpact
} from "@/api/admin-categories.client";
import type { CatalogPage } from "@/api/web-app.client";
import { dataOf, errorOf } from "@/api/response";
import { adminContext } from "@/api/session";
import { serverMessage, serverMessageVi } from "@/data/copy";
import { UNKNOWN_CATEGORY_ID } from "@/data/test-data";
import {
  appByName,
  categoryBySlug,
  createCategory,
  listAdminCategories,
  moveCategory,
  removeE2ECategories,
  restoreAppCategories,
  setAppCategories,
  snapshotAppCategories,
  uniqueName
} from "@/utils/categories";

test.use({ role: "admin" });

// /admin/categories and /apps/categories — contract, tampered input and races
// (REQ-ADMINCATEGORIES-01 … REQ-ADMINCATEGORIES-04, REQ-ADMINAPPS-02).
// Test cases: test-cases/admin-categories.md (TC-ADMINCATEGORIES-048 … -067,
// -074 … -076, -078, -079). Every category is "E2E …" and removed in afterAll; borrowed
// apps are restored.

test.describe.configure({ mode: "serial" });

const EN = { "Accept-Language": "en" };

let ctx: APIRequestContext;
let api: ApiClient;
let snapshot: Map<string, string[]>;
let contentId: string;
let identityId: string;
let productivityId: string;

test.beforeAll(async () => {
  ctx = await adminContext();
  api = createApiClient(ctx);
  snapshot = await snapshotAppCategories(api);
  contentId = (await categoryBySlug(api, "content"))._id;
  identityId = (await categoryBySlug(api, "identity"))._id;
  productivityId = (await categoryBySlug(api, "productivity"))._id;
});

test.afterAll(async () => {
  await restoreAppCategories(api, snapshot);
  await removeE2ECategories(api, contentId);
  await ctx.dispose();
});

const categories = () => api.adminCategories;

test(
  "The public list exposes only id, slug and name",
  { tag: ["@TC-ADMINCATEGORIES-048", "@smoke"] },
  async ({ api: publicApi }) => {
    const res = await publicApi.categories.listPublic();
    expect(res.status()).toBe(200);
    expect(res.headers()["cache-control"]).toContain("max-age=60");
    const data = await dataOf<Record<string, unknown>[]>(res);
    for (const category of data) {
      expect(Object.keys(category).sort()).toEqual(["_id", "name", "slug"]);
    }
  }
);

test(
  "App DTOs carry categories in the admin's order",
  { tag: "@TC-ADMINCATEGORIES-049" },
  async () => {
    await setAppCategories(api, "notes", [identityId, contentId]);
    const res = await api.webApps.list({ search: "notes" });
    const data = await dataOf<CatalogPage>(res);
    const notes = data.items.find((a) => a.displayName === "Notes");
    expect(notes?.categories.map((c) => c._id)).toEqual([
      identityId,
      contentId
    ]);
    for (const category of notes?.categories ?? []) {
      expect(Object.keys(category).sort()).toEqual(["_id", "name", "slug"]);
    }
  }
);

test.describe("tampered create / update", () => {
  test(
    "Slug and sortOrder in a create body are ignored",
    { tag: ["@TC-ADMINCATEGORIES-050", "@smoke"] },
    async () => {
      const res = await categories().create({
        name: { en: uniqueName("Tamper"), vi: "x" },
        slug: "hacked",
        sortOrder: -5
      });
      expect(res.status()).toBe(201);
      const data = await dataOf<AdminCategory>(res);
      expect(data.slug).not.toBe("hacked");
      expect(data.sortOrder).toBeGreaterThanOrEqual(0);
    }
  );

  test.describe("PATCH with an empty or blank body is refused", () => {
    for (const [label, body] of [
      ["empty body", {}],
      ["empty name", { name: {} }],
      ["whitespace vi", { name: { vi: "   " } }]
    ] as const) {
      test(
        `PATCH with ${label} → 400`,
        { tag: "@TC-ADMINCATEGORIES-051" },
        async () => {
          const created = await createCategory(api, {
            en: uniqueName("Patch"),
            vi: "p"
          });
          const res = await categories().update(created._id, body);
          expect(res.status()).toBe(400);
        }
      );
    }
  });

  test(
    "A zero-width duplicate of an existing name is a conflict",
    { tag: "@TC-ADMINCATEGORIES-052" },
    async () => {
      const res = await categories().create({
        name: { en: "Con​tent", vi: "x" }
      });
      expect(res.status()).toBe(409);
    }
  );

  test(
    "An emoji-only English name is refused",
    { tag: "@TC-ADMINCATEGORIES-053" },
    async () => {
      const res = await categories().create({ name: { en: "🚀🚀", vi: "x" } });
      expect(res.status()).toBe(400);
    }
  );

  test(
    "Two 100-character names with the same slug both save, the second suffixed",
    { tag: "@TC-ADMINCATEGORIES-054" },
    async () => {
      const base = `E2E ${"q".repeat(94)}`;
      const a = await categories().create({
        name: { en: `${base}!a`, vi: "a" }
      });
      const b = await categories().create({
        name: { en: `${base}?a`, vi: "b" }
      });
      expect(a.status()).toBe(201);
      expect(b.status()).toBe(201);
      const slugB = (await dataOf<AdminCategory>(b)).slug;
      expect(slugB.length).toBeLessThanOrEqual(100);
      expect(slugB).toMatch(/-2$/);
    }
  );

  test(
    "Malformed id, unknown id and bad direction",
    { tag: "@TC-ADMINCATEGORIES-055" },
    async () => {
      expect((await categories().deleteImpact("garbage")).status()).toBe(400);
      expect(
        (await categories().deleteImpact(UNKNOWN_CATEGORY_ID)).status()
      ).toBe(404);
      expect((await categories().move(contentId, "sideways")).status()).toBe(
        400
      );
    }
  );
});

test.describe("The admin list is complete, ordered and ignores pagination", () => {
  test(
    "list ignores pagination params",
    { tag: "@TC-ADMINCATEGORIES-056" },
    async () => {
      const all = await listAdminCategories(api);
      const res = await categories().list({ page: 2, limit: 1 });
      expect((await dataOf<unknown[]>(res)).length).toBe(all.length);
    }
  );

  test(
    "the admin list returns every category in sortOrder with its app count",
    { tag: "@TC-ADMINCATEGORIES-056" },
    async () => {
      const list = await listAdminCategories(api);
      expect(list.length).toBeGreaterThanOrEqual(4);
      for (const category of list) {
        expect(Object.keys(category).sort()).toEqual(
          ["_id", "appCount", "name", "slug", "sortOrder"].sort()
        );
        expect(Object.keys(category.name).sort()).toEqual(["en", "vi"]);
        expect(category.appCount).toBeGreaterThanOrEqual(0);
      }
      const orders = list.map((c) => c.sortOrder);
      expect(orders).toEqual([...orders].sort((a, b) => a - b));
    }
  );
});

test.describe("tampered delete", () => {
  test(
    "Reassigning an app that still has another category is refused untouched",
    { tag: ["@TC-ADMINCATEGORIES-057", "@smoke"] },
    async () => {
      const temp = await createCategory(api, {
        en: uniqueName("Idor"),
        vi: "x"
      });
      await setAppCategories(api, "notes", [contentId, temp._id]);
      const notes = await appByName(api, "notes");
      const res = await categories().remove(temp._id, {
        reassignments: [{ appId: notes._id, categoryId: identityId }]
      });
      expect(res.status()).toBe(409);
      expect((await appByName(api, "notes")).categoryIds).toEqual([
        contentId,
        temp._id
      ]);
    }
  );

  test(
    "Deleting with orphans and no body is refused",
    { tag: "@TC-ADMINCATEGORIES-058" },
    async () => {
      const temp = await createCategory(api, {
        en: uniqueName("Required"),
        vi: "x"
      });
      await setAppCategories(api, "team-calendar", [temp._id]);
      const res = await categories().remove(temp._id);
      expect(res.status()).toBe(400);
      expect((await errorOf(res)).code).toBe("CATEGORY_REASSIGN_REQUIRED");
    }
  );

  test(
    "A target that is itself, malformed, or 501 entries is refused",
    { tag: "@TC-ADMINCATEGORIES-059" },
    async () => {
      const temp = await createCategory(api, {
        en: uniqueName("BadTarget"),
        vi: "x"
      });
      await setAppCategories(api, "team-calendar", [temp._id]);
      const app = await appByName(api, "team-calendar");
      const self = await categories().remove(temp._id, {
        reassignments: [{ appId: app._id, categoryId: temp._id }]
      });
      expect((await errorOf(self)).code).toBe("CATEGORY_REASSIGN_INVALID");
      const garbage = await categories().remove(temp._id, {
        reassignments: [{ appId: app._id, categoryId: "garbage" }]
      });
      expect(garbage.status()).toBe(400);
      const tooMany = await categories().remove(temp._id, {
        reassignments: Array.from({ length: 501 }, (_, i) => ({
          appId: i.toString(16).padStart(24, "0"),
          categoryId: contentId
        }))
      });
      expect(tooMany.status()).toBe(400);
    }
  );
});

test.describe("app categoryIds limits", () => {
  test(
    "An app's categoryIds: 0, 6, duplicates and unknown ids refused; 5 accepted",
    { tag: ["@TC-ADMINCATEGORIES-060", "@smoke"] },
    async () => {
      const extra = await Promise.all(
        [1, 2, 3].map((i) =>
          createCategory(api, { en: uniqueName(`Five${i}`), vi: `${i}` })
        )
      );
      const five = [contentId, identityId, ...extra.map((c) => c._id)];
      const app = await appByName(api, "notes");
      const patch = (categoryIds: string[]) =>
        api.adminApps.update(app._id, { categoryIds });

      expect((await patch([])).status()).toBe(400);
      expect((await patch([...five, UNKNOWN_CATEGORY_ID])).status()).toBe(400);
      expect((await patch([contentId, contentId])).status()).toBe(400);
      expect((await patch([UNKNOWN_CATEGORY_ID])).status()).toBe(400);
      expect((await patch(five)).status()).toBe(200);
    }
  );
});

test.describe("races", () => {
  test(
    "Two concurrent creates with the same name: one 201, one 409",
    { tag: "@TC-ADMINCATEGORIES-061" },
    async () => {
      const name = { en: uniqueName("Race"), vi: "x" };
      const statuses = (
        await Promise.all([
          categories().create({ name }),
          categories().create({ name })
        ])
      )
        .map((r) => r.status())
        .sort();
      expect(statuses).toEqual([201, 409]);
    }
  );

  test(
    "Two concurrent creates with the same slug both save, one suffixed",
    { tag: "@TC-ADMINCATEGORIES-062" },
    async () => {
      const base = uniqueName("Slugrace");
      const [a, b] = await Promise.all([
        categories().create({ name: { en: `${base}!`, vi: "a" } }),
        categories().create({ name: { en: `${base}?`, vi: "b" } })
      ]);
      expect([a.status(), b.status()]).toEqual([201, 201]);
      const slugs = [
        (await dataOf<AdminCategory>(a)).slug,
        (await dataOf<AdminCategory>(b)).slug
      ].sort();
      expect(slugs[1]).toBe(`${slugs[0]}-2`);
    }
  );
});

test.describe("contract gaps", () => {
  test(
    "Names of 100 characters are accepted and 101 refused by the API",
    { tag: "@TC-ADMINCATEGORIES-063" },
    async () => {
      const en100 = `E2E ${"m".repeat(90)}${Date.now().toString(36)}`.slice(
        0,
        100
      );
      expect(en100).toHaveLength(100);
      const ok = await categories().create({
        name: { en: en100, vi: "v".repeat(100) }
      });
      expect(ok.status()).toBe(201);
      expect(
        (
          await categories().create({ name: { en: `${en100}x`, vi: "v" } })
        ).status()
      ).toBe(400);
      expect(
        (
          await categories().create({
            name: { en: uniqueName("ViLong"), vi: "v".repeat(101) }
          })
        ).status()
      ).toBe(400);
      expect(
        (
          await categories().create({ name: { en: uniqueName("NoVi") } })
        ).status()
      ).toBe(400);
    }
  );

  test(
    "The slug folds accents, symbols and emoji",
    { tag: "@TC-ADMINCATEGORIES-064" },
    async () => {
      const tag = Date.now().toString(36);
      const cases: [string, string][] = [
        [`E2E Phân Tích ${tag}`, `e2e-phan-tich-${tag}`],
        [`E2E R&D / Ops ${tag}`, `e2e-r-d-ops-${tag}`],
        [`E2E Apps 🚀 ${tag}`, `e2e-apps-${tag}`],
        [`E2E Đa dạng ${tag}`, `e2e-da-dang-${tag}`]
      ];
      for (const [en, slug] of cases) {
        const created = await createCategory(api, { en, vi: "x" });
        expect(created.slug, en).toBe(slug);
      }
    }
  );

  test(
    "Renaming onto another category's English name is a conflict",
    { tag: "@TC-ADMINCATEGORIES-065" },
    async () => {
      const created = await createCategory(api, {
        en: uniqueName("Clash"),
        vi: "x"
      });
      const res = await categories().update(created._id, {
        name: { en: "IDENTITY" }
      });
      expect(res.status()).toBe(409);
      const after = (await listAdminCategories(api)).find(
        (c) => c._id === created._id
      );
      expect(after?.name.en).toBe(created.name.en);
      expect(after?.slug).toBe(created.slug);
    }
  );

  test(
    "Reassigning an outside or unknown app is a conflict; a duplicated app is refused",
    { tag: "@TC-ADMINCATEGORIES-066" },
    async () => {
      const temp = await createCategory(api, {
        en: uniqueName("Outside"),
        vi: "x"
      });
      await setAppCategories(api, "team-calendar", [temp._id]);
      const calendar = await appByName(api, "team-calendar");
      const blog = await appByName(api, "blog");

      const outsider = await categories().remove(temp._id, {
        reassignments: [
          { appId: calendar._id, categoryId: contentId },
          { appId: blog._id, categoryId: contentId }
        ]
      });
      expect(outsider.status()).toBe(409);

      const ghost = await categories().remove(temp._id, {
        reassignments: [
          { appId: calendar._id, categoryId: contentId },
          { appId: UNKNOWN_CATEGORY_ID, categoryId: contentId }
        ]
      });
      expect(ghost.status()).toBe(409);

      const duplicated = await categories().remove(temp._id, {
        reassignments: [
          { appId: calendar._id, categoryId: contentId },
          { appId: calendar._id, categoryId: identityId }
        ]
      });
      expect(duplicated.status()).toBe(400);

      // nothing was deleted or moved by the refused calls
      expect(
        (await listAdminCategories(api)).some((c) => c._id === temp._id)
      ).toBe(true);
      expect((await appByName(api, "team-calendar")).categoryIds).toEqual([
        temp._id
      ]);
      expect((await appByName(api, "blog")).categoryIds).toEqual(
        snapshot.get("blog")
      );
    }
  );

  test(
    "Moving past either end changes nothing",
    { tag: "@TC-ADMINCATEGORIES-067" },
    async () => {
      const before = (await listAdminCategories(api)).map((c) => c._id);
      const first = await moveCategory(api, before[0], "up");
      expect(first.status()).toBe(200);
      const last = await moveCategory(api, before[before.length - 1], "down");
      expect(last.status()).toBe(200);
      expect((await listAdminCategories(api)).map((c) => c._id)).toEqual(
        before
      );
    }
  );
});

test.describe("delete and error contract", () => {
  test(
    "Unknown ids are 404 CATEGORY_NOT_FOUND on update, move and delete",
    { tag: "@TC-ADMINCATEGORIES-074" },
    async () => {
      const calls = [
        categories().update(UNKNOWN_CATEGORY_ID, { name: { vi: "x" } }, EN),
        categories().move(UNKNOWN_CATEGORY_ID, "up", EN),
        categories().remove(UNKNOWN_CATEGORY_ID, { reassignments: [] }, EN)
      ];
      for (const res of await Promise.all(calls)) {
        expect(res.status(), res.url()).toBe(404);
        const err = await errorOf(res);
        expect(err.code).toBe("CATEGORY_NOT_FOUND");
        expect(err.message).toBe(serverMessage.category.errors.notFound);
      }
    }
  );

  test(
    "A refused create carries its error code and the message in the caller's language",
    { tag: "@TC-ADMINCATEGORIES-075" },
    async () => {
      const body = { name: { en: "content", vi: "x" } };
      const en = await categories().create(body, EN);
      expect(en.status()).toBe(409);
      expect(await errorOf(en)).toMatchObject({
        code: "CATEGORY_NAME_TAKEN",
        message: serverMessage.category.errors.nameTaken
      });
      const vi = await categories().create(body, { "Accept-Language": "vi" });
      expect(vi.status()).toBe(409);
      expect(await errorOf(vi)).toMatchObject({
        code: "CATEGORY_NAME_TAKEN",
        message: serverMessageVi.category.errors.nameTaken
      });
    }
  );

  test(
    "A delete answers 204, lists the impact first and moves every orphan",
    { tag: "@TC-ADMINCATEGORIES-076" },
    async () => {
      const temp = await createCategory(api, {
        en: uniqueName("Gone204"),
        vi: "x"
      });
      await setAppCategories(api, "team-calendar", [temp._id]);
      await setAppCategories(api, "notes", [productivityId, temp._id]);
      const calendar = await appByName(api, "team-calendar");

      const impactRes = await categories().deleteImpact(temp._id);
      expect(impactRes.status()).toBe(200);
      const impact = await dataOf<DeleteImpact>(impactRes);
      expect(impact.total).toBe(2);
      expect(impact.orphaned).toEqual([
        { _id: calendar._id, displayName: "Team Calendar" }
      ]);

      const res = await categories().remove(temp._id, {
        reassignments: [{ appId: calendar._id, categoryId: contentId }]
      });
      expect(res.status()).toBe(204);
      expect(
        (await listAdminCategories(api)).some((c) => c._id === temp._id)
      ).toBe(false);
      expect((await appByName(api, "team-calendar")).categoryIds).toEqual([
        contentId
      ]);
      expect((await appByName(api, "notes")).categoryIds).toEqual([
        productivityId
      ]);
      expect((await categories().deleteImpact(temp._id)).status()).toBe(404);
    }
  );

  test.describe("Delete refusals carry the documented error codes", () => {
    test(
      "an unknown target category is CATEGORY_REASSIGN_INVALID",
      { tag: "@TC-ADMINCATEGORIES-078" },
      async () => {
        const temp = await createCategory(api, {
          en: uniqueName("NoTarget"),
          vi: "x"
        });
        await setAppCategories(api, "team-calendar", [temp._id]);
        const calendar = await appByName(api, "team-calendar");
        const res = await categories().remove(
          temp._id,
          {
            reassignments: [
              { appId: calendar._id, categoryId: UNKNOWN_CATEGORY_ID }
            ]
          },
          EN
        );
        expect(res.status()).toBe(400);
        expect(await errorOf(res)).toMatchObject({
          code: "CATEGORY_REASSIGN_INVALID",
          message: serverMessage.category.errors.reassignInvalid
        });
      }
    );

    test(
      "the same app twice is CATEGORY_REASSIGN_INVALID",
      { tag: "@TC-ADMINCATEGORIES-078" },
      async () => {
        // A duplicated appId is refused by the Joi schema (unique("appId")) as a generic VALIDATION_ERROR, not the documented CATEGORY_REASSIGN_INVALID.
        // BUG: defects/admin-categories.md#bug-admincategories-02
        test.fail();
        const temp = await createCategory(api, {
          en: uniqueName("TwiceApp"),
          vi: "x"
        });
        await setAppCategories(api, "team-calendar", [temp._id]);
        const calendar = await appByName(api, "team-calendar");
        const res = await categories().remove(
          temp._id,
          {
            reassignments: [
              { appId: calendar._id, categoryId: contentId },
              { appId: calendar._id, categoryId: identityId }
            ]
          },
          EN
        );
        expect(res.status()).toBe(400);
        expect((await errorOf(res)).code).toBe("CATEGORY_REASSIGN_INVALID");
      }
    );

    test(
      "an app that is not an orphan of it is CATEGORY_IMPACT_CHANGED",
      { tag: "@TC-ADMINCATEGORIES-078" },
      async () => {
        const temp = await createCategory(api, {
          en: uniqueName("Changed409"),
          vi: "x"
        });
        await setAppCategories(api, "team-calendar", [temp._id]);
        const calendar = await appByName(api, "team-calendar");
        const blog = await appByName(api, "blog");
        const res = await categories().remove(
          temp._id,
          {
            reassignments: [
              { appId: calendar._id, categoryId: contentId },
              { appId: blog._id, categoryId: contentId }
            ]
          },
          EN
        );
        expect(res.status()).toBe(409);
        expect(await errorOf(res)).toMatchObject({
          code: "CATEGORY_IMPACT_CHANGED",
          message: serverMessage.category.errors.impactChanged
        });
      }
    );
  });

  test(
    "Changing only the letter case of the English name keeps the slug",
    { tag: "@TC-ADMINCATEGORIES-079" },
    async () => {
      const created = await createCategory(api, {
        en: uniqueName("Casing"),
        vi: "x"
      });
      const res = await categories().update(created._id, {
        name: { en: created.name.en.toUpperCase() }
      });
      expect(res.status()).toBe(200);
      const data = await dataOf<AdminCategory>(res);
      expect(data.name.en).toBe(created.name.en.toUpperCase());
      expect(data.slug).toBe(created.slug);
    }
  );
});
