// modules
import { ENTITLEMENT_EFFECTS } from "@/modules/entitlement/constants";

/** Who set the seeded overrides — must be one of TEST_USERS. */
export const ENTITLEMENT_SEED_ACTOR = "admin@test.com";

/**
 * One exception in each direction, on user2 only: user@test.com is the user
 * every E2E suite counts apps for, so an override on it would move their
 * expected numbers.
 */
export const ENTITLEMENT_OVERRIDES = [
  {
    email: "user2@test.com",
    appName: "notes",
    effect: ENTITLEMENT_EFFECTS.DENY
  },
  {
    email: "user2@test.com",
    appName: "ops-console",
    effect: ENTITLEMENT_EFFECTS.ALLOW
  }
];
