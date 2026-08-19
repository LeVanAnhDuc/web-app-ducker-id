// types
import type { ContactPriority, ContactStatus, ContactDocument } from "../types";

export interface SubmitContactResponseDto {
  id: string;
  email: string | null;
  subject: string;
  message: string;
  priority: ContactPriority;
  status: ContactStatus;
  createdAt: string;
}

export const toSubmitContactResponseDto = (
  doc: ContactDocument
): SubmitContactResponseDto => ({
  id: doc._id.toString(),
  email: doc.email ?? null,
  subject: doc.subject,
  message: doc.message,
  priority: doc.priority,
  status: doc.status,
  createdAt: doc.createdAt.toISOString()
});
