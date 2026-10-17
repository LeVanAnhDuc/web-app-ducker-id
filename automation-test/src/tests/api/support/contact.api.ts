import { test, expect } from "@/fixtures";
import type { APIRequestContext } from "@playwright/test";
import { createApiClient, type ApiClient } from "@/api";
import type {
  MyContactDetail,
  MyContactsPage,
  SubmittedContact
} from "@/api/contact.client";
import { dataOf, errorOf } from "@/api/response";
import { apiAs } from "@/api/session";
import type { MyProfile } from "@/api/user.client";
import { SUPPORT_MESSAGE } from "@/data/test-data";
import { createAccount, type Account } from "@/utils/accounts";
import {
  deleteContactsById,
  deleteSupportRequests,
  findContact,
  supportSubject
} from "@/utils/contacts";
import { clearRateLimits } from "@/utils/redis";

// Support requests over HTTP (api/contact.client.ts):
//   POST /contact/submit — public; attaches the owner when signed in
//   GET  /contacts(/:id)  — the caller's own requests only
// Validation boundaries and sanitising, the per-IP rate limit, paging,
// filters and sorting, isolation between users and authorisation.
// Test cases: test-cases/support.md (TC-SUPPORT-040 … 052).
//
// Every request filed carries the SUPPORT subject prefix and is deleted in
// afterAll; signed-in submits run on throwaway accounts.

test.describe.configure({ mode: "serial" });

// Ids of accepted requests whose subject is too short for the prefix.
const unprefixed: string[] = [];

test.afterAll(async () => {
  await deleteSupportRequests();
  await deleteContactsById(unprefixed);
});

/** A throwaway account with its own Bearer client. The caller disposes `ctx`. */
async function fresh(
  tag: string
): Promise<{ account: Account; api: ApiClient; ctx: APIRequestContext }> {
  const account = await createAccount({ tag });
  const ctx = await apiAs(account.email, account.password);
  return { account, api: createApiClient(ctx), ctx };
}

test(
  "A guest submit is accepted and owned by nobody",
  { tag: ["@TC-SUPPORT-040", "@smoke"] },
  async ({ guestApi, userApi }) => {
    const subject = supportSubject("api-guest");
    const res = await createApiClient(guestApi).contact.submit({
      subject,
      message: SUPPORT_MESSAGE,
      email: "reply@e2e.example.com"
    });
    expect(res.status()).toBe(201);
    const data = await dataOf<SubmittedContact>(res);
    expect(data.id).toMatch(/^[0-9a-f]{24}$/);
    expect(data).toMatchObject({
      subject,
      email: "reply@e2e.example.com",
      status: "new"
    });
    // Nobody's list holds it, and it is not reachable by id.
    expect(
      (await createApiClient(userApi).contact.getMine(data.id)).status()
    ).toBe(404);
  }
);

test(
  "A signed-in submit is attached to the caller",
  { tag: ["@TC-SUPPORT-041", "@smoke"] },
  async () => {
    const { api, ctx } = await fresh("support-api-owner");
    try {
      const subject = supportSubject("api-owner");
      const res = await api.contact.submit({
        subject,
        message: SUPPORT_MESSAGE
      });
      expect(res.status()).toBe(201);
      const data = await dataOf<SubmittedContact>(res);

      const list = await dataOf<MyContactsPage>(await api.contact.listMine());
      expect(list.items.map((i) => i._id)).toEqual([data.id]);
      expect(list.meta).toMatchObject({ total: 1, totalPages: 1 });

      const detail = await api.contact.getMine(data.id);
      expect(detail.status()).toBe(200);
      expect(await dataOf<MyContactDetail>(detail)).toMatchObject({
        subject,
        message: SUPPORT_MESSAGE,
        status: "new"
      });
    } finally {
      await ctx.dispose();
    }
  }
);

test.describe("Submit validation boundaries", () => {
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
        const res = await createApiClient(guestApi).contact.submit(body);
        expect(res.status(), await res.text()).toBe(status);
        if (status === 400) expect((await errorOf(res)).code).toBeTruthy();
        else unprefixed.push((await dataOf<SubmittedContact>(res)).id);
      }
    );
  }
});

test.describe("rate limit", () => {
  test.use({ keepRateLimits: true });

  test(
    "Submits are rate limited per IP",
    { tag: "@TC-SUPPORT-043" },
    async ({ guestApi }) => {
      const contact = createApiClient(guestApi).contact;
      await clearRateLimits();
      for (let i = 1; i <= 5; i += 1) {
        const res = await contact.submit({
          subject: supportSubject(`limit-${i}`),
          message: SUPPORT_MESSAGE
        });
        expect(res.status(), `submit ${i}`).toBe(201);
      }
      const sixth = await contact.submit({
        subject: supportSubject("limit-6"),
        message: SUPPORT_MESSAGE
      });
      expect(sixth.status()).toBe(429);
      expect((await errorOf(sixth)).code).toBeTruthy();
      await clearRateLimits();
    }
  );
});

test(
  "My-requests paging, filters and validation",
  { tag: "@TC-SUPPORT-044" },
  async () => {
    const { api, ctx } = await fresh("support-api-list");
    try {
      const subjects = [1, 2, 3].map((i) => supportSubject(`list-${i}`));
      for (const subject of subjects) {
        await api.contact.submit({ subject, message: SUPPORT_MESSAGE });
      }
      const page = async (params: Record<string, string | number>) => {
        const res = await api.contact.listMine(params);
        expect(res.status()).toBe(200);
        return dataOf<MyContactsPage>(res);
      };
      const p1 = await page({ limit: 2, page: 1 });
      expect(p1.items).toHaveLength(2);
      expect(p1.meta).toMatchObject({ total: 3, totalPages: 2 });
      expect((await page({ limit: 2, page: 2 })).items).toHaveLength(1);
      expect((await page({ limit: 2, page: 3 })).items).toEqual([]);

      expect((await page({ status: "new" })).meta.total).toBe(3);
      expect((await page({ status: "resolved" })).items).toEqual([]);
      const hit = await page({ search: subjects[1] });
      expect(hit.items.map((i) => i.subject)).toEqual([subjects[1]]);

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
        const res = await api.contact.listMine(params);
        expect(res.status(), JSON.stringify(params)).toBe(400);
      }
    } finally {
      await ctx.dispose();
    }
  }
);

test(
  "Another user's request is not listed or reachable",
  { tag: ["@TC-SUPPORT-045", "@smoke"] },
  async () => {
    const alice = await fresh("support-alice");
    const bob = await fresh("support-bob");
    try {
      const res = await alice.api.contact.submit({
        subject: supportSubject("alice"),
        message: SUPPORT_MESSAGE
      });
      const data = await dataOf<SubmittedContact>(res);

      const bobList = await dataOf<MyContactsPage>(
        await bob.api.contact.listMine()
      );
      expect(bobList.items).toEqual([]);
      const cross = await bob.api.contact.getMine(data.id);
      expect(cross.status()).toBe(404);
      expect(await cross.text()).not.toContain(SUPPORT_MESSAGE);

      expect((await bob.api.contact.getMine("not-an-id")).status()).toBe(400);
      expect(
        (await bob.api.contact.getMine("ffffffffffffffffffffffff")).status()
      ).toBe(404);
      // The admin inbox is not reachable for a regular user either.
      expect((await bob.api.contact.adminList()).status()).toBe(403);
    } finally {
      await Promise.all([alice.ctx.dispose(), bob.ctx.dispose()]);
    }
  }
);

test(
  "My requests need a session; submitting does not",
  { tag: ["@TC-SUPPORT-046", "@smoke"] },
  async ({ guestApi }) => {
    const contact = createApiClient(guestApi).contact;
    expect((await contact.listMine()).status()).toBe(401);
    expect((await contact.getMine("ffffffffffffffffffffffff")).status()).toBe(
      401
    );
    // A garbage token on the public submit is rejected, not treated as guest.
    const bad = await contact.submit(
      { subject: supportSubject("bad-token"), message: SUPPORT_MESSAGE },
      { Authorization: "Bearer garbage" }
    );
    expect([401, 403]).toContain(bad.status());
  }
);

test(
  "The own-request detail contract",
  { tag: "@TC-SUPPORT-047" },
  async () => {
    const { api, account, ctx } = await fresh("support-api-detail");
    try {
      const subject = supportSubject("detail");
      const res = await api.contact.submit({
        subject,
        message: SUPPORT_MESSAGE
      });
      const data = await dataOf<SubmittedContact>(res);
      const detail = await dataOf<MyContactDetail>(
        await api.contact.getMine(data.id)
      );
      expect(detail).toMatchObject({
        _id: data.id,
        subject,
        message: SUPPORT_MESSAGE,
        status: "new"
      });
      expect(["low", "medium", "high"]).toContain(detail.priority);
      expect(Date.parse(detail.createdAt)).not.toBeNaN();
      // A signed-in submit replies to the account email.
      expect([account.email, null, undefined]).toContain(detail.email);
    } finally {
      await ctx.dispose();
    }
  }
);

test.describe("Length is counted after markup and whitespace are stripped", () => {
  // The server strips tags and trims before it checks the 5 / 20 minimums
  // (submit-contact.ts → sanitizeText + validateStringLength), so padding a
  // short value with spaces or markup does not get it through.
  for (const [label, body, status] of [
    [
      "subject of 4 characters padded with spaces",
      { subject: "   abcd   ", message: SUPPORT_MESSAGE },
      400
    ],
    [
      "subject of 4 characters wrapped in a tag",
      { subject: "<b>abcd</b>", message: SUPPORT_MESSAGE },
      400
    ],
    [
      "subject of 5 characters wrapped in a tag",
      { subject: "<b>abcde</b>", message: SUPPORT_MESSAGE },
      201
    ],
    [
      "message of 19 characters wrapped in a tag",
      {
        subject: `${supportSubject("tag-msg")}`,
        message: `<p>${"m".repeat(19)}</p>`
      },
      400
    ]
  ] as const) {
    test(
      `${label} → ${status}`,
      { tag: "@TC-SUPPORT-048" },
      async ({ guestApi }) => {
        const res = await createApiClient(guestApi).contact.submit(body);
        expect(res.status(), await res.text()).toBe(status);
        if (status === 400) expect((await errorOf(res)).code).toBeTruthy();
        else unprefixed.push((await dataOf<SubmittedContact>(res)).id);
      }
    );
  }
});

test(
  "Markup is stripped before a request is stored",
  { tag: "@TC-SUPPORT-049" },
  async ({ guestApi }) => {
    const markup = '<img src="x" onerror="alert(1)">';
    const subject = `${supportSubject("markup")} ${markup}`;
    const res = await createApiClient(guestApi).contact.submit({
      subject,
      message: `${SUPPORT_MESSAGE} ${markup}`
    });
    expect(res.status()).toBe(201);
    const data = await dataOf<SubmittedContact>(res);
    const stored = await findContact(data.id);
    expect(stored?.subject).not.toContain("<img");
    expect(stored?.message).not.toContain("<img");
    expect(data.subject).not.toContain("<img");
  }
);

test(
  "The body cannot set status, priority or owner",
  { tag: "@TC-SUPPORT-050" },
  async ({ userApi }) => {
    const { api, ctx } = await fresh("support-api-fields");
    const seededUser = createApiClient(userApi);
    try {
      const subject = supportSubject("fields");
      const me = await dataOf<MyProfile>(await seededUser.users.me());
      const res = await api.contact.submit({
        subject,
        message: SUPPORT_MESSAGE,
        status: "resolved",
        priority: "high",
        userId: me._id
      });
      expect(res.status()).toBe(201);
      const data = await dataOf<SubmittedContact>(res);
      expect(data).toMatchObject({ status: "new", priority: "medium" });

      // Owned by the caller (session), not by the id in the body.
      const mine = await dataOf<MyContactsPage>(await api.contact.listMine());
      expect(mine.items.map((i) => i._id)).toEqual([data.id]);
      expect((await seededUser.contact.getMine(data.id)).status()).toBe(404);
    } finally {
      await ctx.dispose();
    }
  }
);

test(
  "My requests are newest first and can be sorted",
  { tag: "@TC-SUPPORT-051" },
  async () => {
    const { api, ctx } = await fresh("support-api-sort");
    try {
      const subjects = [1, 2, 3].map((i) => supportSubject(`sort-${i}`));
      for (const subject of subjects) {
        const res = await api.contact.submit({
          subject,
          message: SUPPORT_MESSAGE
        });
        expect(res.status()).toBe(201);
      }
      const order = async (params?: Record<string, string>) => {
        const res = await api.contact.listMine(params);
        expect(res.status(), JSON.stringify(params)).toBe(200);
        return (await dataOf<MyContactsPage>(res)).items.map((i) => i.subject);
      };
      expect(await order()).toEqual([...subjects].reverse());
      expect(await order({ sortBy: "createdAt", sortOrder: "asc" })).toEqual(
        subjects
      );
      for (const sortBy of ["priority", "status"]) {
        expect(await order({ sortBy })).toHaveLength(3);
      }
    } finally {
      await ctx.dispose();
    }
  }
);

test(
  "Regex characters in search are matched literally",
  { tag: "@TC-SUPPORT-052" },
  async () => {
    const { api, ctx } = await fresh("support-api-regex");
    try {
      const subject = supportSubject("regex");
      await api.contact.submit({ subject, message: SUPPORT_MESSAGE });
      for (const search of [".*", "(", "[a-z]+", "\\"]) {
        const res = await api.contact.listMine({ search });
        expect(res.status(), search).toBe(200);
        expect((await dataOf<MyContactsPage>(res)).items, search).toEqual([]);
      }
      // A literal piece of the subject still matches.
      const hit = await dataOf<MyContactsPage>(
        await api.contact.listMine({ search: "regex" })
      );
      expect(hit.items.map((i) => i.subject)).toEqual([subject]);
    } finally {
      await ctx.dispose();
    }
  }
);
