// types
import type { ContactPriority, ContactStatus, ContactDocument } from "../types";

export interface ContactListItemDto {
  _id: string;
  email: string | null;
  subject: string;
  priority: ContactPriority;
  status: ContactStatus;
  createdAt: string;
  updatedAt: string;
}

export const toContactListItemDto = (
  doc: ContactDocument
): ContactListItemDto => ({
  _id: doc._id.toString(),
  email: doc.email ?? null,
  subject: doc.subject,
  priority: doc.priority,
  status: doc.status,
  createdAt: doc.createdAt.toISOString(),
  updatedAt: doc.updatedAt.toISOString()
});
