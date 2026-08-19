interface PaginationMeta {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

interface ResponseMeta {
  pagination?: PaginationMeta;
}

interface PaginationInfo {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface Paginated<T> {
  items: T[];
  meta: PaginationInfo;
}

interface ResponsePattern<T> {
  timestamp: string;
  path: string;
  message: string;
  data: T;
  meta?: ResponseMeta;
}

interface ValidationErrorItem {
  field: string;
  reason: string;
  message: string;
}

interface ErrorResponsePattern {
  code: string;
  message: string;
  timestamp: string;
  path: string;
  errors?: ValidationErrorItem[];
}

type SetState<T> = React.Dispatch<React.SetStateAction<T>>;
type Nullable<T> = T | null;
type UnionEnum<T> = `${T}`;
