import { MongoClient, ObjectId } from "mongodb";
import { MONGO_DB_NAME, MONGO_URL } from "@/config/datastores";
import {
  ADMINCONTACT_MESSAGE,
  ADMINCONTACT_SUBJECT_PREFIX,
  SUPPORT_LEGACY_SUBJECT_PREFIX,
  SUPPORT_SUBJECT_PREFIX
} from "@/data/test-data";
import { escapeRegExp } from "./regex";

// Support requests (`contacts` collection) filed by the suite — shared by
// module SUPPORT (dialog, POST /contact/submit, /contacts/me) and module
// ADMINCONTACT (the admin inbox), which work on the same rows.
//
// Requests are not owned by the throwaway-account teardown when they are
// filed as a guest (userId null), and a leftover would shift the admin inbox
// counts other modules read. So every request a spec files carries a subject
// under a module prefix, and the module removes exactly those rows in
// afterAll with `deleteContactsBySubjectPrefix()`. A body too short to carry
// the prefix is removed by id (`deleteContactsById()`).

/** What the UI renders for a request id: the first 6 hex chars + "..." (client ShortId). */
export const SHORT_ID_RE = /^[0-9a-f]{6}\.\.\.$/;

/** The ShortId form of an id (client/src/components/ShortId). */
export const shortId = (id: string): string =>
  id.length > 6 ? `${id.slice(0, 6)}...` : id;

let seq = 0;

/** A subject unique to this run and call, under `prefix`. */
export function contactSubject(prefix: string, tag: string): string {
  seq += 1;
  return `${prefix} ${tag} ${Date.now().toString(36)}${seq}`;
}

async function withContacts<T>(
  fn: (
    contacts: ReturnType<ReturnType<MongoClient["db"]>["collection"]>
  ) => Promise<T>
): Promise<T> {
  const client = new MongoClient(MONGO_URL);
  await client.connect();
  try {
    return await fn(client.db(MONGO_DB_NAME).collection("contacts"));
  } finally {
    await client.close();
  }
}

/** Deletes every request whose subject starts with one of `prefixes`. */
export async function deleteContactsBySubjectPrefix(
  prefixes: string[]
): Promise<number> {
  if (prefixes.length === 0) return 0;
  const source = `^(${prefixes.map(escapeRegExp).join("|")})`;
  return withContacts(async (c) => {
    const res = await c.deleteMany({ subject: { $regex: source } });
    return res.deletedCount;
  });
}

/** Deletes specific requests — for bodies too short to carry a prefix. */
export async function deleteContactsById(ids: string[]): Promise<number> {
  if (ids.length === 0) return 0;
  return withContacts(async (c) => {
    const res = await c.deleteMany({
      _id: { $in: ids.map((id) => new ObjectId(id)) }
    });
    return res.deletedCount;
  });
}

/** The stored `contacts` document of an id, or null — what the server kept, not what it answered. */
export async function findContact(id: string) {
  return withContacts((c) => c.findOne({ _id: new ObjectId(id) }));
}

// ── module SUPPORT ──────────────────────────────────────────────────────────

/** A SUPPORT subject unique to this run and call, swept by `deleteSupportRequests()`. */
export const supportSubject = (tag: string): string =>
  contactSubject(SUPPORT_SUBJECT_PREFIX, tag);

/** Deletes every request a SUPPORT spec filed (current and legacy prefix). */
export const deleteSupportRequests = (): Promise<number> =>
  deleteContactsBySubjectPrefix([
    SUPPORT_SUBJECT_PREFIX,
    SUPPORT_LEGACY_SUBJECT_PREFIX
  ]);

// ── module ADMINCONTACT ─────────────────────────────────────────────────────

/**
 * The body of a POST /contact/submit an ADMINCONTACT spec files: a subject
 * unique to this run under the module prefix, the default message, and an
 * email only when given (a guest request without one stores `email: null`).
 */
export function adminContactTicket(
  tag: string,
  opts: { email?: string; message?: string } = {}
): { subject: string; message: string; email?: string } {
  return {
    subject: contactSubject(ADMINCONTACT_SUBJECT_PREFIX, tag),
    message: opts.message ?? ADMINCONTACT_MESSAGE,
    ...(opts.email ? { email: opts.email } : {})
  };
}

/** Deletes every request an ADMINCONTACT spec filed. */
export const deleteAdminContactRequests = (): Promise<number> =>
  deleteContactsBySubjectPrefix([ADMINCONTACT_SUBJECT_PREFIX]);
