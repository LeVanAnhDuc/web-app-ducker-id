import { test, expect } from "@fixtures";
import type { Page, Request } from "@playwright/test";

// /login-history — the filters, paging and the columns a row shows.
// Role: user (default); the access case runs as guest. The list endpoint is
// stubbed so the rows and page counts are deterministic; what is asserted is
// the request the page sends and what it renders.
// Test cases: test-cases/login-history.md (TC-LOGHIST-012 … 018).

const LIST_RE = /\/api\/v1\/login-history(\?|$)/;

const row = (i: number, over: Record<string, unknown> = {}) => ({
  _id: `0123456789abcdef0123${String(i).padStart(4, "0")}`,
  method: "password",
  status: "success",
  failReason: null,
  ip: "203.0.113.7",
  country: "VN",
  city: "Hanoi",
  deviceType: "DESKTOP",
  os: "Windows 10",
  browser: "Chrome 120",
  clientType: "WEB",
  createdAt: new Date(Date.UTC(2026, 9, 1, 8, i)).toISOString(),
  source: "idp",
  app: null,
  interactive: true,
  ...over
});

/** Stubs the list; `pages` pages of two rows each; records every request. */
const stubList = (
  page: Page,
  seen: Request[],
  opts: { pages?: number; items?: unknown[] } = {}
) =>
  page.route(LIST_RE, (route) => {
    seen.push(route.request());
    const pageNo =
      Number(new URL(route.request().url()).searchParams.get("page")) || 1;
    const totalPages = opts.pages ?? 1;
    const items = opts.items ?? [row(pageNo * 10), row(pageNo * 10 + 1)];
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        timestamp: new Date().toISOString(),
        path: "/api/v1/login-history",
        message: "ok",
        data: {
          items,
          meta: { total: totalPages * 20, page: pageNo, limit: 20, totalPages }
        }
      })
    });
  });

const last = (seen: Request[]) =>
  new URL(seen[seen.length - 1].url()).searchParams;

test(
  "the status filter picked in the Filters panel reaches the request and the URL",
  { tag: ["@TC-LOGHIST-012", "@smoke"] },
  async ({ page }) => {
    const seen: Request[] = [];
    await stubList(page, seen);
    await page.goto("/login-history");
    await expect(page.getByRole("table")).toBeVisible();
    expect(last(seen).has("status")).toBe(false);

    await page.getByRole("button", { name: /Filters/ }).click();
    const panel = page.locator('[data-slot="popover-content"]');
    await panel.getByRole("combobox").first().click();
    await page.getByRole("option", { name: "Failed", exact: true }).click();

    await expect(page).toHaveURL(/[?&]status=failed/);
    await expect.poll(() => last(seen).get("status")).toBe("failed");
    // A filter change starts again from page 1.
    expect(last(seen).get("page")).toBe("1");
  }
);

test(
  "status × method × device × app combine in one request [DT]",
  { tag: "@TC-LOGHIST-013" },
  async ({ page }) => {
    const seen: Request[] = [];
    await stubList(page, seen);
    await page.goto(
      "/login-history?status=failed&method=otp&deviceType=MOBILE&app=idp"
    );
    await expect(page.getByRole("table")).toBeVisible();
    const q = last(seen);
    expect(q.get("status")).toBe("failed");
    expect(q.get("method")).toBe("otp");
    expect(q.get("deviceType")).toBe("MOBILE");
    expect(q.get("source")).toBe("idp");
    await expect(page.getByRole("button", { name: /Filters/ })).toContainText(
      "4"
    );
  }
);

test(
  "values outside the filter options are dropped, not sent [EP]",
  { tag: "@TC-LOGHIST-013" },
  async ({ page }) => {
    const seen: Request[] = [];
    await stubList(page, seen);
    await page.goto(
      "/login-history?status=maybe&method=telepathy&deviceType=FRIDGE"
    );
    await expect(page.getByRole("table")).toBeVisible();
    const q = last(seen);
    expect(q.has("status")).toBe(false);
    expect(q.has("method")).toBe(false);
    expect(q.has("deviceType")).toBe(false);
  }
);

test(
  "a date range deep link sends fromDate and toDate",
  { tag: "@TC-LOGHIST-014" },
  async ({ page }) => {
    const seen: Request[] = [];
    await stubList(page, seen);
    await page.goto("/login-history?fromDate=2026-10-01&toDate=2026-10-05");
    await expect(page.getByRole("table")).toBeVisible();
    expect(last(seen).get("fromDate")).toBe("2026-10-01");
    expect(last(seen).get("toDate")).toBe("2026-10-05");
  }
);

test(
  "the pager walks to the next page and disables the edges [BVA]",
  { tag: "@TC-LOGHIST-015" },
  async ({ page }) => {
    const seen: Request[] = [];
    await stubList(page, seen, { pages: 2 });
    await page.goto("/login-history");
    const pager = page.getByRole("navigation", { name: "pagination" });
    await expect(pager).toBeVisible();
    await expect(
      pager.getByRole("link", { name: "Go to previous page" })
    ).toHaveAttribute("aria-disabled", "true");

    await pager.getByRole("link", { name: "Go to next page" }).click();
    await expect(page).toHaveURL(/[?&]page=2/);
    await expect.poll(() => last(seen).get("page")).toBe("2");
    await expect(
      pager.getByRole("link", { name: "Go to next page" })
    ).toHaveAttribute("aria-disabled", "true");
  }
);

test(
  "a row shows method, result, device, browser, IP and location",
  { tag: "@TC-LOGHIST-016" },
  async ({ page }) => {
    const seen: Request[] = [];
    await stubList(page, seen, {
      items: [
        row(1, { method: "otp", deviceType: "MOBILE", browser: "Safari 17" })
      ]
    });
    await page.goto("/login-history");
    const r = page.getByRole("row").filter({ hasText: "203.0.113.7" });
    await expect(r).toContainText("OTP");
    await expect(r).toContainText("Success");
    await expect(r).toContainText("MOBILE · Safari 17");
    await expect(r).toContainText("Hanoi, VN");
    await expect(r.locator("time, span").first()).toBeVisible();
  }
);

test(
  "a failed row shows the reason, the OS and the anomaly flag",
  { tag: "@TC-LOGHIST-017" },
  async ({ page }) => {
    // BUG: BUG-014 — REQ-LOGHIST-01 / README promise the reason, OS and anomaly flag on
    // the user's own list, but buildLoginHistoryColumns renders none of them
    // (and GET /login-history does not even return isAnomaly).
    test.fail();
    const seen: Request[] = [];
    await stubList(page, seen, {
      items: [
        row(1, {
          status: "failed",
          failReason: "invalid_password",
          os: "Ubuntu 24.04",
          isAnomaly: true
        })
      ]
    });
    await page.goto("/login-history");
    const r = page.getByRole("row").filter({ hasText: "203.0.113.7" });
    await expect(r).toContainText("Failed");
    await expect(r).toContainText("Ubuntu 24.04", { timeout: 3_000 });
    await expect(r).toContainText(/password/i, { timeout: 3_000 });
  }
);

test.describe("access", () => {
  test.use({ role: "guest" });

  test(
    "a signed-out visitor is sent to the login screen",
    { tag: "@TC-LOGHIST-018" },
    async ({ page }) => {
      await page.goto("/vi/login-history");
      await expect(page).toHaveURL(/\/login/, { timeout: 20_000 });
      await expect(page.getByRole("table")).toHaveCount(0);
    }
  );
});
