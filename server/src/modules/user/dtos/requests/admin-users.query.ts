// types
import type {
  AdminUserRole,
  AdminUserStatusFilter,
  AdminUsersSortBy
} from "@/modules/user/types";
// common
import { ApiProperty } from "@/common/openapi";
// modules
import {
  ADMIN_USER_STATUS_FILTERS,
  ADMIN_USERS_SORT_BY
} from "@/modules/user/constants";
import { AUTHENTICATION_ROLES } from "@/modules/authentication/constants";
// validators
import { OneOf, SearchFilter } from "@/validators/decorators";
import { PaginationQueryDto } from "@/validators/dtos/pagination.query";

const ROLE_VALUES = Object.values(AUTHENTICATION_ROLES);
const STATUS_FILTER_VALUES = Object.values(ADMIN_USER_STATUS_FILTERS);

// Joi reported a blank or repeated filter as an unknown value; both rules
// carry the filter's one key, so only `reason` can differ.
export class AdminUsersQueryDto extends PaginationQueryDto {
  @ApiProperty({
    example: "nguyen",
    description: "Case-insensitive keyword to match fullName or email"
  })
  @SearchFilter()
  search?: string;

  @ApiProperty({ example: "user", description: "Filter by user role" })
  @OneOf(ROLE_VALUES, "validation:role.invalid")
  role?: AdminUserRole;

  @ApiProperty({
    example: "active",
    description: "Filter by account status (locked means isActive is false)"
  })
  @OneOf(STATUS_FILTER_VALUES, "validation:status.invalid")
  status?: AdminUserStatusFilter;

  @ApiProperty({
    example: "createdAt",
    description: "Field to sort by (default createdAt)"
  })
  @OneOf(ADMIN_USERS_SORT_BY, "validation:sortBy.invalid")
  sortBy?: AdminUsersSortBy;
}
