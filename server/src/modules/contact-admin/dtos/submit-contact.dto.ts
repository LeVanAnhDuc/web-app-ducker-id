// types
import type { ContactPriority, ContactStatus } from "../types";
// common
import { Expose, ExposeDate, ExposeId, ExposeOrNull } from "@/common/dto";

/** Source: the contact just created. Answers with `id`, not `_id`. */
export class SubmitContactResponseDto {
  @ExposeId("_id") id!: string;
  @ExposeOrNull() email!: string | null;
  @Expose() subject!: string;
  @Expose() message!: string;
  @Expose() priority!: ContactPriority;
  @Expose() status!: ContactStatus;
  @ExposeDate() createdAt!: string;
}
