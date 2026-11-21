// types
import type {
  LoginMethod,
  LoginStatus,
  LoginFailReason,
  DeviceType,
  ClientType,
  LoginHistoryDocument
} from "@/modules/login-history/types";
// common
import {
  Expose,
  ExposeDate,
  ExposeFrom,
  ExposeId,
  ExposeOrNull
} from "@/common/dto";
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
import { maskIp } from "../helpers";

/** Source: a login-history record. The owner's view — masked IP, no user agent. */
export class MyHistoryItemDto extends LoginAppFieldsDto {
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

  @ApiProperty({ example: "203.0.113.x" })
  @ExposeFrom<LoginHistoryDocument>((doc) => maskIp(doc.ip))
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

  // A row written before the flag existed is not anomalous.
  @ApiProperty({ example: false })
  @ExposeFrom<LoginHistoryDocument>((doc) => doc.isAnomaly ?? false)
  isAnomaly!: boolean;

  @ApiProperty({ example: "2026-10-05T08:00:00.000Z" })
  @ExposeDate()
  createdAt!: string;
}
