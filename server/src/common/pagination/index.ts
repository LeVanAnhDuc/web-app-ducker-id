// types
import type { SortOrder } from "@/common/sort";
import type { PaginationOptions } from "@/types/common";
// common
import { resolveSortDirection } from "@/common/sort";

export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100
} as const;

export type PaginationDefaults = typeof PAGINATION;

/**
 * Phần phân trang của một query string đã qua Joi. Mọi query type của module
 * đều gán được vào đây vì `sortBy` của chúng là union của string.
 */
export interface PagingQuery {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: SortOrder;
}

/** `PaginationOptions` (skip/limit/sort) mà repository nhận, kèm `page` để dựng meta. */
export interface ResolvedPaging extends PaginationOptions {
  page: number;
}

export interface PageMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginatedResult<T> {
  items: T[];
  meta: PageMeta;
}

/**
 * Quy đổi query sang tham số repository.
 *
 * `page` không cần chặn cận dưới: mọi schema phân trang trong
 * `src/validators/schemas/` đều khai `Joi.number().integer().min(1)`, nên
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

/**
 * `minTotalPages` tồn tại vì `web-app` trả `totalPages: 1` khi không có kết
 * quả, còn sáu endpoint phân trang kia trả `0`. Tham số này giữ nguyên hiện
 * trạng để đây vẫn là refactor thuần — thống nhất hai quy ước là một thay đổi
 * hợp đồng API, phải quyết riêng.
 */
export const toPageMeta = (
  total: number,
  page: number,
  limit: number,
  { minTotalPages = 0 }: { minTotalPages?: number } = {}
): PageMeta => ({
  total,
  page,
  limit,
  totalPages: Math.max(minTotalPages, Math.ceil(total / limit))
});
