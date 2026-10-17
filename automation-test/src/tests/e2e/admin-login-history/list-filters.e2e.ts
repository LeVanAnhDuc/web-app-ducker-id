import { test, expect } from "@/fixtures";
import { createApiClient } from "@/api";
import { dataOf } from "@/api/response";
import type { CatalogPage } from "@/api/web-app.client";
import { copy, copyVi } from "@/data/copy";
import { AdminLoginHistoryPage } from "@/pages/admin/admin-login-history.page";
import { createAccount } from "@/utils/accounts";
import { ensureFailedAttempt } from "@/utils/login-history";
import { captureListRequests, FAILED_RECORD, stubList } from "./helpers";

test.use({ role: "admin" });

// Admin login-history list (REQ-ADMINLOGINHISTORY-01) — sign-in attempts across all
// accounts, filtered by status, method, device, app and date range. Filters
// live in the URL and reach the API as query params. Runs as admin (role
// fixture). Read-only: real data is only read, and the cases that need a
// specific shape stub the list response with `page.route`.
// Test cases: test-cases/admin-login-history.md.
// The API behind the page (filter semantics, validation) is covered in
// tests/api/admin-login-history/login-history.api.ts.

const t = copy.loginHistory;

test(
  "The list shows attempts from many accounts",
  { tag: ["@TC-ADMINLOGINHISTORY-001", "@smoke"] },
  async ({ adminLoginHistoryPage: list }) => {
    await list.goto();
    await expect(list.heading()).toBeVisible();
    await expect(list.firstRowLink()).toBeVisible();
    for (const name of [
      t.table.usernameAttempted,
      t.table.app,
      t.table.method,
      t.table.status,
      t.table.ipLocation,
      t.table.isAnomaly,
      t.table.createdAt
    ])
      await expect(list.columnHeader(name)).toBeVisible();

    const accounts = new Set(await list.rowUsernames());
    expect(accounts.size).toBeGreaterThan(1);
  }
);

test.describe("status and method filters", () => {
  // [EP] status: success · failed. Real data: every visible row matches.
  test.describe("Status filter", { tag: "@TC-ADMINLOGINHISTORY-002" }, () => {
    for (const [status, other] of [
      ["failed", "success"],
      ["success", "failed"]
    ] as const) {
      const label = t.status[status];
      test(`?status=${status} sends status=${status} and shows only ${label} rows`, async ({
        page,
        adminLoginHistoryPage: list,
        adminApi,
        guestApi
      }) => {
        // A fresh database may hold no failed attempt yet.
        if (status === "failed")
          await ensureFailedAttempt(
            adminApi,
            guestApi,
            await createAccount({ tag: "adm-loghist-fail" })
          );
        const cap = captureListRequests(page);
        await list.goto(`?status=${status}`);
        expect((await cap.lastParams()).get("status")).toBe(status);
        await expect(list.firstRowLink()).toBeVisible();
        await expect(list.tableText(label).first()).toBeVisible();
        await expect(list.tableText(t.status[other])).toHaveCount(0);
      });
    }
  });

  test(
    "Method filter",
    { tag: "@TC-ADMINLOGINHISTORY-003" },
    async ({ page, adminLoginHistoryPage: list }) => {
      const cap = captureListRequests(page);
      await list.goto("?method=password");
      expect((await cap.lastParams()).get("method")).toBe("password");
      await expect(list.firstRowLink()).toBeVisible();
      for (const other of [
        t.method.otp,
        t.method["magic-link"],
        t.method.sso,
        t.method["forgot-password"]
      ])
        await expect(list.tableText(other)).toHaveCount(0);
    }
  );

  // [ST] picking a filter in the panel writes the URL and resets to page 1.
  test(
    "Choosing a filter in the panel writes the URL",
    { tag: "@TC-ADMINLOGINHISTORY-004" },
    async ({ page, adminLoginHistoryPage: list }) => {
      const cap = captureListRequests(page);
      await list.goto("?page=2");
      await list.chooseStatus(t.status.failed);

      await expect(page).toHaveURL(/[?&]status=failed(&|$)/);
      await expect(page).toHaveURL(/[?&]page=1(&|$)/);
      await expect
        .poll(async () => (await cap.lastParams()).get("status"))
        .toBe("failed");
      expect((await cap.lastParams()).get("page")).toBe("1");
    }
  );
});

test.describe("app, date range and combined filters", () => {
  test(
    'App filter "Ducker ID" maps to source=idp',
    { tag: "@TC-ADMINLOGINHISTORY-006" },
    async ({ page, adminLoginHistoryPage: list }) => {
      const cap = captureListRequests(page);
      await list.goto("?app=idp");
      const params = await cap.lastParams();
      expect(params.get("source")).toBe("idp");
      expect(params.has("webAppId")).toBe(false);
    }
  );

  // [EP] the other App option class: one catalog app → webAppId, no source.
  // The option list loads after the page, so the filter applies once it has.
  test(
    "App filter with a catalog app sends its webAppId",
    { tag: "@TC-ADMINLOGINHISTORY-044" },
    async ({ page, adminLoginHistoryPage: list, adminApi }) => {
      const catalog = await dataOf<CatalogPage>(
        await createApiClient(adminApi).webApps.list({ limit: 100 })
      );
      expect(catalog.items.length, "seeded catalog apps").toBeGreaterThan(0);
      const appId = catalog.items[0]._id;
      await stubList(page, []);
      const cap = captureListRequests(page);
      await list.goto(`?app=${appId}`);
      await expect
        .poll(async () => (await cap.lastParams()).get("webAppId"))
        .toBe(appId);
      expect((await cap.lastParams()).has("source")).toBe(false);
    }
  );

  test(
    "A date-range preset sends a date window",
    { tag: "@TC-ADMINLOGINHISTORY-008" },
    async ({ page, adminLoginHistoryPage: list }) => {
      const cap = captureListRequests(page);
      await list.goto();
      await expect(list.firstRowLink()).toBeVisible();
      await list.chooseDateRange(copy.list.dateRange.last7);

      await expect(page).toHaveURL(/[?&]dateRange=last7(&|$)/);
      await expect
        .poll(async () => (await cap.lastParams()).has("fromDate"))
        .toBe(true);
      const params = await cap.lastParams();
      const from = new Date(params.get("fromDate") as string);
      const to = new Date(params.get("toDate") as string);
      const days = (to.getTime() - from.getTime()) / 86_400_000;
      expect(days).toBeGreaterThan(5);
      expect(days).toBeLessThan(8);
    }
  );

  // [DT] status × method × app × date — every valid filter is forwarded
  // together; an invalid value for one is dropped without touching the rest.
  const DT: [string, Record<string, string | null>][] = [
    [
      "status=failed&method=password&app=idp&dateRange=custom&fromDate=2026-01-01&toDate=2026-01-31",
      {
        status: "failed",
        method: "password",
        source: "idp",
        fromDate: "2026-01-01",
        toDate: "2026-01-31"
      }
    ],
    ["status=bogus&method=otp", { status: null, method: "otp", source: null }],
    [
      "status=success&method=telepathy&app=idp",
      { status: "success", method: null, source: "idp" }
    ]
  ];
  test.describe(
    "Filters combine; an invalid one is dropped alone",
    { tag: "@TC-ADMINLOGINHISTORY-007" },
    () => {
      for (const [query, expected] of DT) {
        test(`?${query} → ${JSON.stringify(expected)}`, async ({
          page,
          adminLoginHistoryPage: list
        }) => {
          await stubList(page, []);
          const cap = captureListRequests(page);
          await list.goto(`?${query}`);
          const params = await cap.lastParams();
          for (const [key, value] of Object.entries(expected))
            expect(params.get(key), key).toBe(value);
        });
      }
    }
  );

  test(
    "Device filter reaches the API",
    { tag: "@TC-ADMINLOGINHISTORY-009" },
    async ({ page, adminLoginHistoryPage: list }) => {
      // the admin list offers a Device filter (buildLoginHistoryFilterDefs) but AdminLoginHistoryTable never puts deviceType into the request params — choosing it changes nothing.
      // BUG: defects/admin-login-history.md#bug-adminloginhistory-01
      test.fail();
      const cap = captureListRequests(page);
      await list.goto("?deviceType=MOBILE");
      await expect(page).toHaveURL(/deviceType=MOBILE/);
      expect((await cap.lastParams()).get("deviceType")).toBe("MOBILE");
    }
  );
});

test.describe("rows, pages, empty result and i18n", () => {
  // [DT] stored values → labels: method, status, anomaly flag, location
  // sentinel and the identity provider as the app.
  test(
    "List rows render labels, not stored values",
    { tag: "@TC-ADMINLOGINHISTORY-045" },
    async ({ page, adminLoginHistoryPage: list }) => {
      await stubList(page, [
        {
          ...FAILED_RECORD,
          method: "magic-link",
          country: "LOCAL",
          city: "LOCAL",
          ip: "127.0.0.1"
        }
      ]);
      await list.goto();
      const row = list.row(FAILED_RECORD.usernameAttempted);
      await expect(row).toBeVisible();
      for (const label of [
        t.method["magic-link"],
        t.status.failed,
        t.table.anomalyYes,
        t.location.local,
        t.app.idp
      ])
        await expect(row.getByText(label, { exact: true })).toBeVisible();
      for (const raw of ["magic-link", "failed", "LOCAL", "true"])
        await expect(row.getByText(raw, { exact: true })).toHaveCount(0);
    }
  );

  // [BVA] the pager exists only past one page; Next moves to page 2.
  test.describe(
    "The pager appears past one page and moves to the next",
    { tag: "@TC-ADMINLOGINHISTORY-046" },
    () => {
      test("one page of results shows no pager", async ({
        page,
        adminLoginHistoryPage: list
      }) => {
        await stubList(page, [FAILED_RECORD], { total: 20 });
        await list.goto();
        await expect(list.firstRowLink()).toBeVisible();
        await expect(list.pager()).toHaveCount(0);
      });

      test("Next on a 3-page result requests and shows page 2", async ({
        page,
        adminLoginHistoryPage: list
      }) => {
        await stubList(page, [FAILED_RECORD], { total: 45 });
        const cap = captureListRequests(page);
        await list.goto();
        await expect(list.pager()).toBeVisible();
        await list.nextPageLink().click();
        await expect(page).toHaveURL(/[?&]page=2(&|$)/);
        await expect
          .poll(async () => (await cap.lastParams()).get("page"))
          .toBe("2");
      });
    }
  );

  test(
    "No match shows the empty state",
    { tag: "@TC-ADMINLOGINHISTORY-013" },
    async ({ page, adminLoginHistoryPage: list }) => {
      await stubList(page, []);
      await list.goto("?status=failed");
      await expect(list.emptyState()).toBeVisible();
      await list.clearFiltersButton().click();
      await expect(page).not.toHaveURL(/status=/);
    }
  );

  test(
    "Vietnamese list",
    { tag: "@TC-ADMINLOGINHISTORY-028" },
    async ({ page }) => {
      const list = new AdminLoginHistoryPage(page, copyVi, "/vi");
      await list.goto();
      await expect(list.heading()).toBeVisible();
      await expect(list.filtersButton()).toBeVisible();
      await expect(
        list.columnHeader(copyVi.loginHistory.table.status)
      ).toBeVisible();
      await expect(list.firstRowLink()).toBeVisible();
      await expect(list.text(/loginHistory\./)).toHaveCount(0);
    }
  );
});
