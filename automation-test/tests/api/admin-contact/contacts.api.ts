import { test, expect } from "@fixtures";
import type { APIRequestContext } from "@playwright/test";
import {
  deleteTestContacts,
  setContactStatus,
  submitContact
} from "@helpers/adminContact";

// /api/v1/admin/contacts — list contract, filters, validation, detail, the
// status workflow (state transitions, valid and invalid) and access control.
// Every request a test reads or changes is one it filed itself; afterAll
// deletes them. Test cases: test-cases/admin-contact.md.

const LIST = "/api/v1/admin/contacts";

interface Item {
  _id: string;
  email: string | null;
  subject: string;
  priority: string;
  status: "new" | "processing" | "resolved";
  createdAt: string;
  updatedAt: string;
}
interface Page {
  items: Item[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

test.afterAll(async () => {
  await deleteTestContacts();
});

const list = async (
  api: APIRequestContext,
  params: Record<string, string | number>
): Promise<Page> => {
  const res = await api.get(LIST, { params });
  expect(res.status(), JSON.stringify(params)).toBe(200);
  return ((await res.json()) as { data: Page }).data;
};

const statusOf = async (api: APIRequestContext, id: string) =>
  ((await (await api.get(`${LIST}/${id}`)).json()) as { data: Item }).data
    .status;

test(
  "list returns the envelope with paginated requests, newest first",
  { tag: ["@TC-ADMCONTACT-030", "@smoke"] },
  async ({ adminApi, guestApi }) => {
    const c = await submitContact(guestApi, { tag: "api-contract" });
    const res = await adminApi.get(LIST);
    expect(res.status()).toBe(200);
    const body = (await res.json()) as {
      timestamp: string;
      path: string;
      data: Page;
    };
    expect(body.path).toContain("/admin/contacts");
    const { items, meta } = body.data;
    expect(meta).toMatchObject({ page: 1, limit: 20 });
    expect(meta.totalPages).toBe(Math.ceil(meta.total / meta.limit));
    const mine = items.find((i) => i._id === c._id);
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

test.describe("list filters", () => {
  // [DT] search × status × email for one request in a known state.
  test(
    "search, status, email and date filters combine with AND",
    { tag: "@TC-ADMCONTACT-031" },
    async ({ adminApi, guestApi }) => {
      const local = `apif-${Date.now().toString(36)}`;
      const c = await submitContact(guestApi, {
        tag: "api-filters",
        email: `${local}@e2e.example.com`
      });
      expect((await setContactStatus(adminApi, c._id, "processing")).ok()).toBe(
        true
      );
      const ids = async (params: Record<string, string>) =>
        (await list(adminApi, { ...params, limit: 100 })).items.map(
          (i) => i._id
        );
      const today = new Date();
      const day = (o: number) =>
        new Date(today.getTime() + o * 86_400_000).toISOString();

      expect(await ids({ search: c.subject })).toEqual([c._id]);
      expect(await ids({ search: c.subject.toUpperCase() })).toEqual([c._id]);
      expect(await ids({ search: local })).toEqual([c._id]);
      expect(await ids({ search: c.subject, status: "processing" })).toEqual([
        c._id
      ]);
      expect(await ids({ search: c.subject, status: "new" })).toEqual([]);
      expect(await ids({ email: local.toUpperCase() })).toEqual([c._id]);
      expect(await ids({ email: local, status: "resolved" })).toEqual([]);
      expect(await ids({ search: c.subject, priority: "medium" })).toEqual([
        c._id
      ]);
      expect(await ids({ search: c.subject, priority: "high" })).toEqual([]);
      expect(
        await ids({ search: c.subject, fromDate: day(-1), toDate: day(1) })
      ).toEqual([c._id]);
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
});

test.describe("list validation", () => {
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
      { tag: "@TC-ADMCONTACT-032" },
      async ({ adminApi }) => {
        const res = await adminApi.get(LIST, { params });
        expect(res.status()).toBe(status);
        if (status === 400)
          expect(((await res.json()) as { code: string }).code).toBe(
            "VALIDATION_ERROR"
          );
      }
    );
  }
});

test.describe("detail", () => {
  test(
    "GET /:id returns the full request including the message",
    { tag: "@TC-ADMCONTACT-033" },
    async ({ adminApi, guestApi }) => {
      const c = await submitContact(guestApi, {
        tag: "api-detail",
        email: "api-detail@e2e.example.com"
      });
      const res = await adminApi.get(`${LIST}/${c._id}`);
      expect(res.status()).toBe(200);
      const d = ((await res.json()) as { data: Item & { message: string } })
        .data;
      expect(d).toMatchObject({
        _id: c._id,
        subject: c.subject,
        message: c.message,
        email: "api-detail@e2e.example.com",
        status: "new"
      });
    }
  );

  test(
    "[EG] malformed id → 400, unknown id → 404 CONTACT_NOT_FOUND",
    { tag: "@TC-ADMCONTACT-033" },
    async ({ adminApi }) => {
      const bad = await adminApi.get(`${LIST}/not-a-ticket`);
      expect(bad.status()).toBe(400);
      expect(((await bad.json()) as { code: string }).code).toBe(
        "VALIDATION_ERROR"
      );
      const missing = await adminApi.get(`${LIST}/000000000000000000000000`);
      expect(missing.status()).toBe(404);
      expect(((await missing.json()) as { code: string }).code).toBe(
        "CONTACT_NOT_FOUND"
      );
    }
  );
});

test.describe("status workflow", () => {
  test(
    "[ST] new → processing → resolved, each step persisted",
    { tag: "@TC-ADMCONTACT-021" },
    async ({ adminApi, guestApi }) => {
      const c = await submitContact(guestApi, { tag: "api-workflow" });
      expect(await statusOf(adminApi, c._id)).toBe("new");
      for (const next of ["processing", "resolved"] as const) {
        const res = await setContactStatus(adminApi, c._id, next);
        expect(res.status()).toBe(200);
        const body = (await res.json()) as { data: Item };
        expect(body.data).toMatchObject({ _id: c._id, status: next });
        expect(Date.parse(body.data.updatedAt)).toBeGreaterThanOrEqual(
          Date.parse(body.data.createdAt)
        );
        expect(await statusOf(adminApi, c._id)).toBe(next);
      }
    }
  );

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
      { tag: "@TC-ADMCONTACT-023" },
      async ({ adminApi, guestApi }) => {
        const c = await submitContact(guestApi, { tag: "api-invalid" });
        expect(
          (await setContactStatus(adminApi, c._id, "processing")).ok()
        ).toBe(true);
        const res = await adminApi.patch(`${LIST}/${c._id}/status`, {
          data: body
        });
        expect(res.status()).toBe(400);
        expect(((await res.json()) as { code: string }).code).toBe(
          "VALIDATION_ERROR"
        );
        expect(await statusOf(adminApi, c._id)).toBe("processing");
      }
    );
  }

  test(
    "[EG] status change on an unknown id → 404, on a malformed id → 400",
    { tag: "@TC-ADMCONTACT-023" },
    async ({ adminApi }) => {
      const missing = await setContactStatus(
        adminApi,
        "000000000000000000000000",
        "resolved"
      );
      expect(missing.status()).toBe(404);
      expect(((await missing.json()) as { code: string }).code).toBe(
        "CONTACT_NOT_FOUND"
      );
      const bad = await setContactStatus(adminApi, "not-a-ticket", "resolved");
      expect(bad.status()).toBe(400);
    }
  );

  // [ST] the API has no transition guard: any of the three states can be set
  // from any other, including reopening a resolved request and skipping
  // processing. Recorded as current behaviour (see TC-ADMCONTACT-028).
  test(
    "[ST] resolved → new (reopen) and new → resolved (skip) are accepted",
    { tag: "@TC-ADMCONTACT-028" },
    async ({ adminApi, guestApi }) => {
      const c = await submitContact(guestApi, { tag: "api-reopen" });
      expect((await setContactStatus(adminApi, c._id, "resolved")).ok()).toBe(
        true
      );
      expect(await statusOf(adminApi, c._id)).toBe("resolved");
      expect((await setContactStatus(adminApi, c._id, "new")).ok()).toBe(true);
      expect(await statusOf(adminApi, c._id)).toBe("new");
      // Same-state update is a no-op success.
      expect((await setContactStatus(adminApi, c._id, "new")).ok()).toBe(true);
    }
  );
});

test.describe("access control", () => {
  const PLACEHOLDER = "000000000000000000000000";
  for (const [method, url, data] of [
    ["GET", LIST, undefined],
    ["GET", `${LIST}/${PLACEHOLDER}`, undefined],
    ["PATCH", `${LIST}/${PLACEHOLDER}/status`, { status: "resolved" }]
  ] as const) {
    test(
      `${method} ${url.replace(PLACEHOLDER, ":id")}: guest 401, user 403`,
      { tag: "@TC-ADMCONTACT-034" },
      async ({ guestApi, userApi }) => {
        const guest = await guestApi.fetch(url, { method, data });
        expect(guest.status()).toBe(401);
        expect(((await guest.json()) as { code: string }).code).toBe(
          "AUTH_MISSING_TOKEN"
        );
        const user = await userApi.fetch(url, { method, data });
        expect(user.status()).toBe(403);
        expect(((await user.json()) as { code: string }).code).toBe(
          "AUTH_ADMIN_ONLY"
        );
      }
    );
  }
});
