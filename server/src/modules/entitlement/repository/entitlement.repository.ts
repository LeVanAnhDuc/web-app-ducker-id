// types
import type {
  EntitlementOverride,
  EntitlementPair,
  EntitlementUpsert
} from "../types";

export interface EntitlementRepository {
  findByUser(userId: string): Promise<EntitlementOverride[]>;
  findByUsers(userIds: string[]): Promise<EntitlementOverride[]>;
  /** One unordered bulk write; a no-op when both lists are empty. */
  applyChanges(input: {
    upserts: EntitlementUpsert[];
    deletes: EntitlementPair[];
  }): Promise<void>;
}
