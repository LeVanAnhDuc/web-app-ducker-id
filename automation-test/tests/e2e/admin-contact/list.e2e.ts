import { test, expect } from "@fixtures";
import type { Page, Request } from "@playwright/test";
import {
  deleteTestContacts,
  setContactStatus,
  submitContact,
  type SubmittedContact
} from "@helpers/adminContact";

test.use({ role: "admin" });

// Admin support inbox list (REQ-ADMCONTACT-01) — search, status / email /
// date filters, URL state and opening a request. Runs as admin (role
// fixture). Every request a test looks for is one it filed itself through
// the public endpoint (`submitContact`, subject prefixed "E2E support
// ticket"); `afterAll` deletes them. The page is driven through URL params,
// which `useListQuery` treats as the source of truth.
// Test cases: test-cases/admin-contact.md.

const LIST_RE = /\/api\/v1\/admin\/contacts(\?|$)/;

test.afterAll(async () => {
  await deleteTestContacts();
});

const listUrl = (params: Record<string, string>, locale = "") =>
  `${locale}/admin/contact?${new URLSearchParams(params).toString()}`;

const rowFor = (page: Page, c: SubmittedContact) =>
  page.getByRole("row").filter({ hasText: c.subject });

/** Records every list request the page makes. */
const captureListRequests = (page: Page) => {
  const seen: Request[] = [];
  page.on("request", (r) => {
    if (LIST_RE.test(r.url()) && r.method() === "GET") seen.push(r);
  });
  return async () => {
    await expect.poll(() => seen.length).toBeGreaterThan(0);
    return new URL(seen[seen.length - 1].url()).searchParams;
  };
};

test(
  "a request filed through the support form appears in the inbox as New",
  { tag: ["@TC-ADMCONTACT-010", "@smoke"] },
  async ({ page, guestApi }) => {
    const c = await submitContact(guestApi, {
      tag: "inbox",
      email: "reporter@e2e.example.com"
    });
    await page.goto("/admin/contact");
    await expect(
      page.getByRole("heading", { name: "Contact Requests", level: 1 })
    ).toBeVisible();
    for (const name of ["Ticket", "Email", "Subject", "Status", "Date"])
      await expect(
        page.getByRole("columnheader", { name, exact: true })
      ).toBeVisible();
    const row = rowFor(page, c);
    await expect(row).toBeVisible();
    await expect(row.getByText("reporter@e2e.example.com")).toBeVisible();
    await expect(row.getByText("New", { exact: true })).toBeVisible();
    await expect(row.getByText(`${c._id.slice(0, 6)}...`)).toBeVisible();
  }
);

test.describe("search", () => {
  // [EP] subject match · email match · no match · regex metacharacters.
  test(
    "typing a subject fragment narrows the list and lands in the URL",
    { tag: "@TC-ADMCONTACT-011" },
    async ({ page, guestApi }) => {
      const c = await submitContact(guestApi, { tag: "search" });
      await page.goto("/admin/contact");
      await page
        .getByRole("search")
        .getByRole("textbox")
        .fill(c.subject.slice(-12));
      await expect(page).toHaveURL(/[?&]search=/, { timeout: 10_000 });
      await expect(rowFor(page, c)).toBeVisible();
      await expect(page.getByRole("row")).toHaveCount(2); // header + 1
    }
  );

  test(
    "search matches the reporter email too",
    { tag: "@TC-ADMCONTACT-011" },
    async ({ page, guestApi }) => {
      const email = `inbox-${Date.now().toString(36)}@e2e.example.com`;
      const c = await submitContact(guestApi, { tag: "by-email", email });
      await page.goto(listUrl({ search: email.toUpperCase() }));
      await expect(rowFor(page, c)).toBeVisible();
    }
  );

  test(
    "no match shows the empty state; Clear filters brings the list back",
    { tag: "@TC-ADMCONTACT-011" },
    async ({ page }) => {
      await page.goto(listUrl({ search: "zzz-no-such-ticket-(.*)" }));
      await expect(page.getByText("No contact requests found")).toBeVisible();
      await page.getByRole("button", { name: "Clear filters" }).click();
      await expect(page).not.toHaveURL(/search=/);
      await expect(page.getByRole("row").nth(1)).toBeVisible();
    }
  );
});

test.describe("filters", () => {
  // [EP] status: new · processing · resolved — the request shows up under
  // its own status only.
  test(
    "status filter shows a request only under its current status",
    { tag: "@TC-ADMCONTACT-012" },
    async ({ page, guestApi, adminApi }) => {
      const c = await submitContact(guestApi, { tag: "status-filter" });
      expect((await setContactStatus(adminApi, c._id, "processing")).ok()).toBe(
        true
      );
      for (const [status, present] of [
        ["processing", true],
        ["new", false],
        ["resolved", false]
      ] as const) {
        await page.goto(listUrl({ search: c.subject, status }));
        if (present) {
          const row = rowFor(page, c);
          await expect(row).toBeVisible();
          await expect(
            row.getByText("Processing", { exact: true })
          ).toBeVisible();
        } else {
          await expect(
            page.getByText("No contact requests found")
          ).toBeVisible();
        }
      }
    }
  );

  test(
    "email filter matches part of the reporter address",
    { tag: "@TC-ADMCONTACT-013" },
    async ({ page, guestApi }) => {
      const local = `mailf-${Date.now().toString(36)}`;
      const c = await submitContact(guestApi, {
        tag: "email-filter",
        email: `${local}@e2e.example.com`
      });
      const params = captureListRequests(page);
      await page.goto(listUrl({ email: local }));
      expect((await params()).get("email")).toBe(local);
      await expect(rowFor(page, c)).toBeVisible();
      await expect(page.getByRole("row")).toHaveCount(2);
    }
  );

  // [DT] search × status.
  for (const [status, present] of [
    ["new", true],
    ["resolved", false]
  ] as const) {
    test(
      `search=<own subject> & status=${status} → ${present ? "listed" : "empty"}`,
      { tag: "@TC-ADMCONTACT-014" },
      async ({ page, guestApi }) => {
        const c = await submitContact(guestApi, { tag: `dt-${status}` });
        await page.goto(listUrl({ search: c.subject, status }));
        if (present) await expect(rowFor(page, c)).toBeVisible();
        else
          await expect(
            page.getByText("No contact requests found")
          ).toBeVisible();
      }
    );
  }

  // [ST] picking a status in the panel writes the URL and resets to page 1;
  // an invalid status in the URL is dropped before it reaches the API.
  test(
    "Filters panel status choice updates URL and request; invalid status is dropped",
    { tag: "@TC-ADMCONTACT-015" },
    async ({ page }) => {
      const params = captureListRequests(page);
      await page.goto("/admin/contact?status=closed&page=2");
      expect((await params()).has("status")).toBe(false);

      await page.getByRole("button", { name: /^Filters/ }).click();
      const panel = page.locator('[data-slot="popover-content"]');
      await panel.getByRole("combobox").first().click();
      await page.getByRole("option", { name: "Resolved", exact: true }).click();
      await expect(page).toHaveURL(/[?&]status=resolved(&|$)/);
      await expect(page).toHaveURL(/[?&]page=1(&|$)/);
      await expect
        .poll(async () => (await params()).get("status"))
        .toBe("resolved");
    }
  );

  test(
    "a date-range preset sends fromDate and toDate",
    { tag: "@TC-ADMCONTACT-016" },
    async ({ page }) => {
      const params = captureListRequests(page);
      await page.goto("/admin/contact");
      await page.getByRole("button", { name: /^Filters/ }).click();
      await page.getByRole("combobox", { name: "Date range" }).click();
      await page.getByRole("option", { name: "Today" }).click();
      await expect(page).toHaveURL(/[?&]dateRange=today(&|$)/);
      await expect
        .poll(async () => (await params()).has("fromDate"))
        .toBe(true);
      expect((await params()).has("toDate")).toBe(true);
    }
  );
});

test(
  "clicking a row opens that request's detail page",
  { tag: "@TC-ADMCONTACT-017" },
  async ({ page, guestApi }) => {
    const c = await submitContact(guestApi, { tag: "open-row" });
    await page.goto(listUrl({ search: c.subject }));
    await page
      .getByRole("link", { name: `View details for ticket ${c._id}` })
      .click();
    await expect(page).toHaveURL(new RegExp(`/admin/contact/${c._id}$`));
    await expect(
      page.getByRole("heading", { name: "Contact Detail", level: 1 })
    ).toBeVisible();
    await expect(page.getByText(c.subject)).toBeVisible();
  }
);

test(
  "a guest opening the inbox is sent to sign in",
  { tag: "@TC-ADMCONTACT-018" },
  async ({ guestPage }) => {
    await guestPage.goto("/admin/contact");
    await expect(guestPage).toHaveURL(/\/login/);
  }
);
