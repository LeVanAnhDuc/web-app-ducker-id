// types
import type { SortOrder } from "@/common/sort";
import type { PaginationOptions } from "@/types/common";
// common
import { ApiProperty } from "@/common/openapi/api-property";
import { resolveSortDirection } from "@/common/sort";

export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100
} as const;

export type PaginationDefaults = typeof PAGINATION;

/**
 * Mọi query type của module đều gán được vào đây vì `sortBy` của chúng là
 * union của string.
 */
export interface PagingQuery {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: SortOrder;
}

export interface ResolvedPaging extends PaginationOptions {
  page: number;
}

/** A class so `/api-docs` can document it; built as a plain literal by `toPageMeta`. */
export class PageMeta {
  @ApiProperty({ type: "integer", example: 157 })
  total!: number;

  @ApiProperty({ type: "integer", example: 1 })
  page!: number;

  @ApiProperty({ type: "integer", example: 20 })
  limit!: number;

  @ApiProperty({ type: "integer", example: 8 })
  totalPages!: number;
}

export interface PaginatedResult<T> {
  items: T[];
  meta: PageMeta;
}

/**
 * `page` không cần chặn cận dưới: mọi query DTO phân trang đều kế thừa
 * `PaginationQueryDto` / `PageQueryDto` (`@Min(1)`), nên
 * `page < 1` bị từ chối ở pipe trước khi tới service.
 */
export const resolvePaging = (
  query: PagingQuery,
  defaultSortBy = "createdAt"
): ResolvedPaging => {
  const page = query.page ?? PAGINATION.DEFAULT_PAGE;
  const limit = Math.min(
    query.limit ?? PAGINATION.DEFAULT_LIMIT,
    PAGINATION.MAX_LIMIT
  );

  return {
    page,
    limit,
    skip: (page - 1) * limit,
    sort: {
      [query.sortBy ?? defaultSortBy]: resolveSortDirection(query.sortOrder)
    }
  };
};

export const toPageMeta = (
  total: number,
  page: number,
  limit: number
): PageMeta => ({
  total,
  page,
  limit,
  totalPages: Math.ceil(total / limit)
});
