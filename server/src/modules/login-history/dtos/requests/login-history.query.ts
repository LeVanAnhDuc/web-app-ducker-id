// libs
import { IsBoolean, IsOptional } from "class-validator";
// types
import type {
  ClientType,
  DeviceType,
  LoginHistorySortByAdmin,
  LoginMethod,
  LoginSource,
  LoginStatus
} from "@/modules/login-history/types";
// modules
import {
  CLIENT_TYPES,
  DEVICE_TYPES,
  LOGIN_HISTORY_SORT_BY_USER,
  LOGIN_METHODS,
  LOGIN_SOURCES,
  LOGIN_STATUSES
} from "@/modules/login-history/constants";
// validators
import {
  IsOnOrAfter,
  ObjectIdFilter,
  OneOf,
  SearchFilter,
  ToBoolean
} from "@/validators/decorators";
import { PaginationQueryDto } from "@/validators/dtos/pagination.query";
// others
import { IsoDateFilter } from "./filters";

/** The filters on a user's own sign-ins; the admin list extends it. */
export class LoginHistoryQueryDto extends PaginationQueryDto {
  @OneOf(Object.values(LOGIN_STATUSES), "validation:status.invalid")
  status?: LoginStatus;

  @OneOf(Object.values(LOGIN_METHODS), "validation:method.invalid")
  method?: LoginMethod;

  @OneOf(Object.values(DEVICE_TYPES), "validation:deviceType.invalid")
  deviceType?: DeviceType;

  @OneOf(Object.values(CLIENT_TYPES), "validation:clientType.invalid")
  clientType?: ClientType;

  @SearchFilter()
  country?: string;

  @SearchFilter()
  city?: string;

  @SearchFilter()
  os?: string;

  @SearchFilter()
  browser?: string;

  @OneOf(Object.values(LOGIN_SOURCES), "validation:source.invalid")
  source?: LoginSource;

  @ObjectIdFilter("validation:webAppId.invalid")
  webAppId?: string;

  @IsBoolean({ message: "validation:interactive.invalid" })
  @IsOptional()
  @ToBoolean()
  interactive?: boolean;

  @IsoDateFilter("validation:fromDate.invalid")
  fromDate?: string;

  // The range check belongs to the object, so it is reported as field "".
  @IsOnOrAfter("fromDate", {
    message: "validation:dateRange.invalid",
    context: { root: true }
  })
  @IsoDateFilter("validation:toDate.invalid")
  toDate?: string;

  // Typed with the wider admin set because a subclass property may not widen
  // its parent's type; the allowed values are still the user ones at runtime.
  @OneOf(LOGIN_HISTORY_SORT_BY_USER, "validation:sortBy.invalid")
  sortBy?: LoginHistorySortByAdmin;
}
