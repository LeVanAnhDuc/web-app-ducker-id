import { test, expect } from "@fixtures";
import type { Page, Request } from "@playwright/test";
import { createAccount } from "@helpers/accounts";
import { ensureFailedAttempt } from "@helpers/adminUsers";

test.use({ role: "admin" });

// Admin login-history list (REQ-ADMLOGHIST-01) — sign-in attempts across all
// accounts, filtered by status, method, device, app and date range. Filters
// live in the URL and reach the API as query params. Runs as admin (role
// fixture). Read-only: real data is only read, and the cases that need a
// specific shape stub the list response with `page.route`.
// Test cases: test-cases/admin-login-history.md.
// The API behind the page (filter semantics, validation) is covered in
// tests/api/admin-login-history/login-history.api.ts.

const LIST_RE = /\/api\/v1\/admin\/login-history(\?|$)/;

/** Records every list request the page makes. */
const captureListRequests = async (page: Page) => {
  const seen: Request[] = [];
  page.on("request", (r) => {
    if (LIST_RE.test(r.url()) && r.method() === "GET") seen.push(r);
  });
  return {
    lastParams: async () => {
      await expect.poll(() => seen.length).toBeGreaterThan(0);
      return new URL(seen[seen.length - 1].url()).searchParams;
    }
  };
};

const envelope = (items: unknown[]) =>
  JSON.stringify({
    timestamp: new Date().toISOString(),
    path: "/api/v1/admin/login-history",
    message: "ok",
    data: {
      items,
      meta: {
        total: items.length,
        page: 1,
        limit: 20,
        totalPages: items.length ? 1 : 0
      }
    }
  });

const rowLinks = (page: Page) =>
  page.getByRole("link", { name: /^View details for / });

test(
  "the list shows sign-in attempts from more than one account",
  { tag: ["@TC-ADMLOGHIST-001", "@smoke"] },
  async ({ page }) => {
    await page.goto("/admin/login-history");
    await expect(
      page.getByRole("heading", { name: "All Login History", level: 1 })
    ).toBeVisible();
    await expect(rowLinks(page).first()).toBeVisible();
    for (const name of [
      "Username Attempted",
      "App",
      "Method",
      "Status",
      "IP & Location",
      "Anomaly",
      "Date"
    ])
      await expect(
        page.getByRole("columnheader", { name, exact: true })
      ).toBeVisible();

    const names = await rowLinks(page).evaluateAll((els) =>
      els.map((e) => e.getAttribute("aria-label") ?? "")
    );
    const accounts = new Set(
      names.map((n) => n.replace(/^View details for /, ""))
    );
    expect(accounts.size).toBeGreaterThan(1);
  }
);

test.describe("status and method filters", () => {
  // [EP] status: success · failed. Real data: every visible row matches.
  for (const [status, label, other] of [
    ["failed", "Failed", "Success"],
    ["success", "Success", "Failed"]
  ] as const) {
    test(
      `?status=${status} sends status=${status} and shows only ${label} rows`,
      { tag: "@TC-ADMLOGHIST-002" },
      async ({ page, adminApi, guestApi }) => {
        // A fresh database may hold no failed attempt yet.
        if (status === "failed")
          await ensureFailedAttempt(
            adminApi,
            guestApi,
            await createAccount({ tag: "adm-loghist-fail" })
          );
        const cap = await captureListRequests(page);
        await page.goto(`/admin/login-history?status=${status}`);
        expect((await cap.lastParams()).get("status")).toBe(status);
        const table = page.getByRole("table");
        await expect(rowLinks(page).first()).toBeVisible();
        await expect(
          table.getByText(label, { exact: true }).first()
        ).toBeVisible();
        await expect(table.getByText(other, { exact: true })).toHaveCount(0);
      }
    );
  }

  test(
    "?method=password sends method=password and shows only Password rows",
    { tag: "@TC-ADMLOGHIST-003" },
    async ({ page }) => {
      const cap = await captureListRequests(page);
      await page.goto("/admin/login-history?method=password");
      expect((await cap.lastParams()).get("method")).toBe("password");
      const table = page.getByRole("table");
      await expect(rowLinks(page).first()).toBeVisible();
      for (const other of ["OTP", "Magic Link", "SSO", "Forgot Password"])
        await expect(table.getByText(other, { exact: true })).toHaveCount(0);
    }
  );

  // [ST] picking a filter in the panel writes the URL and resets to page 1.
  test(
    "choosing Status = Failed in the Filters panel updates URL and request",
    { tag: "@TC-ADMLOGHIST-004" },
    async ({ page }) => {
      const cap = await captureListRequests(page);
      await page.goto("/admin/login-history?page=2");
      await page.getByRole("button", { name: /^Filters/ }).click();
      const panel = page.locator('[data-slot="popover-content"]');
      await panel.getByRole("combobox").first().click();
      await page.getByRole("option", { name: "Failed", exact: true }).click();

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
    "?app=idp sends source=idp and no webAppId",
    { tag: "@TC-ADMLOGHIST-006" },
    async ({ page }) => {
      const cap = await captureListRequests(page);
      await page.goto("/admin/login-history?app=idp");
      const params = await cap.lastParams();
      expect(params.get("source")).toBe("idp");
      expect(params.has("webAppId")).toBe(false);
    }
  );

  test(
    "choosing a date-range preset sends fromDate and toDate",
    { tag: "@TC-ADMLOGHIST-008" },
    async ({ page }) => {
      const cap = await captureListRequests(page);
      await page.goto("/admin/login-history");
      await expect(rowLinks(page).first()).toBeVisible();
      await page.getByRole("button", { name: /^Filters/ }).click();
      await page.getByRole("combobox", { name: "Date range" }).click();
      await page.getByRole("option", { name: "Last 7 days" }).click();

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
  for (const [query, expected] of DT) {
    test(
      `?${query} → ${JSON.stringify(expected)}`,
      { tag: "@TC-ADMLOGHIST-007" },
      async ({ page }) => {
        await page.route(LIST_RE, (route) =>
          route.fulfill({
            status: 200,
            contentType: "application/json",
            body: envelope([])
          })
        );
        const cap = await captureListRequests(page);
        await page.goto(`/admin/login-history?${query}`);
        const params = await cap.lastParams();
        for (const [key, value] of Object.entries(expected))
          expect(params.get(key), key).toBe(value);
      }
    );
  }

  test(
    "?deviceType=MOBILE is forwarded to the API",
    { tag: "@TC-ADMLOGHIST-009" },
    async ({ page }) => {
      // BUG: BUG-013 — the admin list offers a Device filter (buildLoginHistoryFilterDefs) but AdminLoginHistoryTable never puts deviceType into the request params — choosing it changes nothing.
      test.fail();
      const cap = await captureListRequests(page);
      await page.goto("/admin/login-history?deviceType=MOBILE");
      await expect(page).toHaveURL(/deviceType=MOBILE/);
      expect((await cap.lastParams()).get("deviceType")).toBe("MOBILE");
    }
  );
});

test.describe("empty result and i18n", () => {
  test(
    "a filter that matches nothing shows the empty state with Clear filters",
    { tag: "@TC-ADMLOGHIST-013" },
    async ({ page }) => {
      await page.route(LIST_RE, (route) =>
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: envelope([])
        })
      );
      await page.goto("/admin/login-history?status=failed");
      await expect(page.getByText("No login history found")).toBeVisible();
      await page.getByRole("button", { name: "Clear filters" }).click();
      await expect(page).not.toHaveURL(/status=/);
    }
  );

  test(
    "vi: title, filter button, column headers and row links are Vietnamese",
    { tag: "@TC-ADMLOGHIST-028" },
    async ({ page }) => {
      await page.goto("/vi/admin/login-history");
      await expect(
        page.getByRole("heading", {
          name: "Toàn bộ lịch sử đăng nhập",
          level: 1
        })
      ).toBeVisible();
      await expect(page.getByRole("button", { name: /^Bộ lọc/ })).toBeVisible();
      await expect(
        page.getByRole("columnheader", { name: "Trạng thái", exact: true })
      ).toBeVisible();
      await expect(
        page.getByRole("link", { name: /^Xem chi tiết cho / }).first()
      ).toBeVisible();
      await expect(page.getByText(/loginHistory\./)).toHaveCount(0);
    }
  );
});
