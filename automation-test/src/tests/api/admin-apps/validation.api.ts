import { test, expect } from "@/fixtures";
import { createApiClient, type ApiClient } from "@/api";
import type { AdminAppCreated } from "@/api/admin-apps.client";
import { dataOf, errorOf } from "@/api/response";
import { serverMessage, serverMessageVi } from "@/data/copy";
import { UNKNOWN_APP_ID } from "@/data/test-data";
import {
  adminAppBody,
  categoryIds,
  deleteE2EApps,
  e2eAppName
} from "@/utils/admin-apps";

test.use({ role: "admin" });

// How /admin/apps refuses bad input (REQ-ADMINAPPS-02, REQ-ADMINAPPS-06):
// validationPipe (server/src/middlewares/pipes/validation.pipe.ts) runs Joi
// with abortEarly: false + stripUnknown and answers 400 VALIDATION_ERROR with
// one `errors[]` entry per field, each message translated per request
// (`webApp:validation.*`); the error filter (middlewares/filters/
// error.filter.ts) shapes every other failure.
// Test cases: test-cases/admin-apps.md (TC-ADMINAPPS-062, -063, -071, -072).

const EN = { "Accept-Language": "en" };
const VI = { "Accept-Language": "vi" };
const webApp = serverMessage.webApp;

let admin: ApiClient;
let cats: string[];

test.beforeEach(async ({ adminApi }) => {
  admin = createApiClient(adminApi);
  cats = await categoryIds(admin);
});

test.afterEach(async () => {
  await deleteE2EApps();
});

test(
  "Validation errors list every bad field with a message in the caller's language",
  { tag: "@TC-ADMINAPPS-062" },
  async () => {
    // [DT] every required field missing at once → one entry per field
    const empty = await admin.adminApps.create({}, EN);
    expect(empty.status()).toBe(400);
    const emptyBody = await errorOf(empty);
    expect(emptyBody.code).toBe("VALIDATION_ERROR");
    expect(emptyBody.message).toBe(
      serverMessage.common.errors.validationFailed
    );
    expect((emptyBody.errors ?? []).map((e) => e.field).sort()).toEqual(
      [
        "categoryIds",
        "displayName",
        "homeUrl",
        "name",
        "redirectUris",
        "requiredRoles",
        "status"
      ].sort()
    );
    expect(emptyBody.errors).toContainEqual(
      expect.objectContaining({
        field: "name",
        message: webApp.validation.name.required
      })
    );

    // One bad field: named, with the rule's message, in English …
    const bad = adminAppBody([cats[0]], { name: "Blog!" });
    const en = await errorOf(await admin.adminApps.create(bad, EN));
    expect(en.code).toBe("VALIDATION_ERROR");
    expect(en.errors).toEqual([
      expect.objectContaining({
        field: "name",
        message: webApp.validation.name.invalid
      })
    ]);
    // … and in Vietnamese.
    const vi = await errorOf(await admin.adminApps.create(bad, VI));
    expect(vi.errors).toEqual([
      expect.objectContaining({
        field: "name",
        message: serverMessageVi.webApp.validation.name.invalid
      })
    ]);

    // Business errors carry their own translated message too.
    const taken = await admin.adminApps.create(
      adminAppBody([cats[0]], { name: "blog" }),
      EN
    );
    expect(taken.status()).toBe(409);
    expect((await errorOf(taken)).message).toBe(webApp.errors.nameExists);
    const missing = await admin.adminApps.update(
      UNKNOWN_APP_ID,
      { displayName: "xx" },
      EN
    );
    expect(missing.status()).toBe(404);
    expect((await errorOf(missing)).message).toBe(webApp.errors.notFound);
  }
);

test(
  "Surrounding whitespace is trimmed and whitespace-only fields count as empty",
  { tag: "@TC-ADMINAPPS-063" },
  async () => {
    const name = e2eAppName("spaced");
    const res = await admin.adminApps.create(
      adminAppBody([cats[0]], {
        name: `  ${name}  `,
        displayName: "  E2E Spaced  ",
        homeUrl: "  https://e2e.example.com  ",
        description: "   ",
        redirectUris: ["  https://e2e.example.com/cb  "]
      })
    );
    expect(res.status()).toBe(201);
    const data = await dataOf<AdminAppCreated>(res);
    expect(data.name).toBe(name);
    expect(data.displayName).toBe("E2E Spaced");
    expect(data.homeUrl).toBe("https://e2e.example.com");
    expect(data.description).toBeNull();
    expect(data.redirectUris).toEqual(["https://e2e.example.com/cb"]);

    // [Error Guessing] whitespace only is not a value
    for (const field of ["name", "displayName", "homeUrl"]) {
      const blank = await admin.adminApps.create(
        adminAppBody([cats[0]], { name: e2eAppName("blank"), [field]: "   " }),
        EN
      );
      expect(blank.status(), field).toBe(400);
      expect(
        ((await errorOf(blank)).errors ?? []).map((e) => e.field),
        field
      ).toContain(field);
    }
  }
);

test(
  "Wrongly typed fields are refused with 400, never a server error",
  { tag: "@TC-ADMINAPPS-071" },
  async () => {
    const cases: [string, Record<string, unknown>][] = [
      ["name as a number", { name: 123 }],
      ["displayName as an array", { displayName: ["E2E"] }],
      ["categoryIds as a string", { categoryIds: cats[0] }],
      [
        "redirectUris as a string",
        { redirectUris: "https://e2e.example.com/cb" }
      ],
      ["requiredRoles as a string", { requiredRoles: "user" }],
      ["status as a boolean", { status: true }]
    ];
    for (const [label, overrides] of cases) {
      const res = await admin.adminApps.create(
        adminAppBody([cats[0]], { name: e2eAppName("typed"), ...overrides }),
        EN
      );
      expect(res.status(), label).toBe(400);
      expect((await errorOf(res)).code, label).toBe("VALIDATION_ERROR");
    }
    // A JSON array instead of an object, on create and on update.
    const arrayBody = await admin.adminApps.create([], EN);
    expect(arrayBody.status()).toBe(400);
    expect(
      (await admin.adminApps.update(UNKNOWN_APP_ID, [], EN)).status()
    ).toBe(400);
  }
);

test(
  "A body that is not valid JSON is refused with 400, never a server error",
  { tag: "@TC-ADMINAPPS-072" },
  async () => {
    // BUG: defects/ops.md#bug-ops-02
    test.fail();
    const res = await admin.adminApps.create('{"name": "e2e-broken", ', {
      ...EN,
      "Content-Type": "application/json"
    });
    expect(res.status()).toBe(400);
  }
);
