export interface ValidationErrorItem {
  field: string;
  reason: string;
  message: string;
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface ResponseMeta {
  pagination?: PaginationMeta;
}

export interface PaginationOptions {
  skip: number;
  limit: number;
  sort: Record<string, 1 | -1>;
}
