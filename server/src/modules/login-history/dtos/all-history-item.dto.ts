// types
import type {
  LoginMethod,
  LoginStatus,
  LoginFailReason,
  DeviceType,
  ClientType
} from "@/modules/login-history/types";
// common
import { Expose, ExposeDate, ExposeId, ExposeOrNull } from "@/common/dto";
import { ApiProperty } from "@/common/openapi";
// modules
import {
  CLIENT_TYPES,
  DEVICE_TYPES,
  LOGIN_FAIL_REASONS,
  LOGIN_METHODS,
  LOGIN_STATUSES
} from "@/modules/login-history/constants";
// others
import { LoginAppFieldsDto } from "./login-app.dto";

/** Source: a login-history record. The admin view — full IP, user agent, attempted username. */
export class AllHistoryItemDto extends LoginAppFieldsDto {
  @ApiProperty({ example: "507f1f77bcf86cd799439011" })
  @ExposeId()
  _id!: string;

  @ApiProperty({
    type: "string",
    enum: Object.values(LOGIN_METHODS),
    example: LOGIN_METHODS.PASSWORD
  })
  @Expose()
  method!: LoginMethod;

  @ApiProperty({
    type: "string",
    enum: Object.values(LOGIN_STATUSES),
    example: LOGIN_STATUSES.SUCCESS
  })
  @Expose()
  status!: LoginStatus;

  @ApiProperty({
    type: "string",
    enum: Object.values(LOGIN_FAIL_REASONS),
    nullable: true,
    example: null
  })
  @ExposeOrNull()
  failReason!: LoginFailReason | null;

  @ApiProperty({ example: "203.0.113.7" })
  @Expose()
  ip!: string;

  @ApiProperty({ example: "VN" })
  @Expose()
  country!: string;

  @ApiProperty({ example: "Ho Chi Minh City" })
  @Expose()
  city!: string;

  @ApiProperty({
    type: "string",
    enum: Object.values(DEVICE_TYPES),
    example: DEVICE_TYPES.DESKTOP
  })
  @Expose()
  deviceType!: DeviceType;

  @ApiProperty({ example: "Windows" })
  @Expose()
  os!: string;

  @ApiProperty({ example: "Chrome" })
  @Expose()
  browser!: string;

  @ApiProperty({
    type: "string",
    enum: Object.values(CLIENT_TYPES),
    example: CLIENT_TYPES.WEB
  })
  @Expose()
  clientType!: ClientType;

  @ApiProperty({ example: "2026-10-05T08:00:00.000Z" })
  @ExposeDate()
  createdAt!: string;

  @ApiProperty({ nullable: true, example: "507f1f77bcf86cd799439011" })
  @ExposeId()
  userId!: string | null;

  @ApiProperty({ example: "user@example.com" })
  @Expose()
  usernameAttempted!: string;

  @ApiProperty({ example: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" })
  @Expose()
  userAgent!: string;

  @ApiProperty({ type: "string", nullable: true, example: "+07:00" })
  @Expose()
  timezoneOffset!: string | null;

  @ApiProperty({ example: false })
  @Expose()
  isAnomaly!: boolean;

  @ApiProperty({ type: "array", items: { type: "string" } })
  @Expose()
  anomalyReasons!: string[];
}
