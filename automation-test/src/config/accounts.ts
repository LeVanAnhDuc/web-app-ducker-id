import fs from "node:fs";
import path from "node:path";
import { REPO_ROOT, suiteVar } from "./env";

export interface Account {
  email: string;
  password: string;
}

/** The seeder every e2e database is built from (`server: pnpm seed`). */
export const SEED_USERS_FILE = path.join(
  REPO_ROOT,
  "server/src/database/seeders/data/users.ts"
);

/**
 * Reads `{ password, … }` / `{ email, … }` pairs out of the seeder's source.
 * Parsed as text, not imported: the seeder uses the server's `@/` alias, which
 * means something else here. Each entry has its `authentication.password`
 * before its `user.email` — `seed-accounts.test.ts` pins that shape.
 */
export function parseSeedUsers(source: string): Account[] {
  const accounts: Account[] = [];
  let password: string | undefined;
  for (const m of source.matchAll(/\b(password|email):\s*"([^"]+)"/g)) {
    if (m[1] === "password") password = m[2];
    else if (password) {
      accounts.push({ email: m[2], password });
      password = undefined;
    }
  }
  return accounts;
}

let seeded: Account[] | undefined;

export function seedAccount(email: string): Account {
  seeded ??= parseSeedUsers(fs.readFileSync(SEED_USERS_FILE, "utf8"));
  const account = seeded.find((a) => a.email === email);
  if (!account) {
    throw new Error(
      `${email} is not in ${path.relative(REPO_ROOT, SEED_USERS_FILE)}`
    );
  }
  return account;
}

function account(prefix: string, defaultEmail: string): Account {
  const email = suiteVar(`${prefix}_EMAIL`) ?? defaultEmail;
  return {
    email,
    password: suiteVar(`${prefix}_PASSWORD`) ?? seedAccount(email).password
  };
}

/** Seeded regular user — shared by every spec, never locked or re-passworded. */
export const USER: Account = account("E2E_USER", "user@test.com");
/** Seeded admin — same rules. */
export const ADMIN: Account = account("E2E_ADMIN", "admin@test.com");

export const USER_EMAIL = USER.email;
export const USER_PASSWORD = USER.password;
export const ADMIN_EMAIL = ADMIN.email;
export const ADMIN_PASSWORD = ADMIN.password;
