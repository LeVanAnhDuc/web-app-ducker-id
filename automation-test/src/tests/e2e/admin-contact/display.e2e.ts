import { test, expect } from "@/fixtures";
import { copy, copyVi } from "@/data/copy";
import { AdminContactPage } from "@/pages/admin/admin-contact.page";
import { AdminContactDetailPage } from "@/pages/admin/admin-contact-detail.page";
import { SHORT_ID_RE, shortId } from "@/utils/contacts";
import { STUB_ID, stubContactApis } from "./helpers";

test.use({ role: "admin" });

// Admin support inbox — how a request is identified and which columns and
// filters are gone (REQ-ADMINCONTACT-01/02): the list shows a short ticket id,
// the detail page the full id, and neither shows category or attachments
// columns. Runs as admin (role fixture). Every inbox call is stubbed with
// deterministic JSON (stubContactApis) — nothing touches the DB.
// Test cases: test-cases/admin-contact.md.

// Columns and filters removed from the app: their labels are no longer in
// any catalogue, so the absence checks name them literally.
const FILES_COLUMN_RE = /files|tệp/i;

test(
  "The list shows a short ticket id",
  { tag: "@TC-ADMINCONTACT-001" },
  async ({ adminContactPage: list }) => {
    // [EP] 24-hex _id → first 6 chars + "...".
    await stubContactApis(list.page);
    await list.goto();
    const ticketCell = list.text(SHORT_ID_RE).first();
    await expect(ticketCell).toBeVisible();
    await expect(ticketCell).toHaveText(shortId(STUB_ID));
    // Not the full 24-char raw _id anywhere on the page.
    await expect(list.text(STUB_ID, { exact: true })).toHaveCount(0);
  }
);

test(
  "No category column, no leaked key",
  { tag: "@TC-ADMINCONTACT-002" },
  async ({ adminContactPage: list }) => {
    await stubContactApis(list.page);
    await list.goto();
    await expect(list.text(SHORT_ID_RE).first()).toBeVisible();
    await expect(list.columnHeader(/category|danh mục/i)).toHaveCount(0);
    await expect(list.text("contactAdmin.form.category")).toHaveCount(0);
  }
);

test(
  "No attachments column",
  { tag: "@TC-ADMINCONTACT-003" },
  async ({ adminContactPage: list }) => {
    await stubContactApis(list.page);
    await list.goto();
    await expect(list.text(SHORT_ID_RE).first()).toBeVisible();
    await expect(list.columnHeader(FILES_COLUMN_RE)).toHaveCount(0);
  }
);

// A11Y NOTE (not fixed here, no app code changed): ListFilterPanel renders
// filter labels as shadcn <Label> without `htmlFor`/id linkage to the
// control (see client/src/components/list/ListFilterPanel/index.tsx), so
// `getByLabel(...)` cannot resolve them. Asserting on the popover's visible
// text is the accurate signal here.
test(
  "The filter panel has no category or ticket filter",
  { tag: "@TC-ADMINCONTACT-004" },
  async ({ adminContactPage: list }) => {
    await stubContactApis(list.page);
    await list.goto();
    await expect(list.text(SHORT_ID_RE).first()).toBeVisible();
    await expect(list.filtersButton()).toBeVisible();
    await list.filtersButton().click();
    // The filter panel is rendered inside the Popover's dialog role.
    const panel = list.filtersDialog();
    await expect(
      panel.getByText(copy.contactAdmin.admin.list.filters.status, {
        exact: true
      })
    ).toBeVisible();
    await expect(panel.getByText(/^Category$/i)).toHaveCount(0);
    await expect(panel.getByText(/^Danh mục$/i)).toHaveCount(0);
    await expect(panel.getByText(/^Ticket Number$/i)).toHaveCount(0);
    await expect(panel.getByText(/^Mã ticket$/i)).toHaveCount(0);
  }
);

test(
  "Detail shows the full id in heading and breadcrumb",
  { tag: "@TC-ADMINCONTACT-005" },
  async ({ adminContactDetailPage: detail }) => {
    await stubContactApis(detail.page);
    await detail.goto(STUB_ID);
    await expect(detail.heading()).toBeVisible();
    // The card heading (h2) shows the full 24-hex _id, not the ShortId.
    const ticketHeading = detail.idHeading(STUB_ID);
    await expect(ticketHeading).toBeVisible();
    await expect(ticketHeading).toHaveText(STUB_ID);
    await expect(detail.text(SHORT_ID_RE)).toHaveCount(0);
    // The breadcrumb's current (last) item shows the full id, not
    // "Detail"/"Chi tiết". getByRole(role, { current }) does not match
    // aria-current on role="link" in this Playwright version, so the item is
    // found inside the breadcrumb landmark by its exact text.
    const breadcrumbCurrent = detail.breadcrumbCurrent(STUB_ID);
    await expect(breadcrumbCurrent).toBeVisible();
    await expect(breadcrumbCurrent).toHaveText(STUB_ID);
    await expect(breadcrumbCurrent).not.toHaveText(/detail|chi tiết/i);
    await expect(detail.text(/category|danh mục/i)).toHaveCount(0);
  }
);

test(
  "English list and detail id display",
  { tag: "@TC-ADMINCONTACT-006" },
  async ({ adminContactPage: list, adminContactDetailPage: detail }) => {
    await stubContactApis(list.page);
    await list.goto();
    const ticketCell = list.text(SHORT_ID_RE).first();
    await expect(ticketCell).toBeVisible();
    await expect(ticketCell).toHaveText(shortId(STUB_ID));
    await expect(list.columnHeader(/category/i)).toHaveCount(0);
    await expect(list.columnHeader(FILES_COLUMN_RE)).toHaveCount(0);
    await expect(list.text("contactAdmin.form.category")).toHaveCount(0);
    await expect(list.text(/contactAdmin\.admin\.list/)).toHaveCount(0);

    // Detail: full id in the card heading + the breadcrumb's current item.
    await detail.goto(STUB_ID);
    await expect(detail.idHeading(STUB_ID)).toBeVisible();
    const breadcrumbCurrent = detail.breadcrumbCurrent(STUB_ID);
    await expect(breadcrumbCurrent).toHaveText(STUB_ID);
    await expect(breadcrumbCurrent).not.toHaveText(/detail/i);
  }
);

test(
  "Vietnamese list and detail id display",
  { tag: "@TC-ADMINCONTACT-007" },
  async ({ page }) => {
    const list = new AdminContactPage(page, copyVi, "/vi");
    const detail = new AdminContactDetailPage(page, copyVi, "/vi");
    await stubContactApis(page);
    await list.goto();
    const ticketCell = list.text(SHORT_ID_RE).first();
    await expect(ticketCell).toBeVisible();
    await expect(ticketCell).toHaveText(shortId(STUB_ID));
    await expect(list.columnHeader(/danh mục/i)).toHaveCount(0);
    await expect(list.columnHeader(FILES_COLUMN_RE)).toHaveCount(0);
    await expect(list.text("contactAdmin.form.category")).toHaveCount(0);
    await expect(list.text(/contactAdmin\.admin\.list/)).toHaveCount(0);

    // Detail: full id in the card heading + the breadcrumb's current item.
    await detail.goto(STUB_ID);
    await expect(detail.idHeading(STUB_ID)).toBeVisible();
    const breadcrumbCurrent = detail.breadcrumbCurrent(STUB_ID);
    await expect(breadcrumbCurrent).toHaveText(STUB_ID);
    await expect(breadcrumbCurrent).not.toHaveText(/chi tiết/i);
  }
);

// The ShortId on the public support form's success screen belongs to the
// support module, not to this one.

// A11Y FOLLOW-UP (flagged, NOT fixed here, no app code changed):
// 1. The ticket <span> (ShortId) uses `title` for the full id (tooltip-only,
//    mouse-hover). Screen reader / keyboard users get no equivalent way to
//    discover the full _id from the shortened cell text alone.
// 2. ListFilterPanel filter labels have no `htmlFor`/id linkage to their
//    control, so screen readers do not announce the label on focus.
