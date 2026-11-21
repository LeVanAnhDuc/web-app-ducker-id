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
// others
import { LoginAppFieldsDto } from "./login-app.dto";
import { maskIp } from "../helpers";

/** Source: a login-history record. The owner's view — masked IP, no user agent. */
export class MyHistoryItemDto extends LoginAppFieldsDto {
  @ExposeId() _id!: string;
  @Expose() method!: LoginMethod;
  @Expose() status!: LoginStatus;
  @ExposeOrNull() failReason!: LoginFailReason | null;
  @ExposeFrom<LoginHistoryDocument>((doc) => maskIp(doc.ip)) ip!: string;
  @Expose() country!: string;
  @Expose() city!: string;
  @Expose() deviceType!: DeviceType;
  @Expose() os!: string;
  @Expose() browser!: string;
  @Expose() clientType!: ClientType;
  // A row written before the flag existed is not anomalous.
  @ExposeFrom<LoginHistoryDocument>((doc) => doc.isAnomaly ?? false)
  isAnomaly!: boolean;
  @ExposeDate() createdAt!: string;
}
