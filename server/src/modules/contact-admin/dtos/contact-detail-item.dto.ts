// types
import type { ContactPriority, ContactStatus } from "../types";
// common
import { Expose, ExposeDate, ExposeId, ExposeOrNull } from "@/common/dto";

/** Source: a contact record. The owner's view of their own request. */
export class ContactDetailItemDto {
  @ExposeId() _id!: string;
  @ExposeOrNull() email!: string | null;
  @Expose() subject!: string;
  @Expose() message!: string;
  @Expose() priority!: ContactPriority;
  @Expose() status!: ContactStatus;
  @ExposeDate() createdAt!: string;
  @ExposeDate() updatedAt!: string;
}
