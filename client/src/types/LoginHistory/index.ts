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

export interface LoginHistoryStats {
  total: number;
  successful: number;
  failed: number;
  byMethod: Record<LoginHistoryMethod, number>;
  byDevice: Record<LoginHistoryDeviceType, number>;
  range: {
    from: string;
    to: string;
  };
}
