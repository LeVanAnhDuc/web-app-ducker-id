import { test, expect, apiAs } from "@fixtures";
import type { APIRequestContext } from "@playwright/test";
import { createAccount } from "@helpers/accounts";
import { clearRateLimits } from "@helpers/redis";
import {
  deleteContactsById,
  deleteSupportRequests,
  SUPPORT_MESSAGE,
  supportSubject
} from "@helpers/support";

// Support requests over HTTP:
//   POST /api/v1/contact/submit — public; attaches the owner when signed in
//   GET  /api/v1/contacts(/:id)  — the caller's own requests only
// Validation boundaries, the per-IP rate limit, paging and filters,
// isolation between users and authorisation.
// Test cases: test-cases/support.md (TC-SUPPORT-040 … 047).
//
// Every request filed carries the SUPPORT subject prefix and is deleted in
// afterAll; signed-in submits run on throwaway accounts.

const SUBMIT = "/api/v1/contact/submit";
const MINE = "/api/v1/contacts";

test.describe.configure({ mode: "serial" });

// Ids of accepted requests whose subject is too short for the prefix.
const unprefixed: string[] = [];

test.afterAll(async () => {
  await deleteSupportRequests();
  await deleteContactsById(unprefixed);
});

interface Submitted {
  id: string;
  email: string | null;
  subject: string;
  message: string;
  priority: string;
  status: string;
}

async function submit(api: APIRequestContext, data: Record<string, unknown>) {
  return api.post(SUBMIT, { data });
}

async function fresh(tag: string) {
  const account = await createAccount({ tag });
  return { account, api: await apiAs(account.email, account.password) };
}

test(
  "a guest submit is accepted and owned by nobody",
  { tag: ["@TC-SUPPORT-040", "@smoke"] },
  async ({ guestApi, userApi }) => {
    const subject = supportSubject("api-guest");
    const res = await submit(guestApi, {
      subject,
      message: SUPPORT_MESSAGE,
      email: "reply@e2e.example.com"
    });
    expect(res.status()).toBe(201);
    const { data } = (await res.json()) as { data: Submitted };
    expect(data.id).toMatch(/^[0-9a-f]{24}$/);
    expect(data).toMatchObject({
      subject,
      email: "reply@e2e.example.com",
      status: "new"
    });
    // Nobody's list holds it, and it is not reachable by id.
    expect((await userApi.get(`${MINE}/${data.id}`)).status()).toBe(404);
  }
);

test(
  "a signed-in submit is attached to the caller and listed for them",
  { tag: ["@TC-SUPPORT-041", "@smoke"] },
  async () => {
    const { api } = await fresh("support-api-owner");
    try {
      const subject = supportSubject("api-owner");
      const res = await submit(api, { subject, message: SUPPORT_MESSAGE });
      expect(res.status()).toBe(201);
      const { data } = (await res.json()) as { data: Submitted };

      const list = await api.get(MINE);
      const body = await list.json();
      expect(body.data.items.map((i: { _id: string }) => i._id)).toEqual([
        data.id
      ]);
      expect(body.data.meta).toMatchObject({ total: 1, totalPages: 1 });

      const detail = await api.get(`${MINE}/${data.id}`);
      expect(detail.status()).toBe(200);
      expect((await detail.json()).data).toMatchObject({
        subject,
        message: SUPPORT_MESSAGE,
        status: "new"
      });
    } finally {
      await api.dispose();
    }
  }
);

test.describe("validation [BVA][EP]", () => {
  const sub = (n: number) =>
    `${supportSubject("bva")}`.padEnd(n, "s").slice(0, n);
  for (const [label, body, status] of [
    ["subject 4", { subject: "abcd", message: SUPPORT_MESSAGE }, 400],
    ["subject 5", { subject: "E2E s", message: SUPPORT_MESSAGE }, 201],
    ["subject 200", { subject: sub(200), message: SUPPORT_MESSAGE }, 201],
    ["subject 201", { subject: sub(201), message: SUPPORT_MESSAGE }, 400],
    ["message 19", { subject: sub(30), message: "m".repeat(19) }, 400],
    ["message 20", { subject: sub(30), message: "m".repeat(20) }, 201],
    ["message 5000", { subject: sub(30), message: "m".repeat(5000) }, 201],
    ["message 5001", { subject: sub(30), message: "m".repeat(5001) }, 400],
    ["missing subject", { message: SUPPORT_MESSAGE }, 400],
    ["missing message", { subject: sub(30) }, 400],
    [
      "invalid email",
      { subject: sub(30), message: SUPPORT_MESSAGE, email: "not-an-email" },
      400
    ],
    [
      "empty email",
      { subject: sub(30), message: SUPPORT_MESSAGE, email: "" },
      201
    ],
    [
      "whitespace-only subject",
      { subject: "      ", message: SUPPORT_MESSAGE },
      400
    ]
  ] as const) {
    test(
      `${label} → ${status}`,
      { tag: "@TC-SUPPORT-042" },
      async ({ guestApi }) => {
        const res = await submit(guestApi, body);
        expect(res.status(), await res.text()).toBe(status);
        if (status === 400) expect((await res.json()).code).toBeTruthy();
        else
          unprefixed.push(((await res.json()) as { data: Submitted }).data.id);
      }
    );
  }
});

test.describe("rate limit", () => {
  test.use({ keepRateLimits: true });

  test(
    "five submits per IP pass, the sixth is 429",
    { tag: "@TC-SUPPORT-043" },
    async ({ guestApi }) => {
      await clearRateLimits();
      for (let i = 1; i <= 5; i += 1) {
        const res = await submit(guestApi, {
          subject: supportSubject(`limit-${i}`),
          message: SUPPORT_MESSAGE
        });
        expect(res.status(), `submit ${i}`).toBe(201);
      }
      const sixth = await submit(guestApi, {
        subject: supportSubject("limit-6"),
        message: SUPPORT_MESSAGE
      });
      expect(sixth.status()).toBe(429);
      expect((await sixth.json()).code).toBeTruthy();
      await clearRateLimits();
    }
  );
});

test(
  "my requests: paging, status filter, search and validation",
  { tag: "@TC-SUPPORT-044" },
  async () => {
    const { api } = await fresh("support-api-list");
    try {
      const subjects = [1, 2, 3].map((i) => supportSubject(`list-${i}`));
      for (const subject of subjects) {
        await submit(api, { subject, message: SUPPORT_MESSAGE });
      }
      const page = async (params: Record<string, string | number>) => {
        const res = await api.get(MINE, { params });
        expect(res.status()).toBe(200);
        return (await res.json()).data;
      };
      const p1 = await page({ limit: 2, page: 1 });
      expect(p1.items).toHaveLength(2);
      expect(p1.meta).toMatchObject({ total: 3, totalPages: 2 });
      expect((await page({ limit: 2, page: 2 })).items).toHaveLength(1);
      expect((await page({ limit: 2, page: 3 })).items).toEqual([]);

      expect((await page({ status: "new" })).meta.total).toBe(3);
      expect((await page({ status: "resolved" })).items).toEqual([]);
      const hit = await page({ search: subjects[1] });
      expect(hit.items.map((i: { subject: string }) => i.subject)).toEqual([
        subjects[1]
      ]);

      const invalid: Record<string, string | number>[] = [
        { page: 0 },
        { limit: 0 },
        { limit: 101 },
        { status: "closed" },
        { sortBy: "password" },
        { sortOrder: "sideways" },
        { search: "a".repeat(201) }
      ];
      for (const params of invalid) {
        const res = await api.get(MINE, { params });
        expect(res.status(), JSON.stringify(params)).toBe(400);
      }
    } finally {
      await api.dispose();
    }
  }
);

test(
  "a user cannot list or open another user's request",
  { tag: ["@TC-SUPPORT-045", "@smoke"] },
  async () => {
    const alice = await fresh("support-alice");
    const bob = await fresh("support-bob");
    try {
      const res = await submit(alice.api, {
        subject: supportSubject("alice"),
        message: SUPPORT_MESSAGE
      });
      const { data } = (await res.json()) as { data: Submitted };

      const bobList = await (await bob.api.get(MINE)).json();
      expect(bobList.data.items).toEqual([]);
      const cross = await bob.api.get(`${MINE}/${data.id}`);
      expect(cross.status()).toBe(404);
      const body = await cross.text();
      expect(body).not.toContain(SUPPORT_MESSAGE);

      expect((await bob.api.get(`${MINE}/not-an-id`)).status()).toBe(400);
      expect(
        (await bob.api.get(`${MINE}/ffffffffffffffffffffffff`)).status()
      ).toBe(404);
      // The admin inbox is not reachable for a regular user either.
      expect((await bob.api.get("/api/v1/admin/contacts")).status()).toBe(403);
    } finally {
      await Promise.all([alice.api.dispose(), bob.api.dispose()]);
    }
  }
);

test(
  "my requests need a session; submitting does not",
  { tag: "@TC-SUPPORT-046" },
  async ({ guestApi }) => {
    expect((await guestApi.get(MINE)).status()).toBe(401);
    expect(
      (await guestApi.get(`${MINE}/ffffffffffffffffffffffff`)).status()
    ).toBe(401);
    // A garbage token on the public submit is rejected, not treated as guest.
    const bad = await guestApi.post(SUBMIT, {
      data: { subject: supportSubject("bad-token"), message: SUPPORT_MESSAGE },
      headers: { Authorization: "Bearer garbage" }
    });
    expect([401, 403]).toContain(bad.status());
  }
);

test(
  "the detail of an own request carries the read-only fields",
  { tag: "@TC-SUPPORT-047" },
  async () => {
    const { api, account } = await fresh("support-api-detail");
    try {
      const subject = supportSubject("detail");
      const res = await submit(api, { subject, message: SUPPORT_MESSAGE });
      const { data } = (await res.json()) as { data: Submitted };
      const detail = await (await api.get(`${MINE}/${data.id}`)).json();
      expect(detail.data).toMatchObject({
        _id: data.id,
        subject,
        message: SUPPORT_MESSAGE,
        status: "new"
      });
      expect(["low", "medium", "high"]).toContain(detail.data.priority);
      expect(Date.parse(detail.data.createdAt)).not.toBeNaN();
      // A signed-in submit replies to the account email.
      expect([account.email, null, undefined]).toContain(detail.data.email);
    } finally {
      await api.dispose();
    }
  }
);
