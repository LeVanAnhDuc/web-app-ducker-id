// types
import type {
  CategoryCreateInput,
  CategoryUpdateInput,
  CategoryWithAppCount,
  WebAppCategoryDocument
} from "../types";

export interface CategoryRepository {
  /** Every category in display order, `(sortOrder, _id)`. */
  findAll(): Promise<WebAppCategoryDocument[]>;
  findAllWithAppCount(): Promise<CategoryWithAppCount[]>;
  findById(id: string): Promise<WebAppCategoryDocument | null>;
  /** Case-insensitive, same collation as the unique index. */
  existsByNameEn(nameEn: string, excludeId?: string): Promise<boolean>;
  /** Slugs equal to `base` or `base-<n>`, used to pick the next free suffix. */
  findSlugFamily(base: string, excludeId?: string): Promise<string[]>;
  /** -1 when there is no category yet. */
  findMaxSortOrder(): Promise<number>;
  /** How many of `ids` exist — callers pass a de-duplicated list. */
  countByIds(ids: string[]): Promise<number>;
  /** A duplicate `name.en` becomes 409; a duplicate slug is rethrown raw so the service can retry. */
  create(data: CategoryCreateInput): Promise<WebAppCategoryDocument>;
  /** A duplicate `name.en` becomes 409; a duplicate slug is rethrown raw so the service can retry. */
  updateById(
    id: string,
    data: CategoryUpdateInput
  ): Promise<WebAppCategoryDocument | null>;
  /** Rewrites `sortOrder` to each id's index in `orderedIds`. */
  setSortOrders(orderedIds: string[]): Promise<void>;
  deleteById(id: string): Promise<boolean>;
}
