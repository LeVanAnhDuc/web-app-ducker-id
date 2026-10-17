// types
import type { ContactDocument } from "../types";
import type { ContactDetailItemDto } from "./contact-detail-item.dto";
// dtos
import { toContactDetailItemDto } from "./contact-detail-item.dto";

// The admin view of a request adds who filed it. The owner's own view
// (GET /contacts/:id) keeps ContactDetailItemDto, without these two fields.
export interface AdminContactDetailItemDto extends ContactDetailItemDto {
  userId: string | null;
  ipAddress: string | null;
}

export const toAdminContactDetailItemDto = (
  doc: ContactDocument
): AdminContactDetailItemDto => ({
  ...toContactDetailItemDto(doc),
  userId: doc.userId ? doc.userId.toString() : null,
  ipAddress: doc.ipAddress ?? null
});
