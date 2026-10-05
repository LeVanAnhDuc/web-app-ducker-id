// types
import type { EntitlementAdminServiceDeps } from "../deps";

export const USER_ID = "64b2f0c2f1a2b3c4d5e6f7d1";
export const ADMIN_ID = "64b2f0c2f1a2b3c4d5e6f7d2";
export const ACTOR_ID = "64b2f0c2f1a2b3c4d5e6f7d9";
export const BLOG_ID = "64b2f0c2f1a2b3c4d5e6f7e1";
export const OPS_ID = "64b2f0c2f1a2b3c4d5e6f7e2";

const rule = (id: string, requiredRoles: string[]) => ({
  _id: { toString: () => id },
  requiredRoles
});

/** Blog is open to users, Operations Console to admins only. */
export const CATALOG = [rule(BLOG_ID, ["user"]), rule(OPS_ID, ["admin"])];

/**
 * Bare jest.fn()s — `resetMocks: true` clears implementations between tests,
 * so `setup()` in each spec rebuilds the behaviour it needs.
 */
export const makeDeps = () => {
  const entitlementRepo = {
    findByUser: jest.fn(),
    findByUsers: jest.fn(),
    applyChanges: jest.fn()
  };
  const userRepo = { findRolesByIds: jest.fn() };
  const webAppRepo = { findAccessRules: jest.fn() };
  const deps = {
    entitlementRepo,
    userRepo,
    webAppRepo
  } as unknown as EntitlementAdminServiceDeps;
  return { deps, entitlementRepo, userRepo, webAppRepo };
};
