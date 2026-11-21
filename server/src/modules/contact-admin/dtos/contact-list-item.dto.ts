// types
import type { ContactPriority, ContactStatus } from "../types";
// common
import { Expose, ExposeDate, ExposeId, ExposeOrNull } from "@/common/dto";

/** Source: a contact record. A list row — no message body. */
export class ContactListItemDto {
  @ExposeId() _id!: string;
  @ExposeOrNull() email!: string | null;
  @Expose() subject!: string;
  @Expose() priority!: ContactPriority;
  @Expose() status!: ContactStatus;
  @ExposeDate() createdAt!: string;
  @ExposeDate() updatedAt!: string;
}
