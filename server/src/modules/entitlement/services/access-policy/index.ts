// types
import type { EntitlementRepository } from "../../repository/entitlement.repository";
import type { AccessScope } from "../../types";
// others
import { toAccessScope } from "../../entitlement.helper";

/**
 * Resolves the overrides of one user into the scope every access check reads.
 * Not cached: a revoke must hold on the very next request (DR-5), and a user
 * carries a handful of overrides at most, behind the `(userId, webAppId)` index.
 */
export class AccessPolicy {
  constructor(private readonly entitlementRepo: EntitlementRepository) {}

  async resolveScope(
    userId: string | undefined,
    role?: string
  ): Promise<AccessScope> {
    if (!userId) return { role, allowIds: [], denyIds: [] };
    const overrides = await this.entitlementRepo.findByUser(userId);
    return toAccessScope(userId, role, overrides);
  }
}
