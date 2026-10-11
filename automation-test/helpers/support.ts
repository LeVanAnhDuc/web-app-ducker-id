import { MongoClient, ObjectId } from "mongodb";
import { MONGO_DB_NAME, MONGO_URL } from "./env";

// Support requests filed by the SUPPORT module (dialog and POST /contact/submit).
//
// Every request a SUPPORT spec files carries a subject under one of these
// prefixes, so `deleteSupportRequests()` can remove exactly those rows in
// afterAll — contacts are not owned by the throwaway-account cleanup, and a
// leftover would shift the admin inbox counts other modules read.

export const SUPPORT_SUBJECT_PREFIX = "E2E support request";
/** Prefix of the older my-requests submit test; swept by the same cleanup. */
export const LEGACY_SUBJECT_PREFIX = "E2E MyContacts submit";

export const SUPPORT_MESSAGE =
  "Automated regression request: the dashboard fails to load after sign-in.";

let seq = 0;

/** A subject unique to this run and call, under the cleanup prefix. */
export function supportSubject(tag: string): string {
  seq += 1;
  return `${SUPPORT_SUBJECT_PREFIX} ${tag} ${Date.now().toString(36)}${seq}`;
}

export async function deleteSupportRequests(): Promise<number> {
  const client = new MongoClient(MONGO_URL);
  await client.connect();
  try {
    const res = await client
      .db(MONGO_DB_NAME)
      .collection("contacts")
      .deleteMany({
        subject: {
          $regex: `^(${SUPPORT_SUBJECT_PREFIX}|${LEGACY_SUBJECT_PREFIX})`
        }
      });
    return res.deletedCount;
  } finally {
    await client.close();
  }
}

/** Deletes specific requests — for bodies too short to carry the prefix. */
export async function deleteContactsById(ids: string[]): Promise<number> {
  if (ids.length === 0) return 0;
  const client = new MongoClient(MONGO_URL);
  await client.connect();
  try {
    const res = await client
      .db(MONGO_DB_NAME)
      .collection("contacts")
      .deleteMany({ _id: { $in: ids.map((id) => new ObjectId(id)) } });
    return res.deletedCount;
  } finally {
    await client.close();
  }
}
