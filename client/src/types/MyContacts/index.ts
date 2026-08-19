// types
import type { ContactStatus, Priority } from "@/types/ContactAdmin";
import type { SortOrder } from "@/types/List";

export interface MyContact {
  _id: string;
  subject: string;
  priority: Priority;
  status: ContactStatus;
  createdAt: string;
}

export interface MyContactDetail extends MyContact {
  message: string;
  updatedAt: string;
}

export type PaginatedMyContactsResponse = Paginated<MyContact>;

export interface MyContactsQueryParams {
  page?: number;
  limit?: number;
  status?: ContactStatus;
  search?: string;
  sortBy?: "createdAt";
  sortOrder?: SortOrder;
}
