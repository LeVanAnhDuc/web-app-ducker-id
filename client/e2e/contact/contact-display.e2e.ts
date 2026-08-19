import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";

// Read-only admin feature. Runs under the `admin` Playwright project
// (playwright.config.ts maps `contact/` → `admin` project with storageState
// `e2e/.auth/admin.json`, dependency `admin-setup`). Every `page.route` below
// only stubs deterministic JSON responses — nothing touches the DB, so no
// revert / afterAll cleanup is needed.

const VALID_ID = "0123456789abcdef01234567";
const SHORT_ID_RE = /^[0-9a-f]{6}\.\.\.$/;

const LIST_ITEM = {
  _id: VALID_ID,
  email: "reporter@test.com",
  subject: "Cannot access my dashboard",
  priority: "high",
  status: "new",
  createdAt: "2026-01-15T08:30:00.000Z",
  updatedAt: "2026-01-15T08:30:00.000Z",
  attachmentCount: 0
};

const DETAIL_ITEM = {
  ...LIST_ITEM,
  message: "I keep getting a 500 error when opening the dashboard.",
  ipAddress: "203.0.113.9",
  attachments: []
};

const listEnvelope = (items: Record<string, unknown>[]) => ({
  timestamp: new Date().toISOString(),
  path: "/api/v1/admin/contacts",
  message: "ok",
  data: {
    items,
    meta: { total: items.length, page: 1, limit: 20, totalPages: 1 }
  }
});

const detailEnvelope = (item: Record<string, unknown>) => ({
  timestamp: new Date().toISOString(),
  path: "/api/v1/admin/contacts",
  message: "ok",
  data: item
});

/**
 * Stubs both the detail and list endpoints. The detail glob
 * (`**\/api/v1/admin/contacts/*`) requires an extra path segment after
 * `contacts`, and the list glob (`**\/api/v1/admin/contacts`) matches only
 * the bare collection path (optionally with a query string) — the two globs
 * are disjoint, so registration order does not matter, but detail is
 * registered first to mirror the "more specific route first" convention.
 */
const stubContactApis = async (
  page: Page,
  { listItems = [LIST_ITEM], detailItem = DETAIL_ITEM } = {}
) => {
  await page.route("**/api/v1/admin/contacts/*", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(detailEnvelope(detailItem))
    })
  );
  await page.route("**/api/v1/admin/contacts?*", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(listEnvelope(listItems))
    })
  );
  await page.route("**/api/v1/admin/contacts", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(listEnvelope(listItems))
    })
  );
};

const FILES_COLUMN_RE = /files|tệp/i;

test.describe("Admin Contact — list ShortId / detail full id / category + Files removal", () => {
  // Row 1 Happy / Row 8 Data rendering [EP: 24-hex _id → first 6 chars + "..."].
  test("list renders the ShortId ticket cell, not empty and not the full id", async ({
    page
  }) => {
    await stubContactApis(page);
    await page.goto("/admin/contact");
    const ticketCell = page.getByText(SHORT_ID_RE).first();
    await expect(ticketCell).toBeVisible();
    await expect(ticketCell).toHaveText("012345...");
    // Not the full 24-char raw _id anywhere on the page.
    await expect(page.getByText(VALID_ID, { exact: true })).toHaveCount(0);
  });

  // Row 4 Validation / removal check — category column no longer exists.
  test("list has no category column header and no leaked i18n key", async ({
    page
  }) => {
    await stubContactApis(page);
    await page.goto("/admin/contact");
    await expect(page.getByText(SHORT_ID_RE).first()).toBeVisible();
    await expect(
      page.getByRole("columnheader", { name: /category|danh mục/i })
    ).toHaveCount(0);
    await expect(page.getByText("contactAdmin.form.category")).toHaveCount(0);
  });

  // Row 4 Validation / removal check — Files/attachments column no longer
  // exists in the admin list table (removed this branch).
  test("list has no Files/attachments column header", async ({ page }) => {
    await stubContactApis(page);
    await page.goto("/admin/contact");
    await expect(page.getByText(SHORT_ID_RE).first()).toBeVisible();
    await expect(
      page.getByRole("columnheader", { name: FILES_COLUMN_RE })
    ).toHaveCount(0);
  });

  // Row 5 Empty/removal — filter toolbar no longer offers category or
  // ticket-number filters.
  //
  // A11Y NOTE (not fixed here, no app code changed): ListFilterPanel renders
  // filter labels as shadcn <Label> without `htmlFor`/id linkage to the
  // control (see src/components/list/ListFilterPanel/index.tsx), so
  // `page.getByLabel(...)` cannot resolve them. Asserting on the popover's
  // visible text is the accurate signal here; the missing label association
  // is flagged as a follow-up, not something this test works around by
  // editing app code.
  test("filter panel has no category filter and no ticket-number filter", async ({
    page
  }) => {
    await stubContactApis(page);
    await page.goto("/admin/contact");
    await expect(page.getByText(SHORT_ID_RE).first()).toBeVisible();
    const filtersButton = page.getByRole("button", { name: /filters/i });
    await expect(filtersButton).toBeVisible();
    await filtersButton.click();
    // Filter panel is rendered inside the Popover's dialog role.
    const panel = page.getByRole("dialog");
    await expect(panel.getByText("Status", { exact: true })).toBeVisible();
    await expect(panel.getByText(/^Category$/i)).toHaveCount(0);
    await expect(panel.getByText(/^Danh mục$/i)).toHaveCount(0);
    await expect(panel.getByText(/^Ticket Number$/i)).toHaveCount(0);
    await expect(panel.getByText(/^Mã ticket$/i)).toHaveCount(0);
  });

  // Row 1/8 Detail — full raw _id renders in the detail card heading (no
  // longer shortened); breadcrumb current item also shows the full id; no
  // category field.
  test("detail page renders the FULL ticket id in the card heading, breadcrumb shows full id, and has no category field", async ({
    page
  }) => {
    await stubContactApis(page);
    await page.goto(`/admin/contact/${VALID_ID}`);
    await expect(
      page.getByRole("heading", { name: /Contact Detail/i })
    ).toBeVisible();
    // Detail card heading (h2) now shows the full 24-hex _id, not the
    // ShortId "012345..." truncated form.
    const ticketHeading = page.getByRole("heading", {
      level: 2,
      name: VALID_ID
    });
    await expect(ticketHeading).toBeVisible();
    await expect(ticketHeading).toHaveText(VALID_ID);
    await expect(page.getByText(SHORT_ID_RE)).toHaveCount(0);
    // Breadcrumb current (last) item shows the full id, not "Detail"/"Chi
    // tiết" — BreadcrumbPage renders <span role="link" aria-current="page">.
    // NOTE: Playwright's getByRole(role, { current }) filter does not match
    // aria-current on role="link" in this Playwright version (verified: it
    // returns every link in the tree, not just the current one) — flagging
    // as a Playwright/role-mapping quirk, not an app bug. Scoping to the
    // breadcrumb nav landmark + exact text is the reliable equivalent.
    const breadcrumbCurrent = page
      .getByRole("navigation", { name: "breadcrumb" })
      .getByText(VALID_ID, { exact: true });
    await expect(breadcrumbCurrent).toBeVisible();
    await expect(breadcrumbCurrent).toHaveText(VALID_ID);
    await expect(breadcrumbCurrent).not.toHaveText(/detail|chi tiết/i);
    await expect(page.getByText(/category|danh mục/i)).toHaveCount(0);
  });

  // Row 9 i18n (en+vi) — repeat ticket-renders + category-absent for both
  // locales; assert no missing-message key string leaks in either.
  test("en locale: ticket renders and category is absent, no missing-key leak", async ({
    page
  }) => {
    await stubContactApis(page);
    await page.goto("/admin/contact");
    const ticketCell = page.getByText(SHORT_ID_RE).first();
    await expect(ticketCell).toBeVisible();
    await expect(ticketCell).toHaveText("012345...");
    await expect(
      page.getByRole("columnheader", { name: /category/i })
    ).toHaveCount(0);
    await expect(
      page.getByRole("columnheader", { name: FILES_COLUMN_RE })
    ).toHaveCount(0);
    await expect(page.getByText("contactAdmin.form.category")).toHaveCount(0);
    await expect(page.getByText(/contactAdmin\.admin\.list/)).toHaveCount(0);

    // en locale detail: full id in card heading + breadcrumb current item.
    await page.goto(`/admin/contact/${VALID_ID}`);
    await expect(
      page.getByRole("heading", { level: 2, name: VALID_ID })
    ).toBeVisible();
    const breadcrumbCurrentEn = page
      .getByRole("navigation", { name: "breadcrumb" })
      .getByText(VALID_ID, { exact: true });
    await expect(breadcrumbCurrentEn).toHaveText(VALID_ID);
    await expect(breadcrumbCurrentEn).not.toHaveText(/detail/i);
  });

  test("vi locale: ticket renders and category is absent, no missing-key leak", async ({
    page
  }) => {
    await stubContactApis(page);
    await page.goto("/vi/admin/contact");
    const ticketCell = page.getByText(SHORT_ID_RE).first();
    await expect(ticketCell).toBeVisible();
    await expect(ticketCell).toHaveText("012345...");
    await expect(
      page.getByRole("columnheader", { name: /danh mục/i })
    ).toHaveCount(0);
    await expect(
      page.getByRole("columnheader", { name: FILES_COLUMN_RE })
    ).toHaveCount(0);
    await expect(page.getByText("contactAdmin.form.category")).toHaveCount(0);
    await expect(page.getByText(/contactAdmin\.admin\.list/)).toHaveCount(0);

    // vi locale detail: full id in card heading + breadcrumb current item.
    await page.goto(`/vi/admin/contact/${VALID_ID}`);
    await expect(
      page.getByRole("heading", { level: 2, name: VALID_ID })
    ).toBeVisible();
    const breadcrumbCurrentVi = page
      .getByRole("navigation", { name: "breadcrumb" })
      .getByText(VALID_ID, { exact: true });
    await expect(breadcrumbCurrentVi).toHaveText(VALID_ID);
    await expect(breadcrumbCurrentVi).not.toHaveText(/chi tiết/i);
  });
});

// Row 11 (support-success ShortId, contact-submission form) is DEFERRED —
// see docs/specs/contact-ticket-id-display/e2e.md for the reason (submitting
// creates a persistent row + hits BE rate limits). Covered by type-safety +
// build; verify manually / gate B render-only.

// A11Y FOLLOW-UP (flagged, NOT fixed here, no app code changed):
// 1. The ticket <span> (ShortId) uses `title` for the full id (tooltip-only,
//    mouse-hover). Screen reader / keyboard users get no equivalent way to
//    discover the full _id from the shortened cell text alone. Consider an
//    `aria-label` with the full id as a follow-up.
// 2. ListFilterPanel renders filter labels as shadcn <Label> with no
//    `htmlFor`/id linkage to their control (select/input), so filters are
//    not programmatically associated with their labels — `getByLabel` can't
//    resolve them and screen readers won't announce the label on focus.
//    Consider wiring `htmlFor`/`id` (or `aria-labelledby`) as a follow-up.
