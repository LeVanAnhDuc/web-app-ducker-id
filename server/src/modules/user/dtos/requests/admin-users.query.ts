// libs
import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength
} from "class-validator";
// types
import type {
  AdminUserRole,
  AdminUserStatusFilter,
  AdminUsersSortBy
} from "@/modules/user/types";
// modules
import {
  ADMIN_USER_STATUS_FILTERS,
  ADMIN_USERS_SORT_BY
} from "@/modules/user/constants";
import { AUTHENTICATION_ROLES } from "@/modules/authentication/constants";
// validators
import { SEARCH_MAX_LENGTH } from "@/validators/constants";
import { Trim } from "@/validators/decorators";
import { PaginationQueryDto } from "@/validators/dtos/pagination.query";

const ROLE_VALUES = Object.values(AUTHENTICATION_ROLES);
const STATUS_FILTER_VALUES = Object.values(ADMIN_USER_STATUS_FILTERS);

// Joi reported a blank or repeated filter as an unknown value; both rules
// carry the filter's one key, so only `reason` can differ.
export class AdminUsersQueryDto extends PaginationQueryDto {
  // Trimmed before the length check, so padding does not count toward the max.
  @MaxLength(SEARCH_MAX_LENGTH, { message: "validation:search.invalid" })
  @IsNotEmpty({ message: "validation:search.invalid" })
  @IsString({ message: "validation:search.invalid" })
  @IsOptional()
  @Trim()
  search?: string;

  @IsIn(ROLE_VALUES, { message: "validation:role.invalid" })
  @IsString({ message: "validation:role.invalid" })
  @IsOptional()
  role?: AdminUserRole;

  @IsIn(STATUS_FILTER_VALUES, { message: "validation:status.invalid" })
  @IsString({ message: "validation:status.invalid" })
  @IsOptional()
  status?: AdminUserStatusFilter;

  @IsIn(ADMIN_USERS_SORT_BY, { message: "validation:sortBy.invalid" })
  @IsString({ message: "validation:sortBy.invalid" })
  @IsOptional()
  sortBy?: AdminUsersSortBy;
}
