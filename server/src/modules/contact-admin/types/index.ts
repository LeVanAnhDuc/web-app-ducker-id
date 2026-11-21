// types
import type { Request } from "express";
import type { Document, Types } from "mongoose";
import type {
  CONTACT_PRIORITIES,
  CONTACT_STATUSES,
  ADMIN_CONTACTS_SORT_BY
} from "../constants";
import type {
  AdminContactsQueryDto,
  ContactIdParamsDto,
  MyContactsQueryDto,
  SubmitContactBodyDto,
  UpdateContactStatusBodyDto
} from "../dtos/requests";

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
  ipAddress?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SubmitContactRequest extends Omit<Request, "user"> {
  body: SubmitContactBodyDto;
}

export interface AdminContactsQueryRequest extends Omit<Request, "query"> {
  query: AdminContactsQueryDto;
}

// The index signature keeps the handler assignable to Express's own, whose
// params are a string dictionary.
export interface ContactIdParamRequest extends Omit<Request, "params"> {
  params: ContactIdParamsDto & Record<string, string>;
}

export interface MyContactsQueryRequest extends Omit<Request, "query"> {
  query: MyContactsQueryDto;
}

export interface UpdateContactStatusRequest extends Omit<
  Request,
  "params" | "body"
> {
  params: ContactIdParamsDto & Record<string, string>;
  body: UpdateContactStatusBodyDto;
}
