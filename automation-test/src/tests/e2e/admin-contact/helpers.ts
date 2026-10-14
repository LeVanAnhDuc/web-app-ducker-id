import type { APIRequestContext, Page, Request } from "@playwright/test";
import { expect } from "@/fixtures";
import { createApiClient } from "@/api";
import {
  contactRoutes,
  submittedOf,
  type SubmittedContact
} from "@/api/contact.client";
import { adminContactTicket } from "@/utils/contacts";

// Scaffolding the ADMINCONTACT UI specs share (split from the former
// helpers/adminContact.ts): filing a request of the test's own, and the
// `page.route` stubs / request capture for the inbox endpoints.

/**
 * Files a support request through the public endpoint, under the module's
 * cleanup prefix. A Bearer context (`userApi`) attaches it to that account;
 * `guestApi` files it anonymously.
 */
export async function fileTicket(
  ctx: APIRequestContext,
  tag: string,
  opts: { email?: string; message?: string } = {}
): Promise<SubmittedContact> {
  return submittedOf(
    await createApiClient(ctx).contact.submit(adminContactTicket(tag, opts))
  );
}

/** A canned inbox row: a fixed 24-hex id, so the ShortId is "012345...". */
export const STUB_ID = "0123456789abcdef01234567";

export const STUB_LIST_ITEM = {
  _id: STUB_ID,
  email: "reporter@test.com",
  subject: "Cannot access my dashboard",
  priority: "high",
  status: "new",
  createdAt: "2026-01-15T08:30:00.000Z",
  updatedAt: "2026-01-15T08:30:00.000Z",
  attachmentCount: 0
};

export const STUB_DETAIL_ITEM = {
  ...STUB_LIST_ITEM,
  message: "I keep getting a 500 error when opening the dashboard.",
  ipAddress: "203.0.113.9",
  attachments: []
};

const envelope = (data: unknown) => ({
  timestamp: new Date().toISOString(),
  path: contactRoutes.adminListPath,
  message: "ok",
  data
});

/**
 * Stubs the inbox list (`GET /admin/contacts`, with or without a query) and
 * the detail (`GET /admin/contacts/:id`) with deterministic JSON — nothing
 * touches the DB. The two patterns are disjoint (the detail one needs a path
 * segment after `contacts`, the list one forbids it).
 */
export async function stubContactApis(
  page: Page,
  {
    listItems = [STUB_LIST_ITEM],
    detailItem = STUB_DETAIL_ITEM
  }: {
    listItems?: Record<string, unknown>[];
    detailItem?: Record<string, unknown>;
  } = {}
): Promise<void> {
  await page.route(contactRoutes.adminDetail, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(envelope(detailItem))
    })
  );
  await page.route(contactRoutes.adminList, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(
        envelope({
          items: listItems,
          meta: { total: listItems.length, page: 1, limit: 20, totalPages: 1 }
        })
      )
    })
  );
}

/**
 * Records every inbox list request the page makes. The returned function
 * waits for at least one and resolves with the query of the latest.
 */
export function captureListRequests(
  page: Page
): () => Promise<URLSearchParams> {
  const seen: Request[] = [];
  page.on("request", (r) => {
    if (contactRoutes.adminList.test(r.url()) && r.method() === "GET")
      seen.push(r);
  });
  return async () => {
    await expect.poll(() => seen.length).toBeGreaterThan(0);
    return new URL(seen[seen.length - 1].url()).searchParams;
  };
}

/** Answers every status change with a 500. Returns the matching `unroute`. */
export async function failStatusChange(
  page: Page
): Promise<() => Promise<void>> {
  await page.route(contactRoutes.adminStatus, (route) =>
    route.fulfill({
      status: 500,
      contentType: "application/json",
      body: JSON.stringify({ code: "INTERNAL_SERVER_ERROR", message: "boom" })
    })
  );
  return () => page.unroute(contactRoutes.adminStatus);
}

/**
 * Holds every status change until `release()` is called, then lets it reach
 * the real API — the window in which the select must stay locked.
 */
export async function holdStatusChange(
  page: Page
): Promise<{ release: () => void; held: () => Promise<void> }> {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => (release = resolve));
  let markHeld!: () => void;
  const heldPromise = new Promise<void>((resolve) => (markHeld = resolve));
  await page.route(contactRoutes.adminStatus, async (route) => {
    markHeld();
    await gate;
    await route.continue();
  });
  return { release, held: () => heldPromise };
}
