// types
import type { LoginHistorySortByAdmin } from "@/modules/login-history/types";
// modules
import { LOGIN_HISTORY_SORT_BY_ADMIN } from "@/modules/login-history/constants";
// validators
import { ObjectIdFilter, SearchFilter } from "@/validators/decorators";
// others
import { OneOf } from "./filters";
import { LoginHistoryQueryDto } from "./login-history.query";

// Mirrors Joi `.keys()`: every user filter, plus who and from where. The
// redeclared `sortBy` rules replace the inherited ones, as class-validator
// prefers a subclass rule over a parent rule of the same kind on a property.
export class LoginHistoryAdminQueryDto extends LoginHistoryQueryDto {
  @ObjectIdFilter("validation:userId.invalid")
  userId?: string;

  @SearchFilter()
  ip?: string;

  @OneOf(LOGIN_HISTORY_SORT_BY_ADMIN, "validation:sortBy.invalid")
  declare sortBy?: LoginHistorySortByAdmin;
}
