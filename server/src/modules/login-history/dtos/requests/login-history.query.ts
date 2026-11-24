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
// common
import { ApiProperty } from "@/common/openapi";
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
  @ApiProperty({
    example: "success",
    description: "Only sign-ins with this outcome"
  })
  @OneOf(Object.values(LOGIN_STATUSES), "validation:status.invalid")
  status?: LoginStatus;

  @ApiProperty({
    example: "password",
    description: "Only sign-ins by this login method"
  })
  @OneOf(Object.values(LOGIN_METHODS), "validation:method.invalid")
  method?: LoginMethod;

  @ApiProperty({
    example: "DESKTOP",
    description: "Only sign-ins from this device type"
  })
  @OneOf(Object.values(DEVICE_TYPES), "validation:deviceType.invalid")
  deviceType?: DeviceType;

  @ApiProperty({
    example: "WEB",
    description: "Only sign-ins from this client type"
  })
  @OneOf(Object.values(CLIENT_TYPES), "validation:clientType.invalid")
  clientType?: ClientType;

  @ApiProperty({ example: "VN", description: "Matches the country" })
  @SearchFilter()
  country?: string;

  @ApiProperty({ example: "Ho Chi Minh City", description: "Matches the city" })
  @SearchFilter()
  city?: string;

  @ApiProperty({
    example: "Windows",
    description: "Matches the operating system"
  })
  @SearchFilter()
  os?: string;

  @ApiProperty({ example: "Chrome", description: "Matches the browser" })
  @SearchFilter()
  browser?: string;

  @ApiProperty({
    example: "idp",
    description: "Only sign-ins to the IdP itself or to a satellite app"
  })
  @OneOf(Object.values(LOGIN_SOURCES), "validation:source.invalid")
  source?: LoginSource;

  @ApiProperty({
    example: "507f1f77bcf86cd799439011",
    description: "Only sign-ins to this satellite app"
  })
  @ObjectIdFilter("validation:webAppId.invalid")
  webAppId?: string;

  @ApiProperty({
    example: true,
    description: "Only interactive (true) or silent (false) sign-ins"
  })
  @IsBoolean({ message: "validation:interactive.invalid" })
  @IsOptional()
  @ToBoolean()
  interactive?: boolean;

  @ApiProperty({
    example: "2026-10-01",
    description: "Sign-ins on or after this ISO date"
  })
  @IsoDateFilter("validation:fromDate.invalid")
  fromDate?: string;

  // The range check belongs to the object, so it is reported as field "".
  @IsOnOrAfter("fromDate", {
    message: "validation:dateRange.invalid",
    context: { root: true }
  })
  @ApiProperty({
    example: "2026-10-31",
    description:
      "Sign-ins on or before this ISO date; a bare date covers the whole day"
  })
  @IsoDateFilter("validation:toDate.invalid")
  toDate?: string;

  // Typed with the wider admin set because a subclass property may not widen
  // its parent's type; the allowed values are still the user ones at runtime.
  @ApiProperty({
    example: "createdAt",
    description: "Field to sort by (default createdAt)"
  })
  @OneOf(LOGIN_HISTORY_SORT_BY_USER, "validation:sortBy.invalid")
  sortBy?: LoginHistorySortByAdmin;
}
