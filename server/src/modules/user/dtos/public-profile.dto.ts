// common
import { Expose, ExposeId, ExposeOrNull } from "@/common/dto";

/** Source: a user record (`PublicUserRecord`). What another user may see. */
export class PublicProfileDto {
  @ExposeId() _id!: string;
  @Expose() fullName!: string;
  @ExposeOrNull() avatar!: string | null;
  @ExposeOrNull() gender!: string | null;
}
