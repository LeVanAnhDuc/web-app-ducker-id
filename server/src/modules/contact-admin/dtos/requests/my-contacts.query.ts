// libs
import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateIf
} from "class-validator";
// types
import type {
  AdminContactsSortBy,
  ContactStatus
} from "@/modules/contact-admin/types";
// modules
import {
  ADMIN_CONTACTS_SORT_BY,
  CONTACT_STATUSES
} from "@/modules/contact-admin/constants";
// validators
import { SEARCH_MAX_LENGTH } from "@/validators/constants";
import { Trim } from "@/validators/decorators";
import { PaginationQueryDto } from "@/validators/dtos/pagination.query";

const STATUS_VALUES = Object.values(CONTACT_STATUSES);

/** The filters a sender has on their own contacts; the admin list extends it. */
export class MyContactsQueryDto extends PaginationQueryDto {
  // A blank, null or repeated `status` is a 400 (TC-ADMINCONTACT-023), so
  // only a missing one is skipped — `@IsOptional()` would let `null` through.
  @IsIn(STATUS_VALUES, { message: "validation:status.invalid" })
  @IsString({ message: "validation:status.invalid" })
  @ValidateIf((_object, value) => value !== undefined)
  status?: ContactStatus;

  // Trimmed before the length check, so padding does not count toward the max.
  @MaxLength(SEARCH_MAX_LENGTH, { message: "validation:search.invalid" })
  @IsNotEmpty({ message: "validation:search.invalid" })
  @IsString({ message: "validation:search.invalid" })
  @IsOptional()
  @Trim()
  search?: string;

  @IsIn(ADMIN_CONTACTS_SORT_BY, { message: "validation:sortBy.invalid" })
  @IsString({ message: "validation:sortBy.invalid" })
  @IsOptional()
  sortBy?: AdminContactsSortBy;
}
