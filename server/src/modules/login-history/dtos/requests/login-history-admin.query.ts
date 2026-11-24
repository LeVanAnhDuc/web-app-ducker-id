// types
import type { LoginHistorySortByAdmin } from "@/modules/login-history/types";
// common
import { ApiProperty } from "@/common/openapi";
// modules
import { LOGIN_HISTORY_SORT_BY_ADMIN } from "@/modules/login-history/constants";
// validators
import { ObjectIdFilter, OneOf, SearchFilter } from "@/validators/decorators";
// others
import { LoginHistoryQueryDto } from "./login-history.query";

// Mirrors Joi `.keys()`: every user filter, plus who and from where. The
// redeclared `sortBy` rules replace the inherited ones, as class-validator
// prefers a subclass rule over a parent rule of the same kind on a property.
export class LoginHistoryAdminQueryDto extends LoginHistoryQueryDto {
  @ApiProperty({
    example: "507f1f77bcf86cd799439011",
    description: "Only this account's sign-ins"
  })
  @ObjectIdFilter("validation:userId.invalid")
  userId?: string;

  @ApiProperty({
    example: "203.0.113.7",
    description: "Matches the IP address"
  })
  @SearchFilter()
  ip?: string;

  @ApiProperty({
    example: "createdAt",
    description: "Field to sort by (default createdAt)"
  })
  @OneOf(LOGIN_HISTORY_SORT_BY_ADMIN, "validation:sortBy.invalid")
  declare sortBy?: LoginHistorySortByAdmin;
}
