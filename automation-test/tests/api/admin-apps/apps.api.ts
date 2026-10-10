import { test, expect } from "@fixtures";
import type { APIRequestContext } from "@playwright/test";
import {
  ADMIN_APPS_API,
  appBody,
  categoryIds,
  deleteE2EApps,
  e2eAppName,
  findAppDoc,
  listApps
} from "@helpers/adminApps";

test.use({ role: "admin" });

// /api/v1/admin/apps — list, create and update contract (REQ-ADMAPPS-01 …
// REQ-ADMAPPS-05). Validation rules: server/src/validators/schemas/web-app.ts;
// redirect URI rules: isValidRedirectUri (server/src/modules/oauth/helpers).
// Test cases: test-cases/admin-apps.md (TC-ADMAPPS-019, -020, -026 … -030,
// -036, -056, -061).
//
// Every app created here is `e2e-…`, inactive and admin-only unless a test
// needs otherwise, and is deleted from MongoDB after each test.

const ZERO_ID = "000000000000000000000000";

type ErrorBody = { code?: string; message?: string; errors?: unknown };

let cats: string[];

test.beforeEach(async ({ adminApi }) => {
  cats = await categoryIds(adminApi);
  expect(cats.length).toBeGreaterThanOrEqual(4);
});

test.afterEach(async () => {
  await deleteE2EApps();
});

const create = (
  api: APIRequestContext,
  overrides: Record<string, unknown> = {}
) => api.post(ADMIN_APPS_API, { data: appBody([cats[0]], overrides) });

test.describe("list", () => {
  test(
    "returns every app with the admin DTO and never a secret",
    { tag: ["@TC-ADMAPPS-019", "@smoke"] },
    async ({ adminApi }) => {
      const res = await adminApi.get(ADMIN_APPS_API);
      expect(res.status()).toBe(200);
      const items = await listApps(adminApi);
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
    { tag: "@TC-ADMAPPS-019" },
    async ({ adminApi }) => {
      const all = await listApps(adminApi);
      const inactive = await listApps(adminApi, "?status=inactive");
      expect(inactive.every((a) => a.status === "inactive")).toBe(true);
      const active = await listApps(adminApi, "?status=active");
      expect(active.length + inactive.length).toBe(all.length);

      const someCategory = (all[0].categoryIds as string[])[0];
      const inCategory = await listApps(
        adminApi,
        `?categoryId=${someCategory}`
      );
      expect(inCategory.length).toBeGreaterThan(0);
      expect(
        inCategory.every((a) =>
          (a.categoryIds as string[]).includes(someCategory)
        )
      ).toBe(true);

      // search hits name, displayName and description, case-insensitively
      expect(
        (await listApps(adminApi, "?search=TEAM-CAL")).map((a) => a.name)
      ).toEqual(["team-calendar"]);
      expect(
        (await listApps(adminApi, "?search=restricted%20to%20admin")).map(
          (a) => a.name
        )
      ).toEqual(["ops-console"]);

      const combined = await listApps(
        adminApi,
        `?status=inactive&search=calendar`
      );
      expect(combined.map((a) => a.name)).toEqual(["team-calendar"]);
      expect(
        await listApps(adminApi, "?status=active&search=team-calendar")
      ).toEqual([]);
    }
  );

  test(
    "[EP/BVA] bad filter values are refused and regex characters are literal",
    { tag: "@TC-ADMAPPS-020" },
    async ({ adminApi }) => {
      expect(
        (await adminApi.get(`${ADMIN_APPS_API}?status=paused`)).status()
      ).toBe(400);
      expect(
        (await adminApi.get(`${ADMIN_APPS_API}?categoryId=garbage`)).status()
      ).toBe(400);

      // [Error Guessing] regex metacharacters are escaped, not evaluated
      for (const q of ["(", ".*", "[a-z]+", "\\"]) {
        const res = await adminApi.get(
          `${ADMIN_APPS_API}?search=${encodeURIComponent(q)}`
        );
        expect(res.status(), q).toBe(200);
      }
      expect(
        await listApps(adminApi, `?search=${encodeURIComponent(".*")}`)
      ).toEqual([]);

      // [BVA] search length: 200 (SEARCH_MAX_LENGTH) / 201
      expect(
        (
          await adminApi.get(`${ADMIN_APPS_API}?search=${"a".repeat(200)}`)
        ).status()
      ).toBe(200);
      expect(
        (
          await adminApi.get(`${ADMIN_APPS_API}?search=${"a".repeat(201)}`)
        ).status()
      ).toBe(400);
    }
  );
});

test.describe("create", () => {
  test(
    "201 with generated credentials, the given order and OAuth defaults",
    { tag: ["@TC-ADMAPPS-026", "@TC-ADMAPPS-036"] },
    async ({ adminApi }) => {
      const name = e2eAppName("contract");
      const res = await adminApi.post(ADMIN_APPS_API, {
        data: appBody([cats[2], cats[0]], {
          name,
          postLogoutRedirectUris: ["https://e2e.example.com/bye"]
        })
      });
      expect(res.status()).toBe(201);
      const { data } = (await res.json()) as {
        data: Record<string, unknown> & {
          clientId: string;
          clientSecret: string;
        };
      };
      expect(data.name).toBe(name);
      expect(data.categoryIds).toEqual([cats[2], cats[0]]);
      expect(data.status).toBe("inactive");
      expect(data.requiredRoles).toEqual(["admin"]);
      expect(data.tokenEndpointAuthMethod).toBe("client_secret_basic");
      expect(data.postLogoutRedirectUris).toEqual([
        "https://e2e.example.com/bye"
      ]);
      expect(data.clientId).toMatch(/^client_[0-9a-f]{12}$/);
      expect(data.clientSecret).toMatch(/^[0-9a-f]{64}$/);

      // Stored: secret only as a bcrypt hash; grant / response types and
      // scopes take the OAuth defaults (the admin API does not expose them).
      const doc = await findAppDoc(name);
      expect(doc).toBeTruthy();
      expect(String(doc!.clientSecretHash)).toMatch(/^\$2[aby]\$/);
      expect(JSON.stringify(doc)).not.toContain(data.clientSecret);
      expect(doc!.grantTypes).toEqual(
        expect.arrayContaining(["authorization_code"])
      );
      expect(doc!.responseTypes).toEqual(["code"]);
      expect(doc!.scopes).toEqual(["openid", "profile", "email"]);

      // A second app never gets the same credentials.
      const other = (await (await create(adminApi)).json()) as {
        data: { clientId: string; clientSecret: string };
      };
      expect(other.data.clientId).not.toBe(data.clientId);
      expect(other.data.clientSecret).not.toBe(data.clientSecret);
    }
  );

  test(
    "a public client (token auth method none) gets no secret",
    { tag: "@TC-ADMAPPS-032" },
    async ({ adminApi }) => {
      const res = await create(adminApi, { tokenEndpointAuthMethod: "none" });
      expect(res.status()).toBe(201);
      const { data } = (await res.json()) as { data: Record<string, unknown> };
      expect(data.clientSecret).toBeNull();
      expect(data.tokenEndpointAuthMethod).toBe("none");
      expect(
        (await findAppDoc(data.name as string))!.clientSecretHash
      ).toBeNull();
    }
  );

  test(
    "[BVA] 1 and 5 categories are accepted; 0, 6, duplicates and unknown ids are not",
    { tag: "@TC-ADMAPPS-027" },
    async ({ adminApi }) => {
      // Five distinct ids: the seed has four categories, borrow a fifth by
      // reusing the list (create one only if needed).
      let five = cats.slice(0, 5);
      let extraId: string | null = null;
      if (five.length < 5) {
        const extra = await adminApi.post("/api/v1/admin/categories", {
          data: {
            name: { en: `E2E Apps Five ${Date.now().toString(36)}`, vi: "Năm" }
          }
        });
        expect(extra.status()).toBe(201);
        extraId = ((await extra.json()) as { data: { _id: string } }).data._id;
        five = [...five, extraId];
      }
      try {
        const post = (ids: unknown) =>
          adminApi.post(ADMIN_APPS_API, {
            data: appBody([], { categoryIds: ids })
          });
        expect((await post([cats[0]])).status()).toBe(201);
        expect((await post(five)).status()).toBe(201);
        expect((await post([])).status()).toBe(400);
        expect((await post([...five, ZERO_ID])).status()).toBe(400);
        expect((await post([cats[0], cats[0]])).status()).toBe(400);
        expect((await post(["garbage"])).status()).toBe(400);
        const unknown = await post([ZERO_ID]);
        expect(unknown.status()).toBeGreaterThanOrEqual(400);
        expect(unknown.status()).toBeLessThan(500);
        expect(((await unknown.json()) as ErrorBody).code).toBe(
          "WEB_APP_CATEGORY_NOT_FOUND"
        );
        expect((await post(undefined)).status()).toBe(400);
      } finally {
        await deleteE2EApps();
        if (extraId)
          await adminApi.delete(`/api/v1/admin/categories/${extraId}`, {
            data: { reassignments: [] }
          });
      }
    }
  );

  test(
    "[EP/BVA] redirect URIs must be absolute https (or loopback http), 1–20 of them",
    { tag: "@TC-ADMAPPS-028" },
    async ({ adminApi }) => {
      const post = (redirectUris: unknown) =>
        create(adminApi, { name: e2eAppName("uri"), redirectUris });
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
          await create(adminApi, {
            name: e2eAppName("logout"),
            postLogoutRedirectUris: ["http://e2e.example.com/bye"]
          })
        ).status()
      ).toBe(400);
    }
  );

  test(
    "[EP/BVA] name, display name, URLs, roles and auth method are validated",
    { tag: "@TC-ADMAPPS-029" },
    async ({ adminApi }) => {
      const status = async (overrides: Record<string, unknown>) =>
        (await create(adminApi, overrides)).status();
      const suffix = Date.now().toString(36);

      // name length: 1 / 2 / 64 / 65 (prefix keeps the cleanup able to match)
      expect(await status({ name: "e" })).toBe(400);
      // A 2-character name cannot carry the e2e- prefix, so it is renamed
      // straight away for the cleanup to find it.
      const two = await create(adminApi, { name: "e2" });
      expect(two.status()).toBe(201);
      const twoId = ((await two.json()) as { data: { _id: string } }).data._id;
      await adminApi.patch(`${ADMIN_APPS_API}/${twoId}`, {
        data: { name: `e2e-renamed-${suffix}` }
      });
      const max = `e2e-${suffix}-`.padEnd(64, "x");
      expect(await status({ name: max })).toBe(201);
      expect(await status({ name: `${max}y` })).toBe(400);
      // pattern
      expect(await status({ name: "e2e-bad name" })).toBe(400);
      expect(await status({ name: "-e2e-leading" })).toBe(400);
      expect(await status({ name: "e2e_underscore" })).toBe(400);
      // upper case is folded, not refused
      const upper = await create(adminApi, { name: `E2E-UPPER-${suffix}` });
      expect(upper.status()).toBe(201);
      expect(
        ((await upper.json()) as { data: { name: string } }).data.name
      ).toBe(`e2e-upper-${suffix}`);

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
    "a taken name is 409 and tampered fields are ignored",
    { tag: "@TC-ADMAPPS-030" },
    async ({ adminApi }) => {
      const dup = await create(adminApi, { name: "blog" });
      expect(dup.status()).toBe(409);
      expect(((await dup.json()) as ErrorBody).code).toBe(
        "WEB_APP_NAME_EXISTS"
      );
      // case-folded duplicate
      expect((await create(adminApi, { name: "BLOG" })).status()).toBe(409);

      const name = e2eAppName("tamper");
      const res = await create(adminApi, {
        name,
        clientId: "client_hacked",
        clientSecret: "hacked",
        clientSecretHash: "hacked",
        scopes: ["admin:all"],
        grantTypes: ["client_credentials"]
      });
      expect(res.status()).toBe(201);
      const { data } = (await res.json()) as {
        data: { clientId: string; clientSecret: string };
      };
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
    "PATCH changes only what it is given; empty, malformed and unknown targets fail",
    { tag: "@TC-ADMAPPS-056" },
    async ({ adminApi }) => {
      const created = (await (await create(adminApi)).json()) as {
        data: Record<string, unknown> & { _id: string; name: string };
      };
      const id = created.data._id;

      const res = await adminApi.patch(`${ADMIN_APPS_API}/${id}`, {
        data: { displayName: "E2E Patched", categoryIds: [cats[1], cats[0]] }
      });
      expect(res.status()).toBe(200);
      const { data } = (await res.json()) as { data: Record<string, unknown> };
      expect(data.displayName).toBe("E2E Patched");
      expect(data.categoryIds).toEqual([cats[1], cats[0]]);
      expect(data.homeUrl).toBe(created.data.homeUrl);
      expect(data.clientId).toBe(created.data.clientId);
      expect(data).not.toHaveProperty("clientSecret");

      expect(
        (await adminApi.patch(`${ADMIN_APPS_API}/${id}`, { data: {} })).status()
      ).toBe(400);
      expect(
        (
          await adminApi.patch(`${ADMIN_APPS_API}/garbage`, {
            data: { displayName: "xx" }
          })
        ).status()
      ).toBe(400);
      const missing = await adminApi.patch(`${ADMIN_APPS_API}/${ZERO_ID}`, {
        data: { displayName: "xx" }
      });
      expect(missing.status()).toBe(404);
      expect(((await missing.json()) as ErrorBody).code).toBe(
        "WEB_APP_NOT_FOUND"
      );

      // renaming onto another app's name is a conflict
      const clash = await adminApi.patch(`${ADMIN_APPS_API}/${id}`, {
        data: { name: "notes" }
      });
      expect(clash.status()).toBe(409);
      // tampered: the client id cannot be rewritten
      await adminApi.patch(`${ADMIN_APPS_API}/${id}`, {
        data: { displayName: "E2E Patched 2", clientId: "client_hacked" }
      });
      const after = (await listApps(adminApi)).find((a) => a._id === id);
      expect(after!.clientId).toBe(created.data.clientId);
    }
  );

  test(
    "[ST] an inactive app is hidden from users' launcher and comes back when reactivated",
    { tag: "@TC-ADMAPPS-061" },
    async ({ adminApi, userApi }) => {
      const name = e2eAppName("visible");
      const created = (await (
        await create(adminApi, {
          name,
          requiredRoles: ["user"],
          status: "inactive"
        })
      ).json()) as { data: { _id: string } };
      const id = created.data._id;
      const userSees = async () => {
        const res = await userApi.get(`/api/v1/apps?search=${name}`);
        expect(res.status()).toBe(200);
        const body = (await res.json()) as {
          data: { items: { name?: string; displayName?: string }[] };
        };
        return body.data.items.length;
      };

      expect(await userSees()).toBe(0); // inactive
      await adminApi.patch(`${ADMIN_APPS_API}/${id}`, {
        data: { status: "active" }
      });
      expect(await userSees()).toBe(1); // inactive → active
      await adminApi.patch(`${ADMIN_APPS_API}/${id}`, {
        data: { status: "inactive" }
      });
      expect(await userSees()).toBe(0); // active → inactive
      // repeating the same status is accepted and changes nothing
      const again = await adminApi.patch(`${ADMIN_APPS_API}/${id}`, {
        data: { status: "inactive" }
      });
      expect(again.status()).toBe(200);
      expect(await userSees()).toBe(0);
    }
  );
});
