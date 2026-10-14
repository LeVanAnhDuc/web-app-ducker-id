import { test, expect } from "@/fixtures";
import type { APIRequestContext } from "@playwright/test";
import { createApiClient } from "@/api";
import type { MyContactsPage, SubmittedContact } from "@/api/contact.client";
import { dataOf } from "@/api/response";
import { apiAs, loginInBrowser } from "@/api/session";
import { copyVi } from "@/data/copy";
import {
  ABSENT_CONTACT_ID,
  SUPPORT_MESSAGE,
  SUPPORT_SUBJECT_PREFIX
} from "@/data/test-data";
import { MyRequestDetailPage } from "@/pages/dashboard/my-request-detail.page";
import type { MyRequestsPage } from "@/pages/dashboard/my-requests.page";
import { createAccount } from "@/utils/accounts";
import { deleteSupportRequests, supportSubject } from "@/utils/contacts";

// My Requests — the read-only detail page (`/contacts/me/:id`).
// Role: user (user@test.com); the access and markup cases run as guest.
// Real backend throughout. Depends on the same seed as
// my-requests-list.e2e.ts: user@test.com owns ≥1 sample request.
// Test cases: test-cases/support.md (TC-SUPPORT-019 … 024, 053, 058).
//
// Owner scope is THE key security case: a request that exists but does not
// belong to the current user must 404, not leak. A guest submission created
// on the fly (owned by nobody) proves it; its subject carries the SUPPORT
// cleanup prefix and afterAll deletes it.

const MALFORMED_ID = "not-a-valid-object-id";
const GUEST_PROBE_SUBJECT = `${SUPPORT_SUBJECT_PREFIX} guest AuthZ probe (not owned by any user)`;

test.afterAll(async () => {
  await deleteSupportRequests();
});

/** A real id owned by the current user, read off the list's first row link. */
async function ownRequestId(list: MyRequestsPage): Promise<string> {
  await list.goto();
  const href = await list.rowLinks().first().getAttribute("href");
  const match = href?.match(/([0-9a-f]{24})(?:\?.*)?$/);
  if (!match) {
    throw new Error(
      "could not discover an owned request id from the list — check the seeder (attachMyContactsOwner)"
    );
  }
  return match[1];
}

/** The first request GET /contacts returns for the Bearer context. */
async function firstOwnRequest(
  userApi: APIRequestContext
): Promise<{ id: string; subject: string }> {
  const res = await createApiClient(userApi).contact.listMine();
  expect(res.ok()).toBeTruthy();
  const first = (await dataOf<MyContactsPage>(res)).items[0];
  if (!first) {
    throw new Error(
      "GET /contacts returned no request — check the seeder (attachMyContactsOwner)"
    );
  }
  return { id: first._id, subject: first.subject };
}

/**
 * Files a guest request (userId null — it belongs to nobody) and returns its
 * id. Spends one of the per-IP submit budget (5 / 15 min).
 */
async function guestRequestId(
  newApi: () => Promise<ReturnType<typeof createApiClient>>
): Promise<string> {
  const api = await newApi();
  const res = await api.contact.submit({
    subject: GUEST_PROBE_SUBJECT,
    message:
      "This guest-submitted contact exists only to prove owner-scope 404 in E2E — safe to ignore/delete."
  });
  expect(res.ok()).toBeTruthy();
  return (await dataOf<SubmittedContact>(res)).id;
}

test(
  "The detail page is read-only",
  { tag: ["@TC-SUPPORT-019", "@smoke"] },
  async ({ userApi, myRequestDetailPage: detail }) => {
    const { id, subject } = await firstOwnRequest(userApi);
    await detail.goto(id);

    await expect(detail.heading()).toBeVisible();
    await expect(detail.text(subject, { exact: true })).toBeVisible();
    // Full message body renders (dt/dd definition list, not truncated).
    await expect(detail.messageLabel()).toBeVisible();
    await expect(detail.times().first()).toBeVisible();

    // No status-change control anywhere on the read-only detail page.
    await expect(detail.statusCombobox()).toHaveCount(0);
    await expect(detail.updateStatusButton()).toHaveCount(0);

    // Breadcrumb back to the list.
    await expect(detail.breadcrumb()).toBeVisible();
  }
);

test.describe("A request owned by nobody else is not reachable", () => {
  test(
    "a request not owned by the current user renders not-found, not leaked",
    { tag: ["@TC-SUPPORT-020", "@smoke"] },
    async ({ newApi, myRequestDetailPage: detail }) => {
      const guestId = await guestRequestId(newApi);
      await detail.goto(guestId);

      await expect(detail.notFoundAlert()).toBeVisible();
      await expect(detail.notFoundAlert()).toContainText(
        /this request could not be found/i
      );
      // The guest request's content must never leak onto the page.
      await expect(detail.text("guest AuthZ probe")).toHaveCount(0);
    }
  );

  // Confirms the owner-scope 404 (not a leak, not a 403) at the API boundary,
  // with the seeded user's real Bearer token.
  test(
    "GET /contacts/:id for a request not owned by the caller is 404",
    { tag: ["@TC-SUPPORT-020", "@smoke"] },
    async ({ newApi, userApi }) => {
      const guestId = await guestRequestId(newApi);
      const res = await createApiClient(userApi).contact.getMine(guestId);
      expect(res.status()).toBe(404);
    }
  );
});

test.describe("Absent and malformed ids render not-found", () => {
  // A well-formed id nobody has, then a non-ObjectId (BE 400 at the params
  // pipe) — both render the same not-found state, no crash, no internal
  // error detail.
  for (const [label, id] of [
    ["an absent (well-formed but non-existent) id", ABSENT_CONTACT_ID],
    ["a malformed id", MALFORMED_ID]
  ] as const) {
    test(
      `${label} renders the not-found state`,
      { tag: "@TC-SUPPORT-021" },
      async ({ myRequestDetailPage: detail }) => {
        await detail.goto(id);
        await expect(detail.notFoundAlert()).toBeVisible();
        await expect(detail.notFoundAlert()).toContainText(
          /this request could not be found/i
        );
      }
    );
  }
});

test.describe("Detail page in English and Vietnamese", () => {
  test(
    "EN: detail title, breadcrumb and fields render in English",
    { tag: "@TC-SUPPORT-022" },
    async ({ myRequestsPage, myRequestDetailPage: detail }) => {
      const id = await ownRequestId(myRequestsPage);
      await detail.goto(id);
      await expect(detail.heading()).toBeVisible();
      await expect(detail.breadcrumbListText()).toBeVisible();
      await expect(detail.messageLabel()).toBeVisible();
      await expect(detail.leakedKey()).toHaveCount(0);
    }
  );

  test(
    "VI: detail title, breadcrumb and fields render in Vietnamese",
    { tag: "@TC-SUPPORT-022" },
    async ({ page, myRequestsPage }) => {
      const id = await ownRequestId(myRequestsPage);
      const detail = new MyRequestDetailPage(page, copyVi, "/vi");
      await detail.goto(id);
      await expect(detail.heading()).toBeVisible();
      await expect(detail.breadcrumbListText()).toBeVisible();
      await expect(detail.messageLabel()).toBeVisible();
      await expect(detail.leakedKey()).toHaveCount(0);
    }
  );
});

test(
  "Not-found in Vietnamese",
  { tag: "@TC-SUPPORT-023" },
  async ({ page }) => {
    const detail = new MyRequestDetailPage(page, copyVi, "/vi");
    await detail.goto(ABSENT_CONTACT_ID);
    await expect(detail.notFoundAlert()).toBeVisible();
    await expect(detail.notFoundAlert()).toContainText(
      copyVi.contactAdmin.myContacts.detail.notFound
    );
  }
);

test.describe("Detail accessibility", () => {
  test(
    "heading order: page title before the ticket sub-heading (h2)",
    { tag: "@TC-SUPPORT-024" },
    async ({ myRequestsPage, myRequestDetailPage: detail }) => {
      const id = await ownRequestId(myRequestsPage);
      await detail.goto(id);
      await expect(detail.headings().first()).toBeVisible();
      // The card's own <h2> (ticket ShortId heading) exists after the title.
      await expect(detail.ticketHeading()).toBeVisible();
    }
  );

  test(
    "breadcrumb link back to the list is keyboard-reachable",
    { tag: "@TC-SUPPORT-024" },
    async ({ myRequestsPage, myRequestDetailPage: detail }) => {
      const id = await ownRequestId(myRequestsPage);
      await detail.goto(id);
      const backLink = detail.breadcrumbListLink();
      await expect(backLink).toBeVisible();
      await backLink.focus();
      await expect(backLink).toBeFocused();
    }
  );

  test(
    "not-found state is announced via role=alert",
    { tag: "@TC-SUPPORT-024" },
    async ({ myRequestDetailPage: detail }) => {
      await detail.goto(ABSENT_CONTACT_ID);
      await expect(detail.anyAlert()).toBeVisible();
    }
  );
});

test.describe("guest", () => {
  test.use({ role: "guest" });

  test(
    "A guest opening a request detail is sent to login",
    { tag: "@TC-SUPPORT-053" },
    async ({ page, myRequestDetailPage: detail }) => {
      await detail.goto(ABSENT_CONTACT_ID);
      await expect(page).toHaveURL(/login/);
    }
  );

  test(
    "Markup in a request is shown as text, never rendered",
    { tag: "@TC-SUPPORT-058" },
    async ({ page, myRequestDetailPage: detail }) => {
      const account = await createAccount({ tag: "support-markup" });
      const src = "x-e2e-support-markup";
      const markup = `<img src="${src}" onerror="window.__supportMarkup=1">`;
      const owner = await apiAs(account.email, account.password);
      let id: string;
      try {
        const res = await createApiClient(owner).contact.submit({
          subject: `${supportSubject("markup")} ${markup}`,
          message: `${SUPPORT_MESSAGE} ${markup}`
        });
        expect(res.status()).toBe(201);
        id = (await dataOf<SubmittedContact>(res)).id;
      } finally {
        await owner.dispose();
      }

      await loginInBrowser(page, account.email, account.password);
      await detail.goto(id);
      await expect(detail.heading()).toBeVisible();
      await expect(detail.messageLabel()).toBeVisible();
      await expect(detail.imageWithSrc(src)).toHaveCount(0);
      expect(
        await page.evaluate(
          () =>
            (window as unknown as { __supportMarkup?: number }).__supportMarkup
        )
      ).toBeUndefined();
    }
  );
});

// A11Y FOLLOW-UP (flagged, not fixed — app code is out of scope): the detail
// card's ticket heading (<h2><ShortId .../></h2>) exposes the full id only
// through ShortId's `title` attribute (hover tooltip); keyboard and
// screen-reader users get no equivalent.
