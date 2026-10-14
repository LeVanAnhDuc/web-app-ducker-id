import { test, expect } from "@/fixtures";
import { createApiClient, type ApiClient } from "@/api";
import type { AdminApp, AdminAppCreated } from "@/api/admin-apps.client";
import type { CatalogPage } from "@/api/web-app.client";
import { dataOf, errorOf } from "@/api/response";
import { EDIT_TARGET_APP, UNKNOWN_APP_ID } from "@/data/test-data";
import {
  adminAppBody,
  categoryIds,
  deleteE2EApps,
  e2eAppName,
  findAppDoc,
  listAdminApps
} from "@/utils/admin-apps";

test.use({ role: "admin" });

// /admin/apps — list, create and update contract (REQ-ADMINAPPS-01 …
// REQ-ADMINAPPS-05). Validation rules: server/src/validators/schemas/web-app.ts;
// redirect URI rules: isValidRedirectUri (server/src/modules/oauth/helpers).
// Test cases: test-cases/admin-apps.md (TC-ADMINAPPS-019, -020, -026 … -030,
// -032, -036, -054, -056, -061, -064, -065).
//
// Every app created here is `e2e-…`, inactive and admin-only unless a test
// needs otherwise, and is deleted from MongoDB after each test.

let admin: ApiClient;
let cats: string[];

test.beforeEach(async ({ adminApi }) => {
  admin = createApiClient(adminApi);
  cats = await categoryIds(admin);
  expect(cats.length).toBeGreaterThanOrEqual(4);
});

test.afterEach(async () => {
  await deleteE2EApps();
});

const create = (overrides: Record<string, unknown> = {}) =>
  admin.adminApps.create(adminAppBody([cats[0]], overrides));

test.describe("list", () => {
  test.describe("The list API returns the admin DTO, filters on the server and never leaks a secret", () => {
    test(
      "returns every app with the admin DTO and never a secret",
      { tag: ["@TC-ADMINAPPS-019", "@smoke"] },
      async () => {
        const res = await admin.adminApps.list();
        expect(res.status()).toBe(200);
        const items = await listAdminApps(admin);
        expect(items.length).toBeGreaterThanOrEqual(6);
        for (const app of items) {
          expect(Object.keys(app).sort()).toEqual(
            [
              "_id",
              "categoryIds",
              "clientId",
              "createdAt",
              "description",
              "displayName",
              "homeUrl",
              "iconUrl",
              "name",
              "postLogoutRedirectUris",
              "redirectUris",
              "requiredRoles",
              "status",
              "tokenEndpointAuthMethod",
              "updatedAt"
            ].sort()
          );
          expect(["active", "inactive"]).toContain(app.status);
        }
        expect(JSON.stringify(items)).not.toMatch(/clientSecret|\$2[aby]\$/);
      }
    );

    test(
      "[DT] status, categoryId and search filter on the server and combine",
      { tag: ["@TC-ADMINAPPS-019", "@smoke"] },
      async () => {
        const all = await listAdminApps(admin);
        const inactive = await listAdminApps(admin, { status: "inactive" });
        expect(inactive.every((a) => a.status === "inactive")).toBe(true);
        const active = await listAdminApps(admin, { status: "active" });
        expect(active.length + inactive.length).toBe(all.length);

        const someCategory = all[0].categoryIds[0];
        const inCategory = await listAdminApps(admin, {
          categoryId: someCategory
        });
        expect(inCategory.length).toBeGreaterThan(0);
        expect(
          inCategory.every((a) => a.categoryIds.includes(someCategory))
        ).toBe(true);

        // search hits name, displayName and description, case-insensitively
        expect(
          (await listAdminApps(admin, { search: "TEAM-CAL" })).map(
            (a) => a.name
          )
        ).toEqual(["team-calendar"]);
        expect(
          (await listAdminApps(admin, { search: "restricted to admin" })).map(
            (a) => a.name
          )
        ).toEqual(["ops-console"]);

        const combined = await listAdminApps(admin, {
          status: "inactive",
          search: "calendar"
        });
        expect(combined.map((a) => a.name)).toEqual(["team-calendar"]);
        expect(
          await listAdminApps(admin, {
            status: "active",
            search: "team-calendar"
          })
        ).toEqual([]);
      }
    );
  });

  test(
    "Bad list filters are refused and regex characters are literal",
    { tag: "@TC-ADMINAPPS-020" },
    async () => {
      expect((await admin.adminApps.list({ status: "paused" })).status()).toBe(
        400
      );
      expect(
        (await admin.adminApps.list({ categoryId: "garbage" })).status()
      ).toBe(400);

      // [Error Guessing] regex metacharacters are escaped, not evaluated
      for (const q of ["(", ".*", "[a-z]+", "\\"]) {
        const res = await admin.adminApps.list({ search: q });
        expect(res.status(), q).toBe(200);
      }
      expect(await listAdminApps(admin, { search: ".*" })).toEqual([]);

      // [BVA] search length: 200 (SEARCH_MAX_LENGTH) / 201
      expect(
        (await admin.adminApps.list({ search: "a".repeat(200) })).status()
      ).toBe(200);
      expect(
        (await admin.adminApps.list({ search: "a".repeat(201) })).status()
      ).toBe(400);
    }
  );

  test(
    "The admin list is not paginated and ignores unknown query keys",
    { tag: "@TC-ADMINAPPS-065" },
    async () => {
      const plain = await admin.adminApps.list();
      expect(plain.status()).toBe(200);
      const data = await dataOf<Record<string, unknown>>(plain);
      // `{ items }` only: no meta, no page count.
      expect(Object.keys(data)).toEqual(["items"]);
      const all = (data.items as AdminApp[]).map((a) => a._id).sort();

      // page / limit are not part of the query schema: stripped, not applied.
      const paged = await admin.adminApps.list({ page: 2, limit: 1 });
      expect(paged.status()).toBe(200);
      const pagedIds = (await dataOf<{ items: AdminApp[] }>(paged)).items
        .map((a) => a._id)
        .sort();
      expect(pagedIds).toEqual(all);
    }
  );
});

test.describe("create", () => {
  test(
    "Create returns 201 with the given order and the OAuth defaults",
    { tag: ["@TC-ADMINAPPS-026", "@smoke"] },
    async () => {
      const name = e2eAppName("contract");
      const res = await admin.adminApps.create(
        adminAppBody([cats[2], cats[0]], {
          name,
          postLogoutRedirectUris: ["https://e2e.example.com/bye"]
        })
      );
      expect(res.status()).toBe(201);
      const data = await dataOf<AdminAppCreated>(res);
      expect(data.name).toBe(name);
      expect(data.categoryIds).toEqual([cats[2], cats[0]]);
      expect(data.status).toBe("inactive");
      expect(data.requiredRoles).toEqual(["admin"]);
      expect(data.tokenEndpointAuthMethod).toBe("client_secret_basic");
      expect(data.postLogoutRedirectUris).toEqual([
        "https://e2e.example.com/bye"
      ]);

      // Stored: grant / response types and scopes take the OAuth defaults
      // (the admin API does not expose them).
      const doc = await findAppDoc(name);
      expect(doc).toBeTruthy();
      expect(doc!.grantTypes).toEqual(
        expect.arrayContaining(["authorization_code"])
      );
      expect(doc!.responseTypes).toEqual(["code"]);
      expect(doc!.scopes).toEqual(["openid", "profile", "email"]);
    }
  );

  test(
    "Credentials are unique, well-formed and the secret is stored hashed",
    { tag: ["@TC-ADMINAPPS-036", "@smoke"] },
    async () => {
      const name = e2eAppName("contract");
      const res = await admin.adminApps.create(
        adminAppBody([cats[2], cats[0]], { name })
      );
      expect(res.status()).toBe(201);
      const data = await dataOf<AdminAppCreated>(res);
      expect(data.clientId).toMatch(/^client_[0-9a-f]{12}$/);
      expect(data.clientSecret).toMatch(/^[0-9a-f]{64}$/);

      // Stored: the secret only as a bcrypt hash.
      const doc = await findAppDoc(name);
      expect(doc).toBeTruthy();
      expect(String(doc!.clientSecretHash)).toMatch(/^\$2[aby]\$/);
      expect(JSON.stringify(doc)).not.toContain(data.clientSecret);

      // A second app never gets the same credentials.
      const other = await dataOf<AdminAppCreated>(await create());
      expect(other.clientId).not.toBe(data.clientId);
      expect(other.clientSecret).not.toBe(data.clientSecret);
    }
  );

  test(
    "A public client gets no secret",
    { tag: "@TC-ADMINAPPS-032" },
    async () => {
      const res = await create({ tokenEndpointAuthMethod: "none" });
      expect(res.status()).toBe(201);
      const data = await dataOf<AdminAppCreated>(res);
      expect(data.clientSecret).toBeNull();
      expect(data.tokenEndpointAuthMethod).toBe("none");
      expect((await findAppDoc(data.name))!.clientSecretHash).toBeNull();
    }
  );

  test(
    "An app takes 1 to 5 distinct, existing categories",
    { tag: ["@TC-ADMINAPPS-027", "@smoke"] },
    async () => {
      // Five distinct ids: the seed has four categories, borrow a fifth by
      // reusing the list (create one only if needed).
      let five = cats.slice(0, 5);
      let extraId: string | null = null;
      if (five.length < 5) {
        const extra = await admin.adminCategories.create({
          name: { en: `E2E Apps Five ${Date.now().toString(36)}`, vi: "Năm" }
        });
        expect(extra.status()).toBe(201);
        extraId = (await dataOf<{ _id: string }>(extra))._id;
        five = [...five, extraId];
      }
      try {
        const post = (ids: unknown) =>
          admin.adminApps.create(adminAppBody([], { categoryIds: ids }));
        expect((await post([cats[0]])).status()).toBe(201);
        expect((await post(five)).status()).toBe(201);
        expect((await post([])).status()).toBe(400);
        expect((await post([...five, UNKNOWN_APP_ID])).status()).toBe(400);
        expect((await post([cats[0], cats[0]])).status()).toBe(400);
        expect((await post(["garbage"])).status()).toBe(400);
        const unknown = await post([UNKNOWN_APP_ID]);
        expect(unknown.status()).toBeGreaterThanOrEqual(400);
        expect(unknown.status()).toBeLessThan(500);
        expect((await errorOf(unknown)).code).toBe(
          "WEB_APP_CATEGORY_NOT_FOUND"
        );
        expect((await post(undefined)).status()).toBe(400);
      } finally {
        await deleteE2EApps();
        if (extraId)
          await admin.adminCategories.remove(extraId, { reassignments: [] });
      }
    }
  );

  test(
    "Redirect URIs must be absolute https or loopback http, 1–20 of them",
    { tag: ["@TC-ADMINAPPS-028", "@smoke"] },
    async () => {
      const post = (redirectUris: unknown) =>
        create({ name: e2eAppName("uri"), redirectUris });
      // valid partitions
      for (const uri of [
        "https://e2e.example.com/cb",
        "http://localhost:5173/",
        "http://127.0.0.1:3000/callback"
      ]) {
        expect((await post([uri])).status(), uri).toBe(201);
      }
      // invalid partitions
      for (const uri of [
        "http://e2e.example.com/callback", // plain http, public host
        "https://e2e.example.com/cb#/auth", // fragment
        "https://*.example.com/cb", // wildcard
        "/callback", // relative
        "not-a-url",
        "ftp://e2e.example.com/cb"
      ]) {
        const res = await post([uri]);
        expect(res.status(), uri).toBe(400);
      }
      // count: 0 / 1 / 20 / 21
      const many = (n: number) =>
        Array.from({ length: n }, (_, i) => `https://e2e.example.com/cb${i}`);
      expect((await post([])).status()).toBe(400);
      expect((await post(many(20))).status()).toBe(201);
      expect((await post(many(21))).status()).toBe(400);
      // the same rules apply to post-logout URIs
      expect(
        (
          await create({
            name: e2eAppName("logout"),
            postLogoutRedirectUris: ["http://e2e.example.com/bye"]
          })
        ).status()
      ).toBe(400);
    }
  );

  test(
    "Name, display name, URLs, roles and auth method are validated",
    { tag: "@TC-ADMINAPPS-029" },
    async () => {
      const status = async (overrides: Record<string, unknown>) =>
        (await create(overrides)).status();
      const suffix = Date.now().toString(36);

      // name length: 1 / 2 / 64 / 65 (prefix keeps the cleanup able to match)
      expect(await status({ name: "e" })).toBe(400);
      // A 2-character name cannot carry the e2e- prefix, so it is renamed
      // straight away for the cleanup to find it.
      const two = await create({ name: "e2" });
      expect(two.status()).toBe(201);
      const twoId = (await dataOf<AdminAppCreated>(two))._id;
      await admin.adminApps.update(twoId, { name: `e2e-renamed-${suffix}` });
      const max = `e2e-${suffix}-`.padEnd(64, "x");
      expect(await status({ name: max })).toBe(201);
      expect(await status({ name: `${max}y` })).toBe(400);
      // pattern
      expect(await status({ name: "e2e-bad name" })).toBe(400);
      expect(await status({ name: "-e2e-leading" })).toBe(400);
      expect(await status({ name: "e2e_underscore" })).toBe(400);
      // upper case is folded, not refused
      const upper = await create({ name: `E2E-UPPER-${suffix}` });
      expect(upper.status()).toBe(201);
      expect((await dataOf<AdminAppCreated>(upper)).name).toBe(
        `e2e-upper-${suffix}`
      );

      // display name length: 1 / 2 / 80 / 81
      expect(await status({ name: e2eAppName(), displayName: "x" })).toBe(400);
      expect(await status({ name: e2eAppName(), displayName: "xy" })).toBe(201);
      expect(
        await status({ name: e2eAppName(), displayName: "x".repeat(80) })
      ).toBe(201);
      expect(
        await status({ name: e2eAppName(), displayName: "x".repeat(81) })
      ).toBe(400);

      // URLs
      expect(
        await status({ name: e2eAppName(), homeUrl: "ftp://e2e.example.com" })
      ).toBe(400);
      expect(await status({ name: e2eAppName(), homeUrl: "" })).toBe(400);
      expect(
        await status({ name: e2eAppName(), iconUrl: "javascript:alert(1)" })
      ).toBe(400);
      expect(
        await status({ name: e2eAppName(), description: "d".repeat(501) })
      ).toBe(400);
      expect(
        await status({ name: e2eAppName(), description: "d".repeat(500) })
      ).toBe(201);

      // roles, status, auth method
      expect(await status({ name: e2eAppName(), requiredRoles: [] })).toBe(400);
      expect(
        await status({ name: e2eAppName(), requiredRoles: ["root"] })
      ).toBe(400);
      expect(await status({ name: e2eAppName(), status: "paused" })).toBe(400);
      expect(
        await status({
          name: e2eAppName(),
          tokenEndpointAuthMethod: "client_secret_post"
        })
      ).toBe(400);
    }
  );

  test(
    "A taken name is 409 and tampered fields are ignored",
    { tag: ["@TC-ADMINAPPS-030", "@smoke"] },
    async () => {
      const dup = await create({ name: "blog" });
      expect(dup.status()).toBe(409);
      expect((await errorOf(dup)).code).toBe("WEB_APP_NAME_EXISTS");
      // case-folded duplicate
      expect((await create({ name: "BLOG" })).status()).toBe(409);

      const name = e2eAppName("tamper");
      const res = await create({
        name,
        clientId: "client_hacked",
        clientSecret: "hacked",
        clientSecretHash: "hacked",
        scopes: ["admin:all"],
        grantTypes: ["client_credentials"]
      });
      expect(res.status()).toBe(201);
      const data = await dataOf<AdminAppCreated>(res);
      expect(data.clientId).not.toBe("client_hacked");
      expect(data.clientSecret).not.toBe("hacked");
      const doc = await findAppDoc(name);
      expect(doc!.scopes).toEqual(["openid", "profile", "email"]);
      expect(doc!.grantTypes).not.toContain("client_credentials");
    }
  );
});

test.describe("update", () => {
  test(
    "PATCH changes only what it is given; bad targets fail",
    { tag: ["@TC-ADMINAPPS-056", "@smoke"] },
    async () => {
      const created = await dataOf<AdminAppCreated>(await create());
      const id = created._id;

      const res = await admin.adminApps.update(id, {
        displayName: "E2E Patched",
        categoryIds: [cats[1], cats[0]]
      });
      expect(res.status()).toBe(200);
      const data = await dataOf<Record<string, unknown>>(res);
      expect(data.displayName).toBe("E2E Patched");
      expect(data.categoryIds).toEqual([cats[1], cats[0]]);
      expect(data.homeUrl).toBe(created.homeUrl);
      expect(data.clientId).toBe(created.clientId);
      expect(data).not.toHaveProperty("clientSecret");

      expect((await admin.adminApps.update(id, {})).status()).toBe(400);
      expect(
        (
          await admin.adminApps.update("garbage", { displayName: "xx" })
        ).status()
      ).toBe(400);
      const missing = await admin.adminApps.update(UNKNOWN_APP_ID, {
        displayName: "xx"
      });
      expect(missing.status()).toBe(404);
      expect((await errorOf(missing)).code).toBe("WEB_APP_NOT_FOUND");

      // renaming onto another app's name is a conflict
      const clash = await admin.adminApps.update(id, { name: "notes" });
      expect(clash.status()).toBe(409);
      // tampered: the client id cannot be rewritten
      await admin.adminApps.update(id, {
        displayName: "E2E Patched 2",
        clientId: "client_hacked"
      });
      const after = (await listAdminApps(admin)).find((a) => a._id === id);
      expect(after!.clientId).toBe(created.clientId);
    }
  );

  test(
    "PATCH re-checks categories and folds the name like create",
    { tag: "@TC-ADMINAPPS-064" },
    async () => {
      const created = await dataOf<AdminAppCreated>(
        await create({ name: e2eAppName("patch") })
      );
      const id = created._id;

      // [Error Guessing] a category that does not exist (deleted elsewhere)
      const gone = await admin.adminApps.update(id, {
        categoryIds: [UNKNOWN_APP_ID]
      });
      expect(gone.status()).toBe(400);
      expect((await errorOf(gone)).code).toBe("WEB_APP_CATEGORY_NOT_FOUND");
      // [BVA] six categories, and a duplicate, are refused like on create
      const six = [
        ...cats.slice(0, 4),
        UNKNOWN_APP_ID,
        `${UNKNOWN_APP_ID.slice(0, -1)}1`
      ];
      expect(
        (await admin.adminApps.update(id, { categoryIds: six })).status()
      ).toBe(400);
      expect(
        (
          await admin.adminApps.update(id, { categoryIds: [cats[0], cats[0]] })
        ).status()
      ).toBe(400);
      // a redirect URI the create rules refuse is refused here too
      expect(
        (
          await admin.adminApps.update(id, {
            redirectUris: ["http://e2e.example.com/callback"]
          })
        ).status()
      ).toBe(400);

      // Saving its own current name is not a conflict with itself.
      const same = await admin.adminApps.update(id, { name: created.name });
      expect(same.status()).toBe(200);

      // Upper case is folded, as on create.
      const upperName = e2eAppName("folded").toUpperCase();
      const folded = await admin.adminApps.update(id, { name: upperName });
      expect(folded.status()).toBe(200);
      expect((await dataOf<AdminApp>(folded)).name).toBe(
        upperName.toLowerCase()
      );

      // An empty description clears it to null.
      const cleared = await admin.adminApps.update(id, { description: "" });
      expect(cleared.status()).toBe(200);
      expect((await dataOf<AdminApp>(cleared)).description).toBeNull();
    }
  );

  test(
    "The server trims a trailing space in the name",
    { tag: "@TC-ADMINAPPS-054" },
    async () => {
      // The form's NAME_PATTERN /^[a-z0-9][a-z0-9-]*$/ rejects a trailing space
      // client-side, so a raw "blog " never reaches the server through the UI.
      // This asserts the server's trim contract directly, then self-reverts.
      const app = (await listAdminApps(admin)).find(
        (a) => a.name === EDIT_TARGET_APP.name
      );
      expect(app, "blog seed app must exist").toBeTruthy();
      const id = app!._id;

      const patchRes = await admin.adminApps.update(id, { name: "blog " });
      expect(patchRes.ok()).toBeTruthy();
      // Server trims → stored as "blog", not "blog " (no junk name).
      expect((await dataOf<AdminApp>(patchRes)).name).toBe("blog");

      await admin.adminApps.update(id, { name: EDIT_TARGET_APP.name });
    }
  );

  test(
    "An inactive app leaves users' launcher and returns when reactivated",
    { tag: ["@TC-ADMINAPPS-061", "@smoke"] },
    async ({ userApi }) => {
      const user = createApiClient(userApi);
      const name = e2eAppName("visible");
      const created = await dataOf<AdminAppCreated>(
        await create({
          name,
          requiredRoles: ["user"],
          status: "inactive"
        })
      );
      const id = created._id;
      const userSees = async () => {
        const res = await user.webApps.list({ search: name });
        expect(res.status()).toBe(200);
        return (await dataOf<CatalogPage>(res)).items.length;
      };

      expect(await userSees()).toBe(0); // inactive
      await admin.adminApps.update(id, { status: "active" });
      expect(await userSees()).toBe(1); // inactive → active
      await admin.adminApps.update(id, { status: "inactive" });
      expect(await userSees()).toBe(0); // active → inactive
      // repeating the same status is accepted and changes nothing
      const again = await admin.adminApps.update(id, { status: "inactive" });
      expect(again.status()).toBe(200);
      expect(await userSees()).toBe(0);
    }
  );
});
