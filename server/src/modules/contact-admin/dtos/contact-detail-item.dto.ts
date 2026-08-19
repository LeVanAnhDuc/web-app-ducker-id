// types
import type { ContactPriority, ContactStatus, ContactDocument } from "../types";

export interface ContactDetailItemDto {
  _id: string;
  email: string | null;
  subject: string;
  message: string;
  priority: ContactPriority;
  status: ContactStatus;
  createdAt: string;
  updatedAt: string;
}

export const toContactDetailItemDto = (
  doc: ContactDocument
): ContactDetailItemDto => ({
  _id: doc._id.toString(),
  email: doc.email ?? null,
  subject: doc.subject,
  message: doc.message,
  priority: doc.priority,
  status: doc.status,
  createdAt: doc.createdAt.toISOString(),
  updatedAt: doc.updatedAt.toISOString()
});
