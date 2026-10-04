export interface ValidationErrorItem {
  field: string;
  reason: string;
  message: string;
}

export interface PaginationOptions {
  skip: number;
  limit: number;
  sort: Record<string, 1 | -1>;
}
