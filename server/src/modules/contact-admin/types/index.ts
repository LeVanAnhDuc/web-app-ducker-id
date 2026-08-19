// types
import type { Request } from "express";
import type { Document, Types } from "mongoose";
import type {
  CONTACT_PRIORITIES,
  CONTACT_STATUSES,
  ADMIN_CONTACTS_SORT_BY
} from "../constants";
// common
import type { SortOrder } from "@/common/sort";

export type ContactPriority =
  (typeof CONTACT_PRIORITIES)[keyof typeof CONTACT_PRIORITIES];
export type ContactStatus =
  (typeof CONTACT_STATUSES)[keyof typeof CONTACT_STATUSES];

export type AdminContactsSortBy = (typeof ADMIN_CONTACTS_SORT_BY)[number];

export interface ContactDocument extends Document {
  email?: string;
  subject: string;
  priority: ContactPriority;
  message: string;
  status: ContactStatus;
  userId?: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SubmitContactBody {
  email?: string;
  subject: string;
  message: string;
}

export interface SubmitContactRequest extends Omit<Request, "user"> {
  body: SubmitContactBody;
}

// ─── v2.0 Query Types ──────────────────────────────────────────────────────

export interface AdminContactsQuery {
  page?: number;
  limit?: number;
  status?: ContactStatus;
  priority?: ContactPriority;
  email?: string;
  search?: string;
  fromDate?: string;
  toDate?: string;
  sortBy?: AdminContactsSortBy;
  sortOrder?: SortOrder;
}

export interface AdminContactsQueryRequest extends Omit<Request, "query"> {
  query: AdminContactsQuery;
}

export interface ContactIdParamRequest extends Omit<Request, "params"> {
  params: { id: string };
}

// ─── MyContacts (authenticated user, owner-scoped) ─────────────────────────

export interface MyContactsQuery {
  page?: number;
  limit?: number;
  status?: ContactStatus;
  search?: string;
  sortBy?: AdminContactsSortBy;
  sortOrder?: SortOrder;
}

export interface MyContactsQueryRequest extends Omit<Request, "query"> {
  query: MyContactsQuery;
}

export interface UpdateContactStatusRequest
  extends Omit<Request, "params" | "body"> {
  params: { id: string };
  body: { status: ContactStatus };
}

export interface PaginatedResult<T> {
  items: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
