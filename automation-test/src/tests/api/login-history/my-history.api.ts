import { test, expect } from "@/fixtures";
import { adminContext, apiAs } from "@/api/session";
import type { APIRequestContext } from "@playwright/test";
import { createApiClient, type ApiClient } from "@/api";
import type {
  MyLoginHistoryItem,
  MyLoginHistoryPage,
  MyLoginHistoryQuery
} from "@/api/login-history.client";
import { dataOf, errorOf } from "@/api/response";
import { serverMessage } from "@/data/copy";
import { createAccount } from "@/utils/accounts";
import type { Account } from "@/utils/accounts";
import {
  deleteOidcClients,
  obtainCode,
  registerClient,
  signedInUser
} from "@/utils/oidc-state";
import type { OidcClient } from "@/utils/oidc";

// GET /login-history — the caller's own sign-in attempts: contract, failed
// attempts with their reason, filters, sorting, paging, validation, isolation
// between users, the guards, IP masking and SSO rows.
// Test cases: test-cases/login-history.md (TC-LOGINHISTORY-020 … 027, 029,
// 034 … 038).
//
// Exact counts come from throwaway accounts (a fresh account's history is
// only what the test did); the seeded user is read for shape and order only.

const EN = { "Accept-Language": "en" };
const WRONG = "Wrong@12345";

const historyOf = (ctx: APIRequestContext) => createApiClient(ctx).loginHistory;

async function rows(
  api: APIRequestContext,
  params: MyLoginHistoryQuery = {}
): Promise<MyLoginHistoryPage> {
  const res = await historyOf(api).list(params);
  expect(res.status(), await res.text()).toBe(200);
  return dataOf<MyLoginHistoryPage>(res);
}

/** A failed password attempt from a cookie-less client. */
async function failOnce(
  newApi: () => Promise<ApiClient>,
  account: Account
): Promise<void> {
  const res = await (await newApi()).auth.login(account.email, WRONG);
  expect(res.ok()).toBe(false);
}

test(
  "List contract",
  { tag: ["@TC-LOGINHISTORY-020", "@smoke"] },
  async ({ userApi }) => {
    const { items, meta } = await rows(userApi, { limit: 5 });
    expect(meta).toMatchObject({ page: 1, limit: 5 });
    expect(items.length).toBeGreaterThan(0);
    for (const r of items) {
      for (const key of [
        "_id",
        "method",
        "status",
        "failReason",
        "ip",
        "country",
        "city",
        "deviceType",
        "os",
        "browser",
        "clientType",
        "createdAt",
        "source",
        "app",
        "interactive"
      ]) {
        expect(r, key).toHaveProperty(key);
      }
      expect(["success", "failed"]).toContain(r.status);
      expect(["idp", "oauth"]).toContain(r.source);
      // The raw IPv6 forms the server used to store never reach the client.
      expect(r.ip).not.toMatch(/^::ffff:|^::1$/);
    }
    for (let i = 1; i < items.length; i += 1) {
      expect(Date.parse(items[i - 1].createdAt)).toBeGreaterThanOrEqual(
        Date.parse(items[i].createdAt)
      );
    }
  }
);

test(
  "A wrong password is a failed row with a reason",
  { tag: ["@TC-LOGINHISTORY-021", "@smoke"] },
  async ({ newApi }) => {
    const account = await createAccount({ tag: "lh-fail" });
    await failOnce(newApi, account);
    const api = await apiAs(account.email, account.password);
    try {
      const { items } = await rows(api);
      const failed = items.filter((r) => r.status === "failed");
      expect(failed).toHaveLength(1);
      expect(failed[0].method).toBe("password");
      expect(failed[0].failReason).toBeTruthy();
      const ok = items.filter((r) => r.status === "success");
      expect(ok.length).toBeGreaterThanOrEqual(1);
      expect(ok.every((r) => r.failReason === null)).toBe(true);
    } finally {
      await api.dispose();
    }
  }
);

test(
  "Rows carry the anomaly flag",
  { tag: "@TC-LOGINHISTORY-022" },
  async ({ userApi }) => {
    // REQ-LOGINHISTORY-01 lists an anomaly flag on the user's own history,
    // but MyHistoryItemDto has no isAnomaly — only the admin DTO does.
    // BUG: defects/login-history.md#bug-loginhistory-01
    test.fail();
    const { items } = await rows(userApi, { limit: 5 });
    for (const r of items) expect(typeof r.isAnomaly).toBe("boolean");
  }
);

test(
  "Filters on the server",
  { tag: "@TC-LOGINHISTORY-023" },
  async ({ newApi }) => {
    const account = await createAccount({ tag: "lh-filter" });
    await failOnce(newApi, account);
    const api = await apiAs(account.email, account.password);
    try {
      const all = await rows(api);
      const failed = await rows(api, { status: "failed" });
      const success = await rows(api, { status: "success" });
      expect(failed.items.every((r) => r.status === "failed")).toBe(true);
      expect(success.items.every((r) => r.status === "success")).toBe(true);
      expect(failed.meta.total + success.meta.total).toBe(all.meta.total);

      const pw = await rows(api, { method: "password", status: "failed" });
      expect(pw.items).toHaveLength(1);
      expect((await rows(api, { method: "otp" })).items).toEqual([]);
      expect((await rows(api, { source: "oauth" })).items).toEqual([]);
      expect((await rows(api, { source: "idp" })).meta.total).toBe(
        all.meta.total
      );

      // A date-only bound covers the whole day.
      const today = new Date().toISOString().slice(0, 10);
      const yesterday = new Date(Date.now() - 86_400_000)
        .toISOString()
        .slice(0, 10);
      const tomorrow = new Date(Date.now() + 86_400_000)
        .toISOString()
        .slice(0, 10);
      expect(
        (await rows(api, { fromDate: yesterday, toDate: tomorrow })).meta.total
      ).toBe(all.meta.total);
      expect(
        (await rows(api, { fromDate: tomorrow })).items,
        `nothing after ${today}`
      ).toEqual([]);
    } finally {
      await api.dispose();
    }
  }
);

test(
  "Validation and page boundaries",
  { tag: "@TC-LOGINHISTORY-024" },
  async ({ userApi }) => {
    for (const [params, status] of [
      [{ status: "maybe" }, 400],
      [{ method: "telepathy" }, 400],
      [{ deviceType: "FRIDGE" }, 400],
      [{ source: "elsewhere" }, 400],
      [{ interactive: "sometimes" }, 400],
      [{ webAppId: "nope" }, 400],
      [{ fromDate: "yesterday" }, 400],
      [{ fromDate: "2026-10-05", toDate: "2026-10-01" }, 400],
      [{ sortBy: "password" }, 400],
      [{ page: 0 }, 400],
      [{ limit: 0 }, 400],
      [{ limit: 1 }, 200],
      [{ limit: 100 }, 200],
      [{ limit: 101 }, 400]
    ] as const) {
      const res = await historyOf(userApi).list(params);
      expect(res.status(), JSON.stringify(params)).toBe(status);
    }
    const first = await rows(userApi, { limit: 1 });
    const beyond = await rows(userApi, {
      limit: 1,
      page: first.meta.totalPages + 1
    });
    expect(beyond.items).toEqual([]);
    expect(beyond.meta.total).toBe(first.meta.total);
  }
);

test(
  "A user never sees another user's attempts",
  { tag: ["@TC-LOGINHISTORY-025", "@smoke"] },
  async ({ userApi, newApi }) => {
    const alice = await createAccount({ tag: "lh-alice" });
    const bob = await createAccount({ tag: "lh-bob" });
    await failOnce(newApi, bob);
    const aliceApi = await apiAs(alice.email, alice.password);
    try {
      const mine = await rows(aliceApi, { limit: 100 });
      // Alice's own history: her sign-up session and this sign-in — all
      // successful. Bob's failed attempt is not hers.
      expect(mine.items.every((r) => r.status === "success")).toBe(true);
      const seeded = await rows(userApi, { limit: 100 });
      const seededIds = new Set(seeded.items.map((r) => r._id));
      expect(mine.items.some((r) => seededIds.has(r._id))).toBe(false);

      // A userId filter is not part of the user endpoint: it is stripped,
      // so it cannot be used to read someone else's rows.
      const tampered = await rows(aliceApi, {
        userId: "ffffffffffffffffffffffff",
        limit: 100
      });
      expect(tampered.meta.total).toBe(mine.meta.total);
    } finally {
      await aliceApi.dispose();
    }
  }
);

test(
  "Session required; the admin list needs admin",
  { tag: ["@TC-LOGINHISTORY-026", "@smoke"] },
  async ({ guestApi, userApi }) => {
    expect((await historyOf(guestApi).list()).status()).toBe(401);
    expect((await historyOf(guestApi).stats()).status()).toBe(401);
    expect(
      (await createApiClient(userApi).adminLoginHistory.list()).status()
    ).toBe(403);
  }
);

test.describe("SSO rows", () => {
  let client: OidcClient | undefined;

  test.beforeAll(async () => {
    const admin = await adminContext();
    client = await registerClient(admin, { kind: "public", label: "lh-api" });
    await admin.dispose();
  });

  test.afterAll(async () => {
    if (client) await deleteOidcClients([client]);
  });

  test(
    "SSO rows name the app and filter by it",
    { tag: "@TC-LOGINHISTORY-027" },
    async () => {
      const signed = await signedInUser("lh-sso");
      const api = await apiAs(signed.account.email, signed.account.password);
      try {
        await obtainCode(signed.ctx, client!);
        await expect
          .poll(async () => (await rows(api, { method: "sso" })).items.length)
          .toBe(1);
        const [sso] = (await rows(api, { method: "sso" })).items;
        expect(sso).toMatchObject({
          method: "sso",
          status: "success",
          source: "oauth",
          interactive: false
        });
        expect(sso.app).toMatchObject({
          id: client!.id,
          name: client!.displayName
        });

        // The app filter: webAppId narrows to that app, source=idp excludes it.
        expect(
          (await rows(api, { webAppId: client!.id })).items.map((r) => r._id)
        ).toEqual([sso._id]);
        expect(
          (await rows(api, { source: "idp" })).items.map((r) => r._id)
        ).not.toContain(sso._id);
        expect(
          (await rows(api, { interactive: false })).items.map((r) => r._id)
        ).toEqual([sso._id]);
      } finally {
        await Promise.all([api.dispose(), signed.ctx.dispose()]);
      }
    }
  );
});

// ── IP masking ──────────────────────────────────────────────────────────────

const PUBLIC_IP = "203.0.113.7";
/** Loopback / private ranges the server shows in full (PRIVATE_IP_PATTERNS). */
const PRIVATE_IP =
  /^(127\.|10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|169\.254\.|fe80:|fc00:|fd00:)|^(localhost|0\.0\.0\.0|UNKNOWN)$/;
/** A masked public address: two IPv4 octets, or three IPv6 groups, then stars. */
const MASKED_IP = /^(\d+\.\d+\.\*\.\*|[\da-f]*:[\da-f]*:[\da-f]*(:\*){5})$/i;

// [Security] The sign-in comes in with a public X-Forwarded-For. Whether the
// server trusts it (TRUST_PROXY) decides which address is stored; either way
// the user's own list must never hand back a full public address.
test(
  "Public IPs are masked in the user's own history",
  { tag: "@TC-LOGINHISTORY-029" },
  async ({ newApi }) => {
    const account = await createAccount({ tag: "lh-mask" });
    const forwarded = await newApi({ "X-Forwarded-For": PUBLIC_IP });
    expect(
      (await forwarded.auth.login(account.email, account.password)).ok()
    ).toBe(true);
    const api = await apiAs(account.email, account.password);
    try {
      const { items } = await rows(api, { limit: 100 });
      expect(items.length).toBeGreaterThan(0);
      for (const r of items) {
        expect(r.ip, r._id).not.toBe(PUBLIC_IP);
        expect(
          PRIVATE_IP.test(r.ip) || MASKED_IP.test(r.ip),
          `ip ${r.ip} is private or masked`
        ).toBe(true);
      }
    } finally {
      await api.dispose();
    }
  }
);

// ── sorting, text filters, query hardening (REQ-LOGINHISTORY-06, -07) ──────

// [EP] sortBy × sortOrder on the user's own fields.
test(
  "The list sorts by the requested field and order",
  { tag: "@TC-LOGINHISTORY-034" },
  async ({ userApi }) => {
    const asc = await rows(userApi, {
      sortBy: "createdAt",
      sortOrder: "asc",
      limit: 100
    });
    const times = asc.items.map((r) => Date.parse(r.createdAt));
    expect(times.length).toBeGreaterThan(0);
    expect([...times].sort((a, b) => a - b)).toEqual(times);

    const byStatus = await rows(userApi, {
      sortBy: "status",
      sortOrder: "desc",
      limit: 100
    });
    const statuses = byStatus.items.map((r) => r.status);
    expect([...statuses].sort().reverse()).toEqual(statuses);

    const byMethod = await rows(userApi, {
      sortBy: "method",
      sortOrder: "asc",
      limit: 100
    });
    const methods = byMethod.items.map((r) => r.method);
    expect([...methods].sort()).toEqual(methods);
  }
);

// [EP] text filters match part of the value, ignoring case and surrounding
// spaces, literally (".*" is not a pattern); enum / boolean filters narrow to
// the account's own value. `ip` is an admin-only filter: stripped here.
test(
  "Text, device, client and interactive filters narrow the caller's attempts",
  { tag: "@TC-LOGINHISTORY-035" },
  async ({ newApi }) => {
    const account = await createAccount({ tag: "lh-text" });
    await failOnce(newApi, account);
    const api = await apiAs(account.email, account.password);
    try {
      const all = await rows(api, { limit: 100 });
      const [row] = all.items;
      const matching = (field: keyof MyLoginHistoryItem, probe: string) =>
        all.items.filter((r) =>
          String(r[field]).toLowerCase().includes(probe.trim().toLowerCase())
        ).length;

      for (const field of ["country", "city", "os", "browser"] as const) {
        const value = row[field];
        const part = value.slice(0, Math.max(1, Math.ceil(value.length / 2)));
        for (const probe of [
          value,
          part.toLowerCase(),
          part.toUpperCase(),
          `  ${value}  `
        ]) {
          const page = await rows(api, { [field]: probe, limit: 100 });
          expect(page.meta.total, `${field}=${JSON.stringify(probe)}`).toBe(
            matching(field, probe)
          );
        }
        const literal = await rows(api, { [field]: ".*" });
        expect(literal.meta.total, `${field}=".*"`).toBe(0);
      }

      const otherDevice = row.deviceType === "TABLET" ? "MOBILE" : "TABLET";
      const otherClient =
        row.clientType === "MOBILE_IOS" ? "MOBILE_ANDROID" : "MOBILE_IOS";
      const count = (pick: (r: MyLoginHistoryItem) => boolean) =>
        all.items.filter(pick).length;
      const cases: [MyLoginHistoryQuery, number][] = [
        [
          { deviceType: row.deviceType },
          count((r) => r.deviceType === row.deviceType)
        ],
        [{ deviceType: otherDevice }, 0],
        [
          { clientType: row.clientType },
          count((r) => r.clientType === row.clientType)
        ],
        [{ clientType: otherClient }, 0],
        [{ interactive: true }, all.meta.total],
        [{ interactive: false }, 0],
        [{ ip: "999.999.999.999" }, all.meta.total]
      ];
      for (const [params, n] of cases) {
        const page = await rows(api, { ...params, limit: 100 });
        expect(page.meta.total, JSON.stringify(params)).toBe(n);
      }
    } finally {
      await api.dispose();
    }
  }
);

// [EG] each invalid filter is named in `errors` with a readable message in
// the caller's language — never the raw i18n key.
const fieldErrors: {
  params: MyLoginHistoryQuery;
  field: string;
  message?: string;
  bug?: true;
}[] = [
  {
    params: { page: "0" },
    field: "page",
    message: serverMessage.validation.page.invalid
  },
  {
    params: { limit: "101" },
    field: "limit",
    message: serverMessage.validation.limit.invalid
  },
  {
    params: { status: "pending" },
    field: "status",
    message: serverMessage.validation.status.invalid
  },
  { params: { method: "telepathy" }, field: "method", bug: true },
  { params: { deviceType: "TOASTER" }, field: "deviceType", bug: true },
  { params: { clientType: "FRIDGE" }, field: "clientType", bug: true },
  {
    params: { source: "sideways" },
    field: "source",
    message: serverMessage.validation.source.invalid
  },
  {
    params: { webAppId: "123" },
    field: "webAppId",
    message: serverMessage.validation.webAppId.invalid
  },
  {
    params: { interactive: "maybe" },
    field: "interactive",
    message: serverMessage.validation.interactive.invalid
  },
  { params: { fromDate: "yesterday" }, field: "fromDate", bug: true },
  { params: { toDate: "yesterday" }, field: "toDate", bug: true },
  {
    params: { fromDate: "2026-02-01", toDate: "2026-01-01" },
    field: "",
    bug: true
  },
  // An admin-only sort field is not a user sort field.
  {
    params: { sortBy: "usernameAttempted" },
    field: "sortBy",
    message: serverMessage.validation.sortBy.invalid
  },
  {
    params: { sortBy: "ip" },
    field: "sortBy",
    message: serverMessage.validation.sortBy.invalid
  },
  {
    params: { sortOrder: "sideways" },
    field: "sortOrder",
    message: serverMessage.validation.sortOrder.invalid
  },
  {
    params: { country: "x".repeat(201) },
    field: "country",
    message: serverMessage.validation.search.invalid
  }
];

test.describe(
  "Each invalid filter is named with a readable message",
  { tag: "@TC-LOGINHISTORY-036" },
  () => {
    for (const { params, field, message, bug } of fieldErrors) {
      test(`${JSON.stringify(params).slice(0, 60)} → errors[${field || "(query)"}]`, async ({
        userApi
      }) => {
        if (bug) {
          // BUG: defects/admin-login-history.md#bug-adminloginhistory-02
          test.fail();
        }
        const res = await historyOf(userApi).list(params, EN);
        expect(res.status()).toBe(400);
        const { code, errors } = await errorOf(res);
        expect(code).toBe("VALIDATION_ERROR");
        const entry = errors?.find((e) => e.field === field);
        expect(entry, `errors entry for "${field}"`).toBeTruthy();
        // A missing catalogue entry comes back as its key ("method.invalid").
        expect(entry!.message).not.toMatch(/^[\w:.]+\.invalid$/);
        if (message) expect(entry!.message).toBe(message);
      });
    }
  }
);

// [BVA] text filters: 200 characters pass, 201 fail.
// [Security] Express parses `a[$ne]=x` into an object; every filter must
// refuse it rather than hand an operator to MongoDB.
test(
  "Text filters stop at 200 characters and query operators are refused",
  { tag: "@TC-LOGINHISTORY-037" },
  async ({ userApi }) => {
    for (const field of ["country", "city", "os", "browser"]) {
      const ok = await historyOf(userApi).list({ [field]: "x".repeat(200) });
      expect(ok.status(), `${field} × 200`).toBe(200);
      const tooLong = await historyOf(userApi).list({
        [field]: "x".repeat(201)
      });
      expect(tooLong.status(), `${field} × 201`).toBe(400);
      expect((await errorOf(tooLong)).code).toBe("VALIDATION_ERROR");
    }
    for (const raw of [
      "status[$ne]=success",
      "country[$regex]=.*",
      "webAppId[$gt]=",
      "method[$in][]=sso&method[$in][]=password"
    ]) {
      const res = await historyOf(userApi).listRaw(raw);
      expect(res.status(), raw).toBe(400);
      expect((await errorOf(res)).code, raw).toBe("VALIDATION_ERROR");
    }
  }
);

// [BVA] a date with no time is the whole day: from = to = the day of the
// attempts includes them all; the day before excludes them.
test(
  "A date-only window covers the whole day",
  { tag: "@TC-LOGINHISTORY-038" },
  async ({ newApi }) => {
    const account = await createAccount({ tag: "lh-day" });
    await failOnce(newApi, account);
    const api = await apiAs(account.email, account.password);
    try {
      const all = await rows(api, { limit: 100 });
      const day = all.items[0].createdAt.slice(0, 10);
      const sameDay = all.items.filter((r) =>
        r.createdAt.startsWith(day)
      ).length;
      const shift = (n: number) =>
        new Date(Date.parse(`${day}T12:00:00.000Z`) + n * 86_400_000)
          .toISOString()
          .slice(0, 10);

      expect((await rows(api, { fromDate: day, toDate: day })).meta.total).toBe(
        sameDay
      );
      expect(
        (await rows(api, { fromDate: shift(-1), toDate: shift(-1) })).meta.total
      ).toBe(0);
      expect((await rows(api, { fromDate: shift(1) })).meta.total).toBe(0);
    } finally {
      await api.dispose();
    }
  }
);
