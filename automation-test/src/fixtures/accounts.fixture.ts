import { ADMIN, USER, type Account } from "@/config/accounts";
import { test as sessions } from "./sessions.fixture";

export const test = sessions.extend<{
  // Credentials of the declared role (guest → the seeded user, for a test that
  // signs in). Read-only: never lock it or change its password — a test that
  // does uses createAccount() from @/utils/accounts.
  account: Account;
}>({
  account: async ({ role }, use) => use(role === "admin" ? ADMIN : USER)
});
