export interface ValidationErrorItem {
  field: string;
  reason: string;
  message: string;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ResponseMeta {
  pagination?: PaginationMeta;
}

export interface PaginationOptions {
  skip: number;
  limit: number;
  sort: Record<string, 1 | -1>;
}
