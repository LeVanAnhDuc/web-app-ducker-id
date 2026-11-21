// libs
import { IsIn, IsString } from "class-validator";
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
import { OneOf, SearchFilter, UnlessMissing } from "@/validators/decorators";
import { PaginationQueryDto } from "@/validators/dtos/pagination.query";

const STATUS_VALUES = Object.values(CONTACT_STATUSES);

/** The filters a sender has on their own contacts; the admin list extends it. */
export class MyContactsQueryDto extends PaginationQueryDto {
  // A blank, null or repeated `status` is a 400 (TC-ADMINCONTACT-023), so
  // only a missing one is skipped — `@IsOptional()` would let `null` through.
  @IsIn(STATUS_VALUES, { message: "validation:status.invalid" })
  @IsString({ message: "validation:status.invalid" })
  @UnlessMissing()
  status?: ContactStatus;

  @SearchFilter()
  search?: string;

  @OneOf(ADMIN_CONTACTS_SORT_BY, "validation:sortBy.invalid")
  sortBy?: AdminContactsSortBy;
}
