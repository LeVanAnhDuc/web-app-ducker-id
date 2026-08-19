// types
import type { Schema, Document } from "mongoose";
import type { Request } from "express";
import type {
  LOGIN_METHODS,
  LOGIN_STATUSES,
  LOGIN_FAIL_REASONS,
  DEVICE_TYPES,
  CLIENT_TYPES,
  LOGIN_HISTORY_SORT_BY_USER,
  LOGIN_HISTORY_SORT_BY_ADMIN
} from "@/modules/login-history/constants";
// common
import type { SortOrder } from "@/common/sort";

export type LoginMethod = (typeof LOGIN_METHODS)[keyof typeof LOGIN_METHODS];

export type LoginHistorySortByUser =
  (typeof LOGIN_HISTORY_SORT_BY_USER)[number];

export type LoginHistorySortByAdmin =
  (typeof LOGIN_HISTORY_SORT_BY_ADMIN)[number];

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface LoginHistoryQuery extends Partial<PaginationParams> {
  status?: LoginStatus;
  method?: LoginMethod;
  deviceType?: DeviceType;
  clientType?: ClientType;
  country?: string;
  city?: string;
  os?: string;
  browser?: string;
  fromDate?: string;
  toDate?: string;
  sortBy?: LoginHistorySortByUser;
  sortOrder?: SortOrder;
}

export interface LoginHistoryAdminQuery
  extends Omit<LoginHistoryQuery, "sortBy"> {
  userId?: string;
  ip?: string;
  sortBy?: LoginHistorySortByAdmin;
}

export interface PaginatedResult<T> {
  items: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface MyHistoryRequest extends Omit<Request, "query"> {
  query: LoginHistoryQuery;
}

export interface AllHistoryRequest extends Omit<Request, "query"> {
  query: LoginHistoryAdminQuery;
}

export interface HistoryIdParamRequest extends Omit<Request, "params"> {
  params: { id: string };
}

export type LoginStatus = (typeof LOGIN_STATUSES)[keyof typeof LOGIN_STATUSES];

export type LoginFailReason =
  (typeof LOGIN_FAIL_REASONS)[keyof typeof LOGIN_FAIL_REASONS];

export type DeviceType = (typeof DEVICE_TYPES)[keyof typeof DEVICE_TYPES];

export type ClientType = (typeof CLIENT_TYPES)[keyof typeof CLIENT_TYPES];

export interface LoginHistoryDocument extends Document {
  _id: Schema.Types.ObjectId;
  userId: Schema.Types.ObjectId | null;
  usernameAttempted: string;
  method: LoginMethod;
  status: LoginStatus;
  failReason?: LoginFailReason;
  ip: string;
  country: string;
  city: string;
  deviceType: DeviceType;
  os: string;
  browser: string;
  userAgent: string;
  clientType: ClientType;
  timezoneOffset: string | null;
  isAnomaly: boolean;
  anomalyReasons: string[];
  createdAt: Date;
}

export interface CreateLoginHistoryData {
  userId: Schema.Types.ObjectId | string | null;
  usernameAttempted: string;
  method: LoginMethod;
  status: LoginStatus;
  failReason?: LoginFailReason;
  ip: string;
  country: string;
  city: string;
  deviceType: DeviceType;
  os: string;
  browser: string;
  userAgent: string;
  clientType: ClientType;
  timezoneOffset: string | null;
  isAnomaly: boolean;
  anomalyReasons: string[];
}

export interface LoginEventPayload {
  userId: string | null;
  usernameAttempted: string;
  status: LoginStatus;
  failReason?: LoginFailReason;
  loginMethod: LoginMethod;
  req: Request;
  timezoneOffset?: string;
}

export interface LoginStatsAggregationBucket<TKey extends string> {
  _id: TKey;
  count: number;
}

export interface LoginStatsAggregationResult {
  total: { count: number }[];
  byStatus: LoginStatsAggregationBucket<LoginStatus>[];
  byMethod: LoginStatsAggregationBucket<LoginMethod>[];
  byDevice: LoginStatsAggregationBucket<DeviceType>[];
}

export interface LoginHistoryFilter {
  userId?: string;
  status?: string;
  method?: string;
  deviceType?: string;
  clientType?: string;
  country?: string;
  city?: string;
  os?: string;
  browser?: string;
  ip?: string;
  fromDate?: Date;
  toDate?: Date;
}

export interface LoginStatsRange {
  userId: string;
  from: Date;
  to: Date;
}
