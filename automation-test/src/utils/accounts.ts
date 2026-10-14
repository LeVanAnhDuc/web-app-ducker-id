import { expect, request } from "@playwright/test";
import { MongoClient, ObjectId } from "mongodb";
import { BASE_URL } from "@/config/urls";
import { MONGO_DB_NAME, MONGO_URL } from "@/config/datastores";
import { clearEmailState, plantCode } from "./redis";
import {
  KNOWN_OTP,
  THROWAWAY_DOMAIN,
  THROWAWAY_PASSWORD
} from "@/data/test-data";

// Throwaway accounts.
//
// Any test that changes an account's state — locks it, fails a password,
// changes or resets a password, signs up — does it to an account of its own,
// never to the seeded user@test.com / admin@test.com every other spec logs in
// as. Accounts are created through the real sign-up API (send OTP → planted
// code → verify → complete), so they are indistinguishable from a real user.
//
// Every address lives under THROWAWAY_DOMAIN, which is what lets
// `deleteThrowawayAccounts()` remove them — and every row they produced —
// without touching seed data. The global teardown runs it after each run.

export interface Account {
  email: string;
  password: string;
  fullName: string;
}

let counter = 0;

/**
 * Identifies this run. Set once in playwright.config.ts (the main process),
 * inherited by every worker, and embedded in every throwaway address, so a
 * run's cleanup deletes only its own accounts — never those of a run going
 * on at the same time. It is a base-36 timestamp, which is what lets setup
 * recognise leftovers of a dead run by age.
 */
export const RUN_ID: string =
  process.env.E2E_RUN_ID ?? (process.env.E2E_RUN_ID = Date.now().toString(36));

/** A fresh, never-registered address under the throwaway domain. */
export function throwawayEmail(tag = "user"): string {
  counter += 1;
  const safe = tag
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .slice(0, 20);
  return `${safe}-r${RUN_ID}-${process.pid}x${counter}@${THROWAWAY_DOMAIN}`;
}

/**
 * Registers a new account through the public sign-up API and returns its
 * credentials. Fails the calling test if any step of sign-up fails.
 */
export async function createAccount(
  opts: {
    tag?: string;
    password?: string;
    fullName?: string;
    /** `yyyy-mm-dd`; sign-up accepts 13–120 years ago. Default 1995-06-15. */
    dateOfBirth?: string;
  } = {}
): Promise<Account> {
  const email = throwawayEmail(opts.tag);
  const password = opts.password ?? THROWAWAY_PASSWORD;
  const fullName = opts.fullName ?? "Throwaway Tester";
  await clearEmailState(email);

  const api = await request.newContext({ baseURL: BASE_URL });
  try {
    const send = await api.post("/api/v1/auth/signup/send-otp", {
      data: { email }
    });
    expect(send.ok(), `signup send-otp → ${send.status()}`).toBeTruthy();
    await plantCode("signup", email, KNOWN_OTP);

    const verify = await api.post("/api/v1/auth/signup/verify-otp", {
      data: { email, otp: KNOWN_OTP }
    });
    expect(verify.ok(), `signup verify-otp → ${verify.status()}`).toBeTruthy();
    const { data } = (await verify.json()) as {
      data: { sessionToken: string };
    };

    const complete = await api.post("/api/v1/auth/signup/complete", {
      data: {
        email,
        password,
        confirmPassword: password,
        sessionToken: data.sessionToken,
        acceptTerms: true,
        fullName,
        gender: "other",
        dateOfBirth: opts.dateOfBirth ?? "1995-06-15"
      }
    });
    expect(
      complete.ok(),
      `signup complete → ${complete.status()} ${await complete.text()}`
    ).toBeTruthy();
  } finally {
    await api.dispose();
  }
  return { email, password, fullName };
}

// ── Direct database access (cleanup and lookups only) ──────────────────────

let mongo: MongoClient | null = null;

async function db() {
  if (!mongo) {
    mongo = new MongoClient(MONGO_URL);
    await mongo.connect();
  }
  return mongo.db(MONGO_DB_NAME);
}

export async function closeMongo(): Promise<void> {
  if (mongo) {
    await mongo.close().catch(() => undefined);
    mongo = null;
  }
}

/** The `users` document for an email, or null. */
export async function findUserByEmail(email: string) {
  return (await db())
    .collection("users")
    .findOne({ email: email.toLowerCase() });
}

/** The `users._id` of an account, as the admin API addresses it. Throws when there is none. */
export async function userIdOf(email: string): Promise<string> {
  const user = await findUserByEmail(email);
  if (!user) throw new Error(`userIdOf: no users row for ${email}`);
  return String(user._id);
}

const RUN_IN_EMAIL = /-r([0-9a-z]+)-\d+x\d+@/;

/**
 * Deletes throwaway accounts and every row they produced. Seed accounts are
 * never matched — the filter is the throwaway domain.
 *
 *   { run: RUN_ID }       → only this run's accounts (teardown)
 *   { olderThanMs: 3h }   → accounts of runs that started that long ago, plus
 *                           any address without a run id (setup: leftovers of
 *                           a run that died before its teardown)
 */
export async function deleteThrowawayAccounts(
  scope: { run: string } | { olderThanMs: number }
): Promise<number> {
  const d = await db();
  const all = await d
    .collection("users")
    .find({ email: { $regex: `@${THROWAWAY_DOMAIN.replace(/\./g, "\\.")}$` } })
    .project<{ _id: ObjectId; authId: ObjectId; email: string }>({
      _id: 1,
      authId: 1,
      email: 1
    })
    .toArray();
  const users = all.filter((u) => {
    const run = RUN_IN_EMAIL.exec(u.email)?.[1];
    if ("run" in scope) return run === scope.run;
    if (!run) return true;
    return Date.now() - parseInt(run, 36) > scope.olderThanMs;
  });
  if (users.length === 0) return 0;

  const userIds = users.map((u) => u._id);
  const authIds = users.map((u) => u.authId).filter(Boolean);
  const anyId = [...userIds, ...authIds];

  await Promise.all([
    d.collection("login_histories").deleteMany({ userId: { $in: anyId } }),
    d.collection("refresh_tokens").deleteMany({ authId: { $in: authIds } }),
    d.collection("user_favorites").deleteMany({ userId: { $in: anyId } }),
    d.collection("user_app_usages").deleteMany({ userId: { $in: anyId } }),
    d.collection("notifications").deleteMany({ userId: { $in: anyId } }),
    d.collection("user_addresses").deleteMany({ userId: { $in: anyId } }),
    d.collection("entitlements").deleteMany({ userId: { $in: anyId } }),
    d.collection("contacts").deleteMany({
      $or: [
        { userId: { $in: anyId } },
        { email: { $in: users.map((u) => u.email) } }
      ]
    })
  ]);
  await d.collection("users").deleteMany({ _id: { $in: userIds } });
  await d.collection("auths").deleteMany({ _id: { $in: authIds } });
  return users.length;
}

/**
 * Refuses to run against a database that is not the seed — e.g. a developer's
 * real data. Two proofs: the seed's `content` category exists in MONGO_DB_NAME,
 * and the API under test serves that very document (same _id), so the suite's
 * direct writes (planted codes aside) land in the database the API reads.
 */
export async function assertSeededDatabase(categoryIdsFromApi: string[]) {
  const content = await (await db())
    .collection("web_app_categories")
    .findOne({ slug: "content" });
  const blog = await (await db())
    .collection("web_apps")
    .findOne({ name: "blog" });
  if (!content || !blog) {
    throw new Error(
      `Database "${MONGO_DB_NAME}" is not seeded (no "content" category / "blog" app). ` +
        "Run the suite against a dedicated database seeded with `pnpm seed` — never against real data."
    );
  }
  if (!categoryIdsFromApi.includes(String(content._id))) {
    throw new Error(
      `The API at the base URL is not using database "${MONGO_DB_NAME}" — set DB_NAME in automation-test/.env to the e2e server's DB_NAME.`
    );
  }
}
