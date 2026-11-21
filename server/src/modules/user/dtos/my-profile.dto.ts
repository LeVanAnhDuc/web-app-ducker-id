// common
import { Expose, ExposeDate, ExposeId, ExposeOrNull } from "@/common/dto";

/** Source: the signed-in user's record. Every profile field, `null` when unset. */
export class MyProfileDto {
  @ExposeId() _id!: string;
  @Expose() fullName!: string;
  @ExposeOrNull() phone!: string | null;
  @ExposeOrNull() avatar!: string | null;
  @ExposeOrNull() address!: string | null;
  @ExposeDate() dateOfBirth!: string | null;
  @ExposeOrNull() gender!: string | null;
  @Expose() email!: string;
  @ExposeDate() createdAt!: string;
}
