// types
import type {
  LoginMethod,
  LoginStatus,
  LoginFailReason,
  DeviceType,
  ClientType,
  LoginHistoryDocument
} from "@/modules/login-history/types";

export interface AllHistoryItemDto {
  _id: string;
  method: LoginMethod;
  status: LoginStatus;
  failReason: LoginFailReason | null;
  ip: string;
  country: string;
  city: string;
  deviceType: DeviceType;
  os: string;
  browser: string;
  clientType: ClientType;
  createdAt: string;
  userId: string | null;
  usernameAttempted: string;
  userAgent: string;
  timezoneOffset: string | null;
  isAnomaly: boolean;
  anomalyReasons: string[];
}

export const toAllHistoryItemDto = (
  doc: LoginHistoryDocument
): AllHistoryItemDto => ({
  _id: doc._id.toString(),
  method: doc.method,
  status: doc.status,
  failReason: doc.failReason ?? null,
  ip: doc.ip,
  country: doc.country,
  city: doc.city,
  deviceType: doc.deviceType,
  os: doc.os,
  browser: doc.browser,
  clientType: doc.clientType,
  createdAt: doc.createdAt.toISOString(),
  userId: doc.userId ? doc.userId.toString() : null,
  usernameAttempted: doc.usernameAttempted,
  userAgent: doc.userAgent,
  timezoneOffset: doc.timezoneOffset,
  isAnomaly: doc.isAnomaly,
  anomalyReasons: doc.anomalyReasons
});
