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
// others
import { LoginAppFieldsDto } from "./login-app.dto";

/** Source: a login-history record. The admin view — full IP, user agent, attempted username. */
export class AllHistoryItemDto extends LoginAppFieldsDto {
  @ExposeId() _id!: string;
  @Expose() method!: LoginMethod;
  @Expose() status!: LoginStatus;
  @ExposeOrNull() failReason!: LoginFailReason | null;
  @Expose() ip!: string;
  @Expose() country!: string;
  @Expose() city!: string;
  @Expose() deviceType!: DeviceType;
  @Expose() os!: string;
  @Expose() browser!: string;
  @Expose() clientType!: ClientType;
  @ExposeDate() createdAt!: string;
  @ExposeId() userId!: string | null;
  @Expose() usernameAttempted!: string;
  @Expose() userAgent!: string;
  @Expose() timezoneOffset!: string | null;
  @Expose() isAnomaly!: boolean;
  @Expose() anomalyReasons!: string[];
}
