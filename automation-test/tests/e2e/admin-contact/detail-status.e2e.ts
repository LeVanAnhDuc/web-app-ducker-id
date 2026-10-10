import { test, expect } from "@fixtures";
import type { Page } from "@playwright/test";
import {
  deleteTestContacts,
  submitContact,
  type SubmittedContact
} from "@helpers/adminContact";
import { ownUserId } from "@helpers/adminUsers";

test.use({ role: "admin" });

// Admin support request detail (REQ-ADMCONTACT-02) and its status workflow
// new → processing → resolved (REQ-ADMCONTACT-03), driven through the status
// select on the detail card. Runs as admin (role fixture). Each test files
// its own request (`submitContact`) and `afterAll` deletes them, so no
// request somebody else filed ever changes status.
// The API side of the workflow (invalid targets, unknown ids) is in
// tests/api/admin-contact/contacts.api.ts.
// Test cases: test-cases/admin-contact.md.

test.afterAll(async () => {
  await deleteTestContacts();
});

const openDetail = (page: Page, c: SubmittedContact, locale = "") =>
  page.goto(`${locale}/admin/contact/${c._id}`);

/** The status select on the detail card (the header search is a combobox
 * too, but it sits in the banner, not in main). */
const statusSelect = (page: Page) =>
  page.getByRole("main").getByRole("combobox");

const statusBadge = (page: Page, label: string) =>
  page.getByRole("main").getByText(label, { exact: true }).first();

const chooseStatus = async (page: Page, label: string) => {
  await statusSelect(page).click();
  await page.getByRole("option", { name: label, exact: true }).click();
};

test(
  "detail shows the full id, subject, message, reporter email and status",
  { tag: "@TC-ADMCONTACT-020" },
  async ({ page, guestApi }) => {
    const c = await submitContact(guestApi, {
      tag: "detail",
      email: "detail-reporter@e2e.example.com",
      message:
        "Line one of the report.\nLine two keeps its line break in the detail view."
    });
    await openDetail(page, c);
    await expect(
      page.getByRole("heading", { name: "Contact Detail", level: 1 })
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { level: 2, name: c._id })
    ).toBeVisible();
    const main = page.getByRole("main");
    for (const label of ["Email", "Subject", "Message", "Updated At"])
      await expect(main.getByText(label, { exact: true })).toBeVisible();
    await expect(
      main.getByText("detail-reporter@e2e.example.com")
    ).toBeVisible();
    await expect(main.getByText(c.subject)).toBeVisible();
    await expect(main.getByText("Line two keeps its line break")).toBeVisible();
    await expect(statusBadge(page, "New")).toBeVisible();
    await expect(main.getByText("No attachments")).toBeVisible();
    await expect(
      page
        .getByRole("navigation", { name: "breadcrumb" })
        .getByRole("link", { name: "Contact Inbox" })
    ).toBeVisible();
  }
);

test(
  "[ST] new → processing → resolved through the status select",
  { tag: ["@TC-ADMCONTACT-021", "@smoke"] },
  async ({ page, guestApi }) => {
    const c = await submitContact(guestApi, { tag: "workflow" });
    await openDetail(page, c);
    await expect(statusBadge(page, "New")).toBeVisible();

    for (const [label, value] of [
      ["Processing", "processing"],
      ["Resolved", "resolved"]
    ] as const) {
      const patch = page.waitForResponse(
        (r) =>
          r.url().endsWith(`/admin/contacts/${c._id}/status`) &&
          r.request().method() === "PATCH"
      );
      await chooseStatus(page, label);
      const res = await patch;
      expect(res.status()).toBe(200);
      expect(res.request().postDataJSON()).toEqual({ status: value });
      // The previous step's toast may still be on screen.
      await expect(
        page.getByText("Status updated successfully", { exact: true }).last()
      ).toBeVisible();
      await expect(statusBadge(page, label)).toBeVisible();
      await expect(page.locator("#announcer")).toContainText(
        "Status updated successfully."
      );
    }

    // The list reflects the final state.
    await page.goto(
      `/admin/contact?search=${encodeURIComponent(c.subject)}&status=resolved`
    );
    await expect(
      page
        .getByRole("row")
        .filter({ hasText: c.subject })
        .getByText("Resolved", { exact: true })
    ).toBeVisible();
  }
);

test(
  "the select offers exactly the three workflow states and shows the current one",
  { tag: "@TC-ADMCONTACT-022" },
  async ({ page, guestApi }) => {
    const c = await submitContact(guestApi, { tag: "options" });
    await openDetail(page, c);
    await expect(statusSelect(page)).toHaveText("New");
    await statusSelect(page).click();
    const options = page.getByRole("option");
    await expect(options).toHaveText(["New", "Processing", "Resolved"]);
    await expect(page.getByRole("option", { name: "New" })).toHaveAttribute(
      "aria-selected",
      "true"
    );
    await page.keyboard.press("Escape");
  }
);

test(
  "[EG] an unknown id reports 'not found' and renders no card",
  { tag: "@TC-ADMCONTACT-024" },
  async ({ page }) => {
    await page.goto("/admin/contact/000000000000000000000000");
    await expect(page.getByText("Contact request not found")).toBeVisible();
    await expect(page.getByRole("main").getByRole("combobox")).toHaveCount(0);
  }
);

test(
  "[EG] a malformed id is rejected and renders no card",
  { tag: "@TC-ADMCONTACT-024" },
  async ({ page }) => {
    await page.goto("/admin/contact/not-a-ticket");
    await expect(page.getByText("Validation failed")).toBeVisible();
    await expect(page.getByRole("main").getByRole("combobox")).toHaveCount(0);
  }
);

test(
  "BE 500 on a status change → error toast, status unchanged",
  { tag: "@TC-ADMCONTACT-025" },
  async ({ page, guestApi }) => {
    const c = await submitContact(guestApi, { tag: "status-500" });
    await openDetail(page, c);
    await page.route("**/api/v1/admin/contacts/*/status", (route) =>
      route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ code: "INTERNAL_SERVER_ERROR", message: "boom" })
      })
    );
    await chooseStatus(page, "Processing");
    await expect(
      page.getByText("Server error. Please try again later.", { exact: true })
    ).toBeVisible();
    await expect(page.locator("#announcer")).toContainText(
      "Failed to update status."
    );
    await page.unroute("**/api/v1/admin/contacts/*/status");
    await page.reload();
    await expect(statusBadge(page, "New")).toBeVisible();
  }
);

test(
  "vi: detail labels, status names and the update toast are Vietnamese",
  { tag: "@TC-ADMCONTACT-026" },
  async ({ page, guestApi }) => {
    const c = await submitContact(guestApi, {
      tag: "vi",
      email: "vi-reporter@e2e.example.com"
    });
    await openDetail(page, c, "/vi");
    await expect(
      page.getByRole("heading", { name: "Chi tiết liên hệ", level: 1 })
    ).toBeVisible();
    const main = page.getByRole("main");
    for (const label of ["Tiêu đề", "Tin nhắn", "Cập nhật lần cuối"])
      await expect(main.getByText(label, { exact: true })).toBeVisible();
    await expect(statusBadge(page, "Mới")).toBeVisible();
    await chooseStatus(page, "Đang xử lý");
    await expect(
      page.getByText("Cập nhật trạng thái thành công", { exact: true })
    ).toBeVisible();
    await expect(statusBadge(page, "Đang xử lý")).toBeVisible();
    await expect(page.getByText(/contactAdmin\./)).toHaveCount(0);
  }
);

test(
  "a request filed while signed in shows who filed it",
  { tag: "@TC-ADMCONTACT-027" },
  async ({ page, userApi }) => {
    // BUG: BUG-020 — the contact stores userId, but the admin detail DTO (toContactDetailItemDto) drops it, so the card's "User ID" field never renders.
    test.fail();
    const c = await submitContact(userApi, { tag: "signed-in" });
    const userId = await ownUserId(userApi);
    await openDetail(page, c);
    await expect(page.getByText(c.subject)).toBeVisible();
    const main = page.getByRole("main");
    await expect(main.getByText("User ID", { exact: true })).toBeVisible({
      timeout: 3_000
    });
    await expect(main.getByText(userId)).toBeVisible();
  }
);
