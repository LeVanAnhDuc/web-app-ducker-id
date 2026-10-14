import type { APIResponse } from "@playwright/test";
import type { BaseClient } from "./base.client";

// /admin/entitlements — the admin router of server/src/modules/entitlement
// (createEntitlementAdminRoutes). Both endpoints sit behind authGuard +
// adminGuard, so the client is used on a request context that already carries
// a Bearer token (`createApiClient(adminApi).adminEntitlements`, or
// api.as(session)). On a context without one, the same calls prove the guards.
//
// PATCH goes through the entitlement-mutation rate limiter (60 / 60 s per
// IP + admin) BEFORE the body is validated.

/** One row of the matrix: effective access over the whole catalog. */
export interface UserAccess {
  userId: string;
  grantedAppIds: string[];
  overriddenAppIds: string[];
}

/** GET and PATCH answer the same `data`. */
export interface EntitlementMatrix {
  users: UserAccess[];
}

/** The value the admin wants for one cell; the server decides the override. */
export interface AccessChange {
  userId: string;
  appId: string;
  granted: boolean;
}

export function createAdminEntitlementsClient(base: BaseClient) {
  return {
    /** GET /admin/entitlements?userIds=a,b — rows in the order given. */
    matrix(
      userIds: string[],
      headers?: Record<string, string>
    ): Promise<APIResponse> {
      return base.call("get", "/admin/entitlements", {
        params: { userIds: userIds.join(",") },
        headers
      });
    },
    /** PATCH /admin/entitlements `{ changes }`. Any `changes` value is sent as is. */
    update(
      changes: AccessChange[] | unknown,
      headers?: Record<string, string>
    ): Promise<APIResponse> {
      return base.call("patch", "/admin/entitlements", {
        data: { changes },
        headers
      });
    }
  };
}

export type AdminEntitlementsClient = ReturnType<
  typeof createAdminEntitlementsClient
>;
