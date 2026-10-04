// types
import type { SortOrder } from "@/types/List";
// constants
import type LOGIN_HISTORY from "@/constants/loginHistory";

export type LoginHistoryStatus =
  (typeof LOGIN_HISTORY.STATUS)[keyof typeof LOGIN_HISTORY.STATUS];
export type LoginHistoryMethod =
  (typeof LOGIN_HISTORY.METHOD)[keyof typeof LOGIN_HISTORY.METHOD];
export type LoginHistoryDeviceType =
  (typeof LOGIN_HISTORY.DEVICE_TYPE)[keyof typeof LOGIN_HISTORY.DEVICE_TYPE];
type DeviceType = LoginHistoryDeviceType;
export type LoginHistorySource =
  (typeof LOGIN_HISTORY.SOURCE)[keyof typeof LOGIN_HISTORY.SOURCE];

export interface LoginHistoryApp {
  id: string | null;
  name: string;
  iconUrl: string | null;
}
type ClientType =
  (typeof LOGIN_HISTORY.CLIENT_TYPE)[keyof typeof LOGIN_HISTORY.CLIENT_TYPE];

export interface LoginHistoryItem {
  _id: string;
  method: LoginHistoryMethod;
  status: LoginHistoryStatus;
  failReason: string | null;
  ip: string;
  country: string;
  city: string;
  deviceType: DeviceType;
  os: string;
  browser: string;
  clientType: ClientType;
  createdAt: string;
  source: LoginHistorySource;
  // null when the row is a sign-in to Ducker ID itself
  app: LoginHistoryApp | null;
  // false = silent SSO from an existing session
  interactive: boolean;
}

export interface LoginHistoryAdminItem extends LoginHistoryItem {
  userId: string | null;
  usernameAttempted: string;
  userAgent: string;
  timezoneOffset: string | null;
  isAnomaly: boolean;
  anomalyReasons: string[];
}

export type LoginHistoryAdminDetailItem = LoginHistoryAdminItem;

export type PaginatedLoginHistoryResponse = Paginated<LoginHistoryItem>;

export type PaginatedAdminLoginHistoryResponse =
  Paginated<LoginHistoryAdminItem>;

export interface LoginHistoryQueryParams {
  page?: number;
  limit?: number;
  status?: LoginHistoryStatus;
  method?: LoginHistoryMethod;
  deviceType?: DeviceType;
  clientType?: ClientType;
  country?: string;
  city?: string;
  os?: string;
  browser?: string;
  fromDate?: string;
  toDate?: string;
  source?: LoginHistorySource;
  webAppId?: string;
  interactive?: boolean;
  sortBy?: "createdAt" | "method" | "status" | "country";
  sortOrder?: SortOrder;
}

export interface AdminLoginHistoryQueryParams
  extends Omit<LoginHistoryQueryParams, "sortBy"> {
  userId?: string;
  ip?: string;
  sortBy?:
    | "createdAt"
    | "method"
    | "status"
    | "country"
    | "ip"
    | "usernameAttempted";
}

export type AdminLoginHistoryFilterFormValues = {
  status: string;
  method: string;
  country: string;
  city: string;
  fromDate: string;
  toDate: string;
  userId: string;
  ip: string;
};

export type LoginStatsRange =
  (typeof LOGIN_HISTORY.STATS_RANGE)[keyof typeof LOGIN_HISTORY.STATS_RANGE];

export interface LoginStatsDay {
  /** Local calendar day, `YYYY-MM-DD`, already cut in the requested zone. */
  date: string;
  total: number;
  successful: number;
  failed: number;
}

export interface LoginStatsApp {
  webAppId: string;
  clientName: string | null;
  count: number;
}

export interface LoginHistoryStats {
  total: number;
  successful: number;
  failed: number;
  byMethod: Record<LoginHistoryMethod, number>;
  byDevice: Record<LoginHistoryDeviceType, number>;
  byDay: LoginStatsDay[];
  byApp: LoginStatsApp[];
  anomalies: number;
  range: {
    from: string;
    to: string;
    days: number;
    timezone: string;
  };
}

export interface LoginStatsQueryParams {
  range?: LoginStatsRange;
  tz?: string;
}
