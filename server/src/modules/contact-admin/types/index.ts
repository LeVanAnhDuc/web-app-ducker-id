// types
import type { Document, Types } from "mongoose";
import type {
  CONTACT_PRIORITIES,
  CONTACT_STATUSES,
  ADMIN_CONTACTS_SORT_BY
} from "../constants";

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
