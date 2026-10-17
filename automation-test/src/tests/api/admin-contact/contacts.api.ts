import { test, expect } from "@/fixtures";
import type { APIRequestContext } from "@playwright/test";
import { createApiClient, type ApiClient } from "@/api";
import {
  submittedOf,
  type AdminContactDetail,
  type AdminContactItem,
  type AdminContactsPage,
  type SubmittedContact
} from "@/api/contact.client";
import { dataOf, errorOf } from "@/api/response";
import {
  adminContactTicket,
  deleteAdminContactRequests
} from "@/utils/contacts";

// /admin/contacts (api/contact.client.ts → adminList / adminGet /
// adminUpdateStatus) — list contract, filters, validation, paging and
// sorting, detail, the status workflow (state transitions, valid and
// invalid), translated messages and access control. Every request a test
// reads or changes is one it filed itself; afterAll deletes them.
// Test cases: test-cases/admin-contact.md.

test.afterAll(async () => {
  await deleteAdminContactRequests();
});

/** Files a request under the module prefix (guest unless a Bearer context). */
const fileTicket = async (
  ctx: APIRequestContext,
  tag: string,
  opts: { email?: string } = {}
): Promise<SubmittedContact> =>
  submittedOf(
    await createApiClient(ctx).contact.submit(adminContactTicket(tag, opts))
  );

const setStatus = (api: ApiClient, id: string, status: string) =>
  api.contact.adminUpdateStatus(id, { status });

const list = async (
  api: ApiClient,
  params: Record<string, string | number>
): Promise<AdminContactsPage> => {
  const res = await api.contact.adminList(params);
  expect(res.status(), JSON.stringify(params)).toBe(200);
  return dataOf<AdminContactsPage>(res);
};

const statusOf = async (api: ApiClient, id: string) =>
  (await dataOf<AdminContactItem>(await api.contact.adminGet(id))).status;

/** A message that is still an i18next key ("success.getContactList", "contactAdmin:errors.invalidId"). */
const CATALOGUE_KEY_RE = /^(\w+:)?(success|errors)\.\w+$/;

test(
  "List API contract",
  { tag: ["@TC-ADMINCONTACT-030", "@smoke"] },
  async ({ adminApi, guestApi }) => {
    const c = await fileTicket(guestApi, "api-contract");
    const res = await createApiClient(adminApi).contact.adminList();
    expect(res.status()).toBe(200);
    const body = (await res.json()) as {
      timestamp: string;
      path: string;
      data: AdminContactsPage;
    };
    expect(body.path).toContain("/admin/contacts");
    const { items, meta } = body.data;
    expect(meta).toMatchObject({ page: 1, limit: 20 });
    expect(meta.totalPages).toBe(Math.ceil(meta.total / meta.limit));
    const mine = items.find((i) => i._id === c.id);
    expect(mine, "the request just filed is on page 1").toBeTruthy();
    expect(mine).toMatchObject({
      subject: c.subject,
      status: "new",
      priority: "medium"
    });
    const times = items.map((i) => Date.parse(i.createdAt));
    expect([...times].sort((a, b) => b - a)).toEqual(times);
    for (const it of items) expect(it).not.toHaveProperty("message");
  }
);

test(
  "List filters return exactly the matching requests",
  { tag: "@TC-ADMINCONTACT-031" },
  async ({ adminApi, guestApi }) => {
    // [DT] search × status × email × priority × date for one request in a
    // known state.
    const admin = createApiClient(adminApi);
    const local = `apif-${Date.now().toString(36)}`;
    const c = await fileTicket(guestApi, "api-filters", {
      email: `${local}@e2e.example.com`
    });
    expect((await setStatus(admin, c.id, "processing")).ok()).toBe(true);
    const ids = async (params: Record<string, string>) =>
      (await list(admin, { ...params, limit: 100 })).items.map((i) => i._id);
    const today = new Date();
    const day = (o: number) =>
      new Date(today.getTime() + o * 86_400_000).toISOString();

    expect(await ids({ search: c.subject })).toEqual([c.id]);
    expect(await ids({ search: c.subject.toUpperCase() })).toEqual([c.id]);
    expect(await ids({ search: local })).toEqual([c.id]);
    expect(await ids({ search: c.subject, status: "processing" })).toEqual([
      c.id
    ]);
    expect(await ids({ search: c.subject, status: "new" })).toEqual([]);
    expect(await ids({ email: local.toUpperCase() })).toEqual([c.id]);
    expect(await ids({ email: local, status: "resolved" })).toEqual([]);
    expect(await ids({ search: c.subject, priority: "medium" })).toEqual([
      c.id
    ]);
    expect(await ids({ search: c.subject, priority: "high" })).toEqual([]);
    expect(
      await ids({ search: c.subject, fromDate: day(-1), toDate: day(1) })
    ).toEqual([c.id]);
    expect(
      await ids({
        search: c.subject,
        fromDate: "2020-01-01",
        toDate: "2020-12-31"
      })
    ).toEqual([]);
    // Regex metacharacters are matched literally.
    expect(await ids({ search: ".*" })).toEqual([]);
  }
);

test.describe("List query validation", () => {
  const cases: [Record<string, string | number>, number][] = [
    [{ page: 0 }, 400],
    [{ page: 1 }, 200],
    [{ limit: 0 }, 400],
    [{ limit: 1 }, 200],
    [{ limit: 100 }, 200],
    [{ limit: 101 }, 400],
    [{ status: "closed" }, 400],
    [{ priority: "urgent" }, 400],
    [{ fromDate: "not-a-date" }, 400],
    [{ fromDate: "2026-02-01", toDate: "2026-01-01" }, 400],
    [{ sortBy: "subject" }, 400],
    [{ sortBy: "priority", sortOrder: "asc" }, 200],
    [{ search: "s".repeat(200) }, 200],
    [{ search: "s".repeat(201) }, 400]
  ];
  for (const [params, status] of cases) {
    test(
      `${JSON.stringify(params).slice(0, 50)} → ${status}`,
      { tag: "@TC-ADMINCONTACT-032" },
      async ({ adminApi }) => {
        const res = await createApiClient(adminApi).contact.adminList(params);
        expect(res.status()).toBe(status);
        if (status === 400)
          expect((await errorOf(res)).code).toBe("VALIDATION_ERROR");
      }
    );
  }
});

test.describe("Detail API contract and id errors", () => {
  test(
    "GET /:id returns the full request including the message",
    { tag: "@TC-ADMINCONTACT-033" },
    async ({ adminApi, guestApi }) => {
      const c = await fileTicket(guestApi, "api-detail", {
        email: "api-detail@e2e.example.com"
      });
      const res = await createApiClient(adminApi).contact.adminGet(c.id);
      expect(res.status()).toBe(200);
      const d = await dataOf<AdminContactDetail>(res);
      expect(d).toMatchObject({
        _id: c.id,
        subject: c.subject,
        message: c.message,
        email: "api-detail@e2e.example.com",
        status: "new"
      });
    }
  );

  test(
    "[EG] malformed id → 400, unknown id → 404 CONTACT_NOT_FOUND",
    { tag: "@TC-ADMINCONTACT-033" },
    async ({ adminApi }) => {
      const admin = createApiClient(adminApi);
      const bad = await admin.contact.adminGet("not-a-ticket");
      expect(bad.status()).toBe(400);
      expect((await errorOf(bad)).code).toBe("VALIDATION_ERROR");
      const missing = await admin.contact.adminGet("000000000000000000000000");
      expect(missing.status()).toBe(404);
      expect((await errorOf(missing)).code).toBe("CONTACT_NOT_FOUND");
    }
  );
});

test(
  "new → processing → resolved",
  { tag: "@TC-ADMINCONTACT-021" },
  async ({ adminApi, guestApi }) => {
    // [ST] each step persisted.
    const admin = createApiClient(adminApi);
    const c = await fileTicket(guestApi, "api-workflow");
    expect(await statusOf(admin, c.id)).toBe("new");
    for (const next of ["processing", "resolved"] as const) {
      const res = await setStatus(admin, c.id, next);
      expect(res.status()).toBe(200);
      const data = await dataOf<AdminContactItem>(res);
      expect(data).toMatchObject({ _id: c.id, status: next });
      expect(Date.parse(data.updatedAt)).toBeGreaterThanOrEqual(
        Date.parse(data.createdAt)
      );
      expect(await statusOf(admin, c.id)).toBe(next);
    }
  }
);

test.describe("Invalid status changes are refused", () => {
  // [ST] invalid transitions: a target outside the three states is refused
  // and the request keeps the status it had.
  for (const body of [
    { status: "closed" },
    { status: "NEW" },
    { status: "" },
    { status: null },
    {},
    { status: ["resolved"] }
  ]) {
    test(
      `[ST] invalid target ${JSON.stringify(body)} → 400, status unchanged`,
      { tag: ["@TC-ADMINCONTACT-023", "@smoke"] },
      async ({ adminApi, guestApi }) => {
        const admin = createApiClient(adminApi);
        const c = await fileTicket(guestApi, "api-invalid");
        expect((await setStatus(admin, c.id, "processing")).ok()).toBe(true);
        const res = await admin.contact.adminUpdateStatus(c.id, body);
        expect(res.status()).toBe(400);
        expect((await errorOf(res)).code).toBe("VALIDATION_ERROR");
        expect(await statusOf(admin, c.id)).toBe("processing");
      }
    );
  }

  test(
    "[EG] status change on an unknown id → 404, on a malformed id → 400",
    { tag: ["@TC-ADMINCONTACT-023", "@smoke"] },
    async ({ adminApi }) => {
      const admin = createApiClient(adminApi);
      const missing = await setStatus(
        admin,
        "000000000000000000000000",
        "resolved"
      );
      expect(missing.status()).toBe(404);
      expect((await errorOf(missing)).code).toBe("CONTACT_NOT_FOUND");
      const bad = await setStatus(admin, "not-a-ticket", "resolved");
      expect(bad.status()).toBe(400);
    }
  );
});

test(
  "Reopening and skipping are accepted",
  { tag: "@TC-ADMINCONTACT-028" },
  async ({ adminApi, guestApi }) => {
    // [ST] the API has no transition guard: any of the three states can be
    // set from any other, including reopening a resolved request and
    // skipping processing. Recorded as current behaviour (decisions Q1).
    const admin = createApiClient(adminApi);
    const c = await fileTicket(guestApi, "api-reopen");
    expect((await setStatus(admin, c.id, "resolved")).ok()).toBe(true);
    expect(await statusOf(admin, c.id)).toBe("resolved");
    expect((await setStatus(admin, c.id, "new")).ok()).toBe(true);
    expect(await statusOf(admin, c.id)).toBe("new");
    // Same-state update is a no-op success.
    expect((await setStatus(admin, c.id, "new")).ok()).toBe(true);
  }
);

test.describe("Only admins reach the inbox endpoints", () => {
  const PLACEHOLDER = "000000000000000000000000";
  const calls: [string, (api: ApiClient) => ReturnType<ApiClient["call"]>][] = [
    ["GET /admin/contacts", (api) => api.contact.adminList()],
    ["GET /admin/contacts/:id", (api) => api.contact.adminGet(PLACEHOLDER)],
    [
      "PATCH /admin/contacts/:id/status",
      (api) => setStatus(api, PLACEHOLDER, "resolved")
    ]
  ];
  for (const [label, send] of calls) {
    test(
      `${label}: guest 401, user 403`,
      { tag: ["@TC-ADMINCONTACT-034", "@smoke"] },
      async ({ guestApi, userApi }) => {
        const guest = await send(createApiClient(guestApi));
        expect(guest.status()).toBe(401);
        expect((await errorOf(guest)).code).toBe("AUTH_MISSING_TOKEN");
        const user = await send(createApiClient(userApi));
        expect(user.status()).toBe(403);
        expect((await errorOf(user)).code).toBe("AUTH_ADMIN_ONLY");
      }
    );
  }
});

test(
  "Inbox responses carry translated messages, not catalogue keys",
  { tag: "@TC-ADMINCONTACT-035" },
  async ({ adminApi, guestApi }) => {
    const admin = createApiClient(adminApi);
    const c = await fileTicket(guestApi, "api-messages");
    const responses = {
      list: await admin.contact.adminList(),
      detail: await admin.contact.adminGet(c.id),
      update: await setStatus(admin, c.id, "processing")
    };
    for (const [name, res] of Object.entries(responses)) {
      expect(res.status(), name).toBe(200);
      const { message } = (await res.json()) as { message: string };
      expect(message, name).not.toMatch(CATALOGUE_KEY_RE);
    }
    // Field errors of a malformed id and of an invalid / missing status.
    for (const res of [
      await admin.contact.adminGet("not-a-ticket"),
      await admin.contact.adminUpdateStatus(c.id, { status: "closed" }),
      await admin.contact.adminUpdateStatus(c.id, {})
    ]) {
      const err = await errorOf(res);
      expect(err.errors?.length, res.url()).toBeGreaterThan(0);
      for (const e of err.errors ?? [])
        expect(e.message, `${res.url()} ${e.field}`).not.toMatch(
          CATALOGUE_KEY_RE
        );
    }
  }
);

test(
  "Paging past the last page returns no rows",
  { tag: "@TC-ADMINCONTACT-036" },
  async ({ adminApi, guestApi }) => {
    // [BVA] limit 1: page = totalPages is the last row, totalPages + 1 is
    // empty and echoes the page asked for.
    const admin = createApiClient(adminApi);
    await fileTicket(guestApi, "api-paging");
    const first = await list(admin, { limit: 1, page: 1 });
    expect(first.items).toHaveLength(1);
    expect(first.meta).toMatchObject({ page: 1, limit: 1 });
    expect(first.meta.totalPages).toBe(first.meta.total);

    const last = await list(admin, { limit: 1, page: first.meta.totalPages });
    expect(last.items).toHaveLength(1);

    const past = await list(admin, {
      limit: 1,
      page: first.meta.totalPages + 1
    });
    expect(past.items).toEqual([]);
    expect(past.meta).toMatchObject({
      page: first.meta.totalPages + 1,
      limit: 1,
      totalPages: first.meta.totalPages
    });
  }
);

test(
  "Sorting follows sortBy and sortOrder",
  { tag: "@TC-ADMINCONTACT-037" },
  async ({ adminApi, guestApi }) => {
    // [EP] createdAt asc (oldest first) and status asc, against the default
    // newest-first order proven by TC-ADMINCONTACT-030.
    const admin = createApiClient(adminApi);
    await fileTicket(guestApi, "api-sort");
    const asc = (
      await list(admin, { sortBy: "createdAt", sortOrder: "asc", limit: 100 })
    ).items.map((i) => Date.parse(i.createdAt));
    expect([...asc].sort((a, b) => a - b)).toEqual(asc);

    const byStatus = (
      await list(admin, { sortBy: "status", sortOrder: "asc", limit: 100 })
    ).items.map((i) => i.status);
    expect([...byStatus].sort()).toEqual(byStatus);
  }
);

test(
  "Search and email filter ignore surrounding whitespace",
  { tag: "@TC-ADMINCONTACT-041" },
  async ({ adminApi, guestApi }) => {
    // [EG] leading / trailing spaces are trimmed (Joi .trim()) before matching.
    const admin = createApiClient(adminApi);
    const local = `trim-${Date.now().toString(36)}`;
    const c = await fileTicket(guestApi, "api-trim", {
      email: `${local}@e2e.example.com`
    });
    const ids = async (params: Record<string, string>) =>
      (await list(admin, { ...params, limit: 100 })).items.map((i) => i._id);
    expect(await ids({ search: `  ${c.subject}  ` })).toEqual([c.id]);
    expect(await ids({ email: `  ${local}  ` })).toEqual([c.id]);
  }
);
