import { test, expect } from "@/fixtures";
import type { Request } from "@playwright/test";
import { copy } from "@/data/copy";
import { listCatalog } from "@/utils/catalog";
import { lastQuery, row, stubList } from "./helpers";

// /login-history — the filters, paging and the columns a row shows.
// Role: user (default); the access case runs as guest. The list endpoint is
// stubbed so the rows and page counts are deterministic; what is asserted is
// the request the page sends and what it renders.
// Test cases: test-cases/login-history.md (TC-LOGINHISTORY-012 … 018,
// 030 … 033).

const t = copy.loginHistory;

/** Two rows per page, numbered after the page. */
const twoRowsOf = (pageNo: number) => [row(pageNo * 10), row(pageNo * 10 + 1)];

test(
  "The status filter from the Filters panel",
  { tag: ["@TC-LOGINHISTORY-012", "@smoke"] },
  async ({ page, loginHistoryPage: list }) => {
    const seen: Request[] = [];
    await stubList(page, twoRowsOf, { seen });
    await list.goto();
    await expect(list.table()).toBeVisible();
    expect(lastQuery(seen).has("status")).toBe(false);

    await list.chooseStatus(t.status.failed);

    await expect(page).toHaveURL(/[?&]status=failed/);
    await expect.poll(() => lastQuery(seen).get("status")).toBe("failed");
    // A filter change starts again from page 1.
    expect(lastQuery(seen).get("page")).toBe("1");
  }
);

test.describe(
  "Filters combine; foreign values are dropped",
  { tag: "@TC-LOGINHISTORY-013" },
  () => {
    test("status × method × device × app combine in one request [DT]", async ({
      page,
      loginHistoryPage: list
    }) => {
      const seen: Request[] = [];
      await stubList(page, twoRowsOf, { seen });
      await list.goto("?status=failed&method=otp&deviceType=MOBILE&app=idp");
      await expect(list.table()).toBeVisible();
      const q = lastQuery(seen);
      expect(q.get("status")).toBe("failed");
      expect(q.get("method")).toBe("otp");
      expect(q.get("deviceType")).toBe("MOBILE");
      expect(q.get("source")).toBe("idp");
      await expect(list.filtersButton()).toContainText("4");
    });

    test("values outside the filter options are dropped, not sent [EP]", async ({
      page,
      loginHistoryPage: list
    }) => {
      const seen: Request[] = [];
      await stubList(page, twoRowsOf, { seen });
      await list.goto("?status=maybe&method=telepathy&deviceType=FRIDGE");
      await expect(list.table()).toBeVisible();
      const q = lastQuery(seen);
      expect(q.has("status")).toBe(false);
      expect(q.has("method")).toBe(false);
      expect(q.has("deviceType")).toBe(false);
    });
  }
);

test(
  "A date-range deep link",
  { tag: "@TC-LOGINHISTORY-014" },
  async ({ page, loginHistoryPage: list }) => {
    const seen: Request[] = [];
    await stubList(page, twoRowsOf, { seen });
    await list.goto("?fromDate=2026-10-01&toDate=2026-10-05");
    await expect(list.table()).toBeVisible();
    expect(lastQuery(seen).get("fromDate")).toBe("2026-10-01");
    expect(lastQuery(seen).get("toDate")).toBe("2026-10-05");
  }
);

test(
  "The pager",
  { tag: "@TC-LOGINHISTORY-015" },
  async ({ page, loginHistoryPage: list }) => {
    const seen: Request[] = [];
    await stubList(page, twoRowsOf, { seen, totalPages: 2 });
    await list.goto();
    await expect(list.pager()).toBeVisible();
    await expect(list.previousPageLink()).toHaveAttribute(
      "aria-disabled",
      "true"
    );

    await list.nextPageLink().click();
    await expect(page).toHaveURL(/[?&]page=2/);
    await expect.poll(() => lastQuery(seen).get("page")).toBe("2");
    await expect(list.nextPageLink()).toHaveAttribute("aria-disabled", "true");
  }
);

test(
  "A row shows method, result, device, browser, IP and location",
  { tag: "@TC-LOGINHISTORY-016" },
  async ({ page, loginHistoryPage: list }) => {
    await stubList(page, [
      row(1, { method: "otp", deviceType: "MOBILE", browser: "Safari 17" })
    ]);
    await list.goto();
    const r = list.row("203.0.113.7");
    await expect(r).toContainText(t.method.otp);
    await expect(r).toContainText(t.status.success);
    await expect(r).toContainText("MOBILE · Safari 17");
    await expect(r).toContainText("Hanoi, VN");
    await expect(list.timeIn(r)).toBeVisible();
  }
);

test(
  "A failed row shows its reason, the OS and the anomaly flag",
  { tag: "@TC-LOGINHISTORY-017" },
  async ({ page, loginHistoryPage: list }) => {
    // REQ-LOGINHISTORY-01 / README promise the reason, OS and anomaly flag on
    // the user's own list, but buildLoginHistoryColumns renders none of them
    // (and GET /login-history does not even return isAnomaly).
    // BUG: defects/login-history.md#bug-loginhistory-01
    test.fail();
    await stubList(page, [
      row(1, {
        status: "failed",
        failReason: "invalid_password",
        os: "Ubuntu 24.04",
        isAnomaly: true
      })
    ]);
    await list.goto();
    const r = list.row("203.0.113.7");
    await expect(r).toContainText(t.status.failed);
    await expect(r).toContainText("Ubuntu 24.04", { timeout: 3_000 });
    await expect(r).toContainText(/password/i, { timeout: 3_000 });
  }
);

test.describe("access", () => {
  test.use({ role: "guest" });

  test(
    "A guest is sent to the login screen",
    { tag: ["@TC-LOGINHISTORY-018", "@smoke"] },
    async ({ page, loginHistoryPage: list }) => {
      await page.goto("/vi/login-history");
      await expect(page).toHaveURL(/\/login/, { timeout: 20_000 });
      await expect(list.table()).toHaveCount(0);
    }
  );
});

// ── Filters panel: app and date range; empty state; single page ───────────

// [EP] the App select offers Ducker ID plus every catalogue app the user can
// open (GET /apps); picking a catalogue app sends its webAppId, not source.
test(
  "The App filter lists the catalogue apps and sends webAppId",
  { tag: "@TC-LOGINHISTORY-030" },
  async ({ page, loginHistoryPage: list, userApi }) => {
    const catalog = await listCatalog(userApi);
    expect(catalog.items.length, "catalogue apps").toBeGreaterThan(0);
    const app = catalog.items[0];
    const seen: Request[] = [];
    await stubList(page, twoRowsOf, { seen });
    await list.goto();
    await expect(list.table()).toBeVisible();

    await list.filtersButton().click();
    await list.appSelect().click();
    await expect(list.option(t.app.idp, true)).toBeVisible();
    for (const a of catalog.items.slice(0, 5))
      await expect(list.option(a.displayName, true)).toBeVisible();
    await list.option(app.displayName, true).click();

    await expect(page).toHaveURL(new RegExp(`[?&]app=${app._id}`));
    await expect.poll(() => lastQuery(seen).get("webAppId")).toBe(app._id);
    expect(lastQuery(seen).has("source")).toBe(false);
  }
);

// [ST] a date-range preset picked in the panel writes the URL and sends a
// window of about seven days.
test(
  "A date-range preset from the Filters panel sends a date window",
  { tag: "@TC-LOGINHISTORY-031" },
  async ({ page, loginHistoryPage: list }) => {
    const seen: Request[] = [];
    await stubList(page, twoRowsOf, { seen });
    await list.goto();
    await expect(list.table()).toBeVisible();
    await list.chooseDateRange(copy.list.dateRange.last7);

    await expect(page).toHaveURL(/[?&]dateRange=last7(&|$)/);
    await expect.poll(() => lastQuery(seen).has("fromDate")).toBe(true);
    const q = lastQuery(seen);
    const from = new Date(q.get("fromDate") as string);
    const to = new Date(q.get("toDate") as string);
    const days = (to.getTime() - from.getTime()) / 86_400_000;
    expect(days).toBeGreaterThan(5);
    expect(days).toBeLessThan(8);
  }
);

// [ST] filtered → empty → "Clear filters" → unfiltered list again.
test(
  "Clear filters from the empty state restores the full list",
  { tag: "@TC-LOGINHISTORY-032" },
  async ({ page, loginHistoryPage: list }) => {
    const seen: Request[] = [];
    await stubList(page, [], { seen });
    await list.goto("?status=failed");
    await expect(list.emptyState()).toBeVisible();
    expect(lastQuery(seen).get("status")).toBe("failed");

    await page.unrouteAll();
    await stubList(page, twoRowsOf, { seen });
    await list.clearFiltersButton().click();

    await expect(page).not.toHaveURL(/[?&]status=/);
    await expect.poll(() => lastQuery(seen).has("status")).toBe(false);
    await expect(list.table()).toBeVisible();
    await expect(list.emptyState()).toHaveCount(0);
  }
);

// [BVA] one page of results: the pager is not rendered; the page asks for 20.
test(
  "A single page of results shows no pager",
  { tag: "@TC-LOGINHISTORY-033" },
  async ({ page, loginHistoryPage: list }) => {
    const seen: Request[] = [];
    await stubList(page, twoRowsOf, { seen, totalPages: 1 });
    await list.goto();
    await expect(list.table()).toBeVisible();
    await expect(list.row("203.0.113.7").first()).toBeVisible();
    await expect(list.pager()).toHaveCount(0);
    expect(lastQuery(seen).get("limit")).toBe("20");
  }
);
