import { expect } from "@playwright/test";
import type { APIRequestContext } from "@playwright/test";
import { MongoClient } from "mongodb";
import { MONGO_DB_NAME, MONGO_URL } from "./env";

// Admin support-inbox helpers (module ADMCONTACT).
//
// Status changes never touch a request somebody else filed: each test files
// its own through the real public endpoint (`POST /contact/submit`) with a
// subject starting with CONTACT_SUBJECT_PREFIX, works on that one, and
// `deleteTestContacts()` removes every request carrying the prefix afterwards.

export const CONTACT_SUBJECT_PREFIX = "E2E support ticket";

export type ContactStatus = "new" | "processing" | "resolved";

export interface SubmittedContact {
  _id: string;
  subject: string;
  message: string;
  email: string | null;
}

let seq = 0;

/** A subject unique to this run and call, under the cleanup prefix. */
export function uniqueSubject(tag: string): string {
  seq += 1;
  return `${CONTACT_SUBJECT_PREFIX} ${tag} ${Date.now().toString(36)}${seq}`;
}

/**
 * Files a support request through the public endpoint. With a Bearer
 * context the request is attached to that account (`userId`); with a guest
 * context it is anonymous.
 */
export async function submitContact(
  api: APIRequestContext,
  opts: {
    tag?: string;
    subject?: string;
    email?: string;
    message?: string;
  } = {}
): Promise<SubmittedContact> {
  const subject = opts.subject ?? uniqueSubject(opts.tag ?? "case");
  const message =
    opts.message ??
    "Automated regression request — the dashboard fails to load after sign-in.";
  const res = await api.post("/api/v1/contact/submit", {
    data: { subject, message, ...(opts.email ? { email: opts.email } : {}) }
  });
  expect(
    res.ok(),
    `POST /contact/submit → ${res.status()} ${await res.text()}`
  ).toBe(true);
  const body = (await res.json()) as { data: { _id?: string; id?: string } };
  const id = body.data._id ?? body.data.id;
  expect(id, "submit response carries the new request id").toBeTruthy();
  return { _id: id as string, subject, message, email: opts.email ?? null };
}

/** PATCH /admin/contacts/:id/status. */
export function setContactStatus(
  adminApi: APIRequestContext,
  id: string,
  status: string
) {
  return adminApi.patch(`/api/v1/admin/contacts/${id}/status`, {
    data: { status }
  });
}

/** Deletes every support request whose subject carries the test prefix. */
export async function deleteTestContacts(): Promise<number> {
  const client = new MongoClient(MONGO_URL);
  await client.connect();
  try {
    const res = await client
      .db(MONGO_DB_NAME)
      .collection("contacts")
      .deleteMany({ subject: { $regex: `^${CONTACT_SUBJECT_PREFIX}` } });
    return res.deletedCount;
  } finally {
    await client.close();
  }
}
