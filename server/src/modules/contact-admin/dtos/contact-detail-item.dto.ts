// types
import type { ContactPriority, ContactStatus } from "../types";
// common
import { Expose, ExposeDate, ExposeId, ExposeOrNull } from "@/common/dto";
import { ApiProperty } from "@/common/openapi";
// modules
import {
  CONTACT_PRIORITIES,
  CONTACT_STATUSES
} from "@/modules/contact-admin/constants";

/** Source: a contact record. The owner's view of their own request. */
export class ContactDetailItemDto {
  @ApiProperty({ example: "507f1f77bcf86cd799439011" })
  @ExposeId()
  _id!: string;

  @ApiProperty({ example: "user@example.com" })
  @ExposeOrNull()
  email!: string | null;

  @ApiProperty({ example: "Cannot access my account" })
  @Expose()
  subject!: string;

  @ApiProperty({
    example: "I have been unable to log in to my account for the past 2 days."
  })
  @Expose()
  message!: string;

  @ApiProperty({
    type: "string",
    enum: Object.values(CONTACT_PRIORITIES),
    example: CONTACT_PRIORITIES.MEDIUM
  })
  @Expose()
  priority!: ContactPriority;

  @ApiProperty({
    type: "string",
    enum: Object.values(CONTACT_STATUSES),
    example: CONTACT_STATUSES.NEW
  })
  @Expose()
  status!: ContactStatus;

  @ApiProperty({ example: "2026-10-01T08:30:00.000Z" })
  @ExposeDate()
  createdAt!: string;

  @ApiProperty({ example: "2026-10-01T09:00:00.000Z" })
  @ExposeDate()
  updatedAt!: string;
}
