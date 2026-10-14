import { test, expect } from "@/fixtures";
import { createApiClient } from "@/api";
import { clientLiteral, copy } from "@/data/copy";
import { deleteAdminContactRequests, shortId } from "@/utils/contacts";
import { captureListRequests, fileTicket } from "./helpers";

test.use({ role: "admin" });

// Admin support inbox list (REQ-ADMINCONTACT-01) — search, status / email /
// date filters, URL state and opening a request. Runs as admin (role
// fixture). Every request a test looks for is one it filed itself through
// the public endpoint (`fileTicket`, subject under the ADMINCONTACT prefix);
// `afterAll` deletes them. The page is driven through URL params, which
// `useListQuery` treats as the source of truth.
// Test cases: test-cases/admin-contact.md.

const status = copy.contactAdmin.admin.list.status;
const columns = copy.contactAdmin.admin.list.table;

test.afterAll(async () => {
  await deleteAdminContactRequests();
});

test(
  "A filed request appears in the inbox as New",
  { tag: ["@TC-ADMINCONTACT-010", "@smoke"] },
  async ({ adminContactPage: list, guestApi }) => {
    const c = await fileTicket(guestApi, "inbox", {
      email: "reporter@e2e.example.com"
    });
    await list.goto();
    await expect(list.heading()).toBeVisible();
    for (const name of [
      columns.ticketNumber,
      columns.email,
      columns.subject,
      columns.status,
      columns.createdAt
    ])
      await expect(list.columnHeader(name)).toBeVisible();
    const row = list.row(c.subject);
    await expect(row).toBeVisible();
    await expect(row.getByText("reporter@e2e.example.com")).toBeVisible();
    await expect(row.getByText(status.new, { exact: true })).toBeVisible();
    await expect(row.getByText(shortId(c.id))).toBeVisible();
  }
);

test.describe("Search by subject or email", () => {
  // [EP] subject match · email match · no match · regex metacharacters.
  test(
    "typing a subject fragment narrows the list and lands in the URL",
    { tag: "@TC-ADMINCONTACT-011" },
    async ({ adminContactPage: list, guestApi }) => {
      const c = await fileTicket(guestApi, "search");
      await list.goto();
      await list.searchBox().fill(c.subject.slice(-12));
      await expect(list.page).toHaveURL(/[?&]search=/, { timeout: 10_000 });
      await expect(list.row(c.subject)).toBeVisible();
      await expect(list.rows()).toHaveCount(2); // header + 1
    }
  );

  test(
    "search matches the reporter email too",
    { tag: "@TC-ADMINCONTACT-011" },
    async ({ adminContactPage: list, guestApi }) => {
      const email = `inbox-${Date.now().toString(36)}@e2e.example.com`;
      const c = await fileTicket(guestApi, "by-email", { email });
      await list.gotoWith({ search: email.toUpperCase() });
      await expect(list.row(c.subject)).toBeVisible();
    }
  );

  test(
    "no match shows the empty state; Clear filters brings the list back",
    { tag: "@TC-ADMINCONTACT-011" },
    async ({ adminContactPage: list }) => {
      await list.gotoWith({ search: "zzz-no-such-ticket-(.*)" });
      await expect(list.emptyState()).toBeVisible();
      await list.clearFiltersButton().click();
      await expect(list.page).not.toHaveURL(/search=/);
      await expect(list.rows().nth(1)).toBeVisible();
    }
  );
});

test(
  "Status filter",
  { tag: "@TC-ADMINCONTACT-012" },
  async ({ adminContactPage: list, guestApi, adminApi }) => {
    // [EP] new · processing · resolved — the request shows up under its own
    // status only.
    const c = await fileTicket(guestApi, "status-filter");
    expect(
      (
        await createApiClient(adminApi).contact.adminUpdateStatus(c.id, {
          status: "processing"
        })
      ).ok()
    ).toBe(true);
    for (const [value, present] of [
      ["processing", true],
      ["new", false],
      ["resolved", false]
    ] as const) {
      await list.gotoWith({ search: c.subject, status: value });
      if (present) {
        const row = list.row(c.subject);
        await expect(row).toBeVisible();
        await expect(
          row.getByText(status.processing, { exact: true })
        ).toBeVisible();
      } else {
        await expect(list.emptyState()).toBeVisible();
      }
    }
  }
);

test(
  "Email filter matches part of the address",
  { tag: "@TC-ADMINCONTACT-013" },
  async ({ adminContactPage: list, guestApi }) => {
    const local = `mailf-${Date.now().toString(36)}`;
    const c = await fileTicket(guestApi, "email-filter", {
      email: `${local}@e2e.example.com`
    });
    const params = captureListRequests(list.page);
    await list.gotoWith({ email: local });
    expect((await params()).get("email")).toBe(local);
    await expect(list.row(c.subject)).toBeVisible();
    await expect(list.rows()).toHaveCount(2);
  }
);

test.describe("Search and status combine", () => {
  // [DT] search × status.
  for (const [value, present] of [
    ["new", true],
    ["resolved", false]
  ] as const) {
    test(
      `search=<own subject> & status=${value} → ${present ? "listed" : "empty"}`,
      { tag: "@TC-ADMINCONTACT-014" },
      async ({ adminContactPage: list, guestApi }) => {
        const c = await fileTicket(guestApi, `dt-${value}`);
        await list.gotoWith({ search: c.subject, status: value });
        if (present) await expect(list.row(c.subject)).toBeVisible();
        else await expect(list.emptyState()).toBeVisible();
      }
    );
  }
});

test(
  "Panel status choice writes the URL; junk is dropped",
  { tag: "@TC-ADMINCONTACT-015" },
  async ({ adminContactPage: list }) => {
    // [ST] picking a status in the panel writes the URL and resets to page 1;
    // an invalid status in the URL is dropped before it reaches the API.
    const params = captureListRequests(list.page);
    await list.gotoWith({ status: "closed", page: "2" });
    expect((await params()).has("status")).toBe(false);

    await list.chooseStatus(status.resolved);
    await expect(list.page).toHaveURL(/[?&]status=resolved(&|$)/);
    await expect(list.page).toHaveURL(/[?&]page=1(&|$)/);
    await expect
      .poll(async () => (await params()).get("status"))
      .toBe("resolved");
  }
);

test(
  "A date-range preset sends a window",
  { tag: "@TC-ADMINCONTACT-016" },
  async ({ adminContactPage: list }) => {
    const params = captureListRequests(list.page);
    await list.goto();
    await list.chooseDateRange(copy.list.dateRange.today);
    await expect(list.page).toHaveURL(/[?&]dateRange=today(&|$)/);
    await expect.poll(async () => (await params()).has("fromDate")).toBe(true);
    expect((await params()).has("toDate")).toBe(true);
  }
);

test(
  "A row opens its request",
  { tag: ["@TC-ADMINCONTACT-017", "@smoke"] },
  async ({
    adminContactPage: list,
    adminContactDetailPage: detail,
    guestApi
  }) => {
    const c = await fileTicket(guestApi, "open-row");
    await list.gotoWith({ search: c.subject });
    await list.rowLink(c.id).click();
    await expect(list.page).toHaveURL(new RegExp(`/admin/contact/${c.id}$`));
    await expect(detail.heading()).toBeVisible();
    await expect(detail.text(c.subject)).toBeVisible();
  }
);

test(
  "A guest is sent to sign in",
  { tag: ["@TC-ADMINCONTACT-018", "@smoke"] },
  async ({ guestPage }) => {
    await guestPage.goto("/admin/contact");
    await expect(guestPage).toHaveURL(/\/login/);
  }
);

test(
  "A request without a reply email shows a dash and no Email field",
  { tag: "@TC-ADMINCONTACT-038" },
  async ({
    adminContactPage: list,
    adminContactDetailPage: detail,
    guestApi
  }) => {
    // [EP] email absent (guest, field left empty) → stored as null.
    const c = await fileTicket(guestApi, "no-email");
    expect(c.email).toBeNull();
    await list.gotoWith({ search: c.subject });
    const row = list.row(c.subject);
    await expect(row).toBeVisible();
    await expect(
      row.getByText(clientLiteral.contactNoEmail, { exact: true })
    ).toBeVisible();

    await detail.goto(c.id);
    await expect(detail.idHeading(c.id)).toBeVisible();
    await expect(
      detail.fieldLabel(copy.contactAdmin.admin.detail.fields.email)
    ).toHaveCount(0);
  }
);
