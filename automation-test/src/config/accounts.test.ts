import fs from "node:fs";
import { test, expect } from "@playwright/test";
import { SEED_USERS_FILE, parseSeedUsers } from "./accounts";

test("parseSeedUsers pairs each password with the email that follows it", () => {
  const src = `[
    { authentication: { password: "A@1", roles: X }, user: { email: "a@test.com" } },
    { authentication: { password: "B@2" }, user: { email: "b@test.com", fullName: "B" } }
  ]`;
  expect(parseSeedUsers(src)).toEqual([
    { email: "a@test.com", password: "A@1" },
    { email: "b@test.com", password: "B@2" }
  ]);
});

test("the server seeder still yields the user and admin accounts", () => {
  // Fails when the seeder's shape changes — fix parseSeedUsers, not the seed.
  const accounts = parseSeedUsers(fs.readFileSync(SEED_USERS_FILE, "utf8"));
  const emails = accounts.map((a) => a.email);
  expect(emails).toContain("user@test.com");
  expect(emails).toContain("admin@test.com");
  for (const a of accounts) expect(a.password.length).toBeGreaterThanOrEqual(8);
});
