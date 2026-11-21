// types
import type { AdminUserRole } from "@/modules/user/types";
// common
import { Expose, ExposeDate, ExposeId, ExposeOrNull } from "@/common/dto";

/** Source: a row of the admin users aggregation (`AdminUserAggregateRow`). */
export class AdminUserDto {
  @ExposeId() _id!: string;
  @Expose() fullName!: string;
  @Expose() email!: string;
  @ExposeOrNull() avatar!: string | null;
  @Expose() role!: AdminUserRole;
  @Expose() isActive!: boolean;
  @ExposeDate() lastLoginAt!: string | null;
  @ExposeDate() createdAt!: string;
}
