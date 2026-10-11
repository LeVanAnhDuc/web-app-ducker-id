// types
import type { ClientSession, FilterQuery } from "mongoose";
import type {
  WebAppDocument,
  WebAppCreateInput,
  WebAppUpdateInput,
  WebAppWithCategories
} from "../types";
import type { CategoryReassignment, OrphanApp } from "@/modules/category/types";
import type { AccessScope, AppAccessRule } from "@/modules/entitlement/types";

export interface WebAppRepository {
  /** `_id` + `requiredRoles` of every app (any status), or only of `ids`. */
  findAccessRules(ids?: string[]): Promise<AppAccessRule[]>;
  findAll(filter: FilterQuery<WebAppDocument>): Promise<WebAppDocument[]>;
  findById(id: string): Promise<WebAppDocument | null>;
  findByClientId(clientId: string): Promise<WebAppDocument | null>;
  existsByName(name: string): Promise<boolean>;
  existsByNameExcludingId(name: string, excludeId: string): Promise<boolean>;
  create(data: WebAppCreateInput): Promise<WebAppDocument>;
  updateById(
    id: string,
    data: WebAppUpdateInput
  ): Promise<WebAppDocument | null>;
  findActivePaginated(
    filter: FilterQuery<WebAppDocument>,
    options: { skip: number; limit: number }
  ): Promise<WebAppWithCategories[]>;
  findActiveByIds(
    ids: string[],
    filter: { access: AccessScope; search?: string; categoryId?: string }
  ): Promise<WebAppWithCategories[]>;
  countActive(filter: FilterQuery<WebAppDocument>): Promise<number>;
  /** Every app referencing the category, active or not. */
  countByCategory(categoryId: string): Promise<number>;
  /** Apps whose only category is `categoryId`. */
  findOrphansOf(
    categoryId: string,
    session?: ClientSession
  ): Promise<OrphanApp[]>;
  /** Moves each orphan to its target; an app that is no longer an orphan is skipped. */
  reassignOrphans(
    categoryId: string,
    reassignments: CategoryReassignment[],
    session: ClientSession
  ): Promise<void>;
  pullCategory(categoryId: string, session: ClientSession): Promise<void>;
  /**
   * Stamps `announcedAt` only if it is still unset. Returns whether this call
   * did it — exactly one caller wins, however many race.
   */
  markAnnounced(id: string): Promise<boolean>;
}
