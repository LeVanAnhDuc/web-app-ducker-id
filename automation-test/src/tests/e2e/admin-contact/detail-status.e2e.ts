import { test, expect } from "@/fixtures";
import { contactRoutes } from "@/api/contact.client";
import { clientLiteral, copy, copyVi, serverMessage } from "@/data/copy";
import { AdminContactDetailPage } from "@/pages/admin/admin-contact-detail.page";
import { ownUserId } from "@/utils/admin-users";
import { deleteAdminContactRequests } from "@/utils/contacts";
import { failStatusChange, fileTicket, holdStatusChange } from "./helpers";

test.use({ role: "admin" });

// Admin support request detail (REQ-ADMINCONTACT-02) and its status workflow
// new → processing → resolved (REQ-ADMINCONTACT-03), driven through the status
// select on the detail card. Runs as admin (role fixture). Each test files
// its own request (`fileTicket`) and `afterAll` deletes them, so no request
// somebody else filed ever changes status.
// The API side of the workflow (invalid targets, unknown ids) is in
// tests/api/admin-contact/contacts.api.ts.
// Test cases: test-cases/admin-contact.md.

const status = copy.contactAdmin.admin.list.status;
const fields = copy.contactAdmin.admin.detail.fields;
const updateStatus = copy.contactAdmin.admin.detail.updateStatus;
const announce = copy.contactAdmin.announce;

test.afterAll(async () => {
  await deleteAdminContactRequests();
});

test(
  "Detail shows the request",
  { tag: ["@TC-ADMINCONTACT-020", "@smoke"] },
  async ({ adminContactDetailPage: detail, guestApi }) => {
    const c = await fileTicket(guestApi, "detail", {
      email: "detail-reporter@e2e.example.com",
      message:
        "Line one of the report.\nLine two keeps its line break in the detail view."
    });
    await detail.goto(c.id);
    await expect(detail.heading()).toBeVisible();
    await expect(detail.idHeading(c.id)).toBeVisible();
    for (const label of [
      fields.email,
      fields.subject,
      fields.message,
      fields.updatedAt
    ])
      await expect(detail.fieldLabel(label)).toBeVisible();
    await expect(
      detail.mainText("detail-reporter@e2e.example.com")
    ).toBeVisible();
    await expect(detail.mainText(c.subject)).toBeVisible();
    await expect(
      detail.mainText("Line two keeps its line break")
    ).toBeVisible();
    await expect(detail.statusBadge(status.new)).toBeVisible();
    await expect(detail.noAttachments()).toBeVisible();
    await expect(detail.breadcrumbListLink()).toBeVisible();
  }
);

test(
  "new → processing → resolved",
  { tag: ["@TC-ADMINCONTACT-021", "@smoke"] },
  async ({
    adminContactDetailPage: detail,
    adminContactPage: list,
    guestApi
  }) => {
    // [ST] the valid path, through the status select.
    const c = await fileTicket(guestApi, "workflow");
    await detail.goto(c.id);
    await expect(detail.statusBadge(status.new)).toBeVisible();

    for (const [label, value] of [
      [status.processing, "processing"],
      [status.resolved, "resolved"]
    ] as const) {
      const patch = detail.page.waitForResponse(
        (r) =>
          r.url().endsWith(`/admin/contacts/${c.id}/status`) &&
          r.request().method() === "PATCH"
      );
      await detail.chooseStatus(label);
      const res = await patch;
      expect(res.status()).toBe(200);
      expect(res.request().postDataJSON()).toEqual({ status: value });
      // The previous step's toast may still be on screen.
      await expect(
        detail.toast.withText(updateStatus.success, { exact: true }).last()
      ).toBeVisible();
      await expect(detail.statusBadge(label)).toBeVisible();
      await expect(detail.announcer.region()).toContainText(
        announce.statusUpdated
      );
    }

    // The list reflects the final state.
    await list.gotoWith({ search: c.subject, status: "resolved" });
    await expect(
      list.row(c.subject).getByText(status.resolved, { exact: true })
    ).toBeVisible();
  }
);

test(
  "The select offers exactly the three states",
  { tag: "@TC-ADMINCONTACT-022" },
  async ({ adminContactDetailPage: detail, guestApi }) => {
    const c = await fileTicket(guestApi, "options");
    await detail.goto(c.id);
    await expect(detail.statusSelect()).toHaveText(status.new);
    await detail.statusSelect().click();
    await expect(detail.options()).toHaveText([
      status.new,
      status.processing,
      status.resolved
    ]);
    await expect(detail.option(status.new)).toHaveAttribute(
      "aria-selected",
      "true"
    );
    await detail.page.keyboard.press("Escape");
  }
);

test.describe("Unknown and malformed ids", () => {
  test(
    "[EG] an unknown id reports 'not found' and renders no card",
    { tag: "@TC-ADMINCONTACT-024" },
    async ({ adminContactDetailPage: detail }) => {
      await detail.goto("000000000000000000000000");
      await expect(
        detail.toast.withText(serverMessage.contactAdmin.errors.notFound)
      ).toBeVisible();
      await expect(detail.statusSelect()).toHaveCount(0);
    }
  );

  test(
    "[EG] a malformed id is rejected and renders no card",
    { tag: "@TC-ADMINCONTACT-024" },
    async ({ adminContactDetailPage: detail }) => {
      await detail.goto("not-a-ticket");
      await expect(
        detail.toast.withText(serverMessage.common.errors.validationFailed)
      ).toBeVisible();
      await expect(detail.statusSelect()).toHaveCount(0);
    }
  );
});

test(
  "A failed status change leaves the status as it was",
  { tag: "@TC-ADMINCONTACT-025" },
  async ({ adminContactDetailPage: detail, guestApi }) => {
    // [EG] BE 500 on the PATCH.
    const c = await fileTicket(guestApi, "status-500");
    await detail.goto(c.id);
    const unroute = await failStatusChange(detail.page);
    await detail.chooseStatus(status.processing);
    await expect(
      detail.toast.withText(clientLiteral.serverErrorToast, { exact: true })
    ).toBeVisible();
    await expect(detail.announcer.region()).toContainText(announce.statusError);
    await unroute();
    await detail.page.reload();
    await expect(detail.statusBadge(status.new)).toBeVisible();
  }
);

test(
  "Vietnamese detail and status update",
  { tag: "@TC-ADMINCONTACT-026" },
  async ({ page, guestApi }) => {
    const vi = copyVi.contactAdmin.admin;
    const detail = new AdminContactDetailPage(page, copyVi, "/vi");
    const c = await fileTicket(guestApi, "vi", {
      email: "vi-reporter@e2e.example.com"
    });
    await detail.goto(c.id);
    await expect(detail.heading()).toBeVisible();
    for (const label of [
      vi.detail.fields.subject,
      vi.detail.fields.message,
      vi.detail.fields.updatedAt
    ])
      await expect(detail.fieldLabel(label)).toBeVisible();
    await expect(detail.statusBadge(vi.list.status.new)).toBeVisible();
    await detail.chooseStatus(vi.list.status.processing);
    await expect(
      detail.toast.withText(vi.detail.updateStatus.success, { exact: true })
    ).toBeVisible();
    await expect(detail.statusBadge(vi.list.status.processing)).toBeVisible();
    await expect(detail.text(/contactAdmin\./)).toHaveCount(0);
  }
);

test(
  "Detail shows who filed a signed-in request",
  { tag: "@TC-ADMINCONTACT-027" },
  async ({ adminContactDetailPage: detail, userApi }) => {
    // the contact stores userId, but the admin detail DTO (toContactDetailItemDto) drops it, so the card's "User ID" field never renders.
    // BUG: defects/admin-contact.md#bug-admincontact-01
    test.fail();
    const c = await fileTicket(userApi, "signed-in");
    const userId = await ownUserId(userApi);
    await detail.goto(c.id);
    await expect(detail.text(c.subject)).toBeVisible();
    await expect(detail.fieldLabel(fields.userId)).toBeVisible({
      timeout: 3_000
    });
    await expect(detail.mainText(userId)).toBeVisible();
  }
);

test(
  "The breadcrumb leads back to the inbox",
  { tag: "@TC-ADMINCONTACT-039" },
  async ({
    adminContactDetailPage: detail,
    adminContactPage: list,
    guestApi
  }) => {
    // [ST] detail → back to the list through the breadcrumb.
    const c = await fileTicket(guestApi, "breadcrumb");
    await detail.goto(c.id);
    await expect(detail.idHeading(c.id)).toBeVisible();
    await detail.breadcrumbListLink().click();
    await expect(list.page).toHaveURL(/\/admin\/contact$/);
    await expect(list.heading()).toBeVisible();
  }
);

test(
  "The status select is locked while a change is in flight",
  { tag: "@TC-ADMINCONTACT-040" },
  async ({ adminContactDetailPage: detail, guestApi }) => {
    // [EG] double submit: a second choice cannot start while the first PATCH
    // is pending.
    const c = await fileTicket(guestApi, "in-flight");
    await detail.goto(c.id);
    await expect(detail.statusBadge(status.new)).toBeVisible();
    const hold = await holdStatusChange(detail.page);
    await detail.chooseStatus(status.processing);
    await hold.held();
    await expect(detail.statusSelect()).toBeDisabled();

    const patch = detail.page.waitForResponse(
      (r) =>
        contactRoutes.adminStatus.test(r.url()) &&
        r.request().method() === "PATCH"
    );
    hold.release();
    expect((await patch).status()).toBe(200);
    await expect(detail.statusSelect()).toBeEnabled();
    await expect(detail.statusBadge(status.processing)).toBeVisible();
  }
);
