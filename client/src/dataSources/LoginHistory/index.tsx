// libs
import type { ReactNode } from "react";
// types
import type { CustomTableColumn } from "@/types/CustomTable";
import type { ListFilterDef } from "@/types/List";
import type {
  LoginHistoryAdminItem,
  LoginHistoryItem,
  LoginHistoryMethod,
  LoginHistoryStatus
} from "@/types/LoginHistory";
import type { LeafKeyOf, LoginHistoryMessages } from "@/types/libs";
// components
import FormatTime from "@/components/FormatTime";
import CustomBadge from "@/components/CustomBadge";
// others
import { cn } from "@/libs/utils";
import { formatLoginLocation } from "@/utils";
import CONSTANTS from "@/constants";

const { METHOD, STATUS, DEVICE_TYPE, METHOD_VALUES, STATUS_VALUES } =
  CONSTANTS.LOGIN_HISTORY;

export const LOGIN_HISTORY_METHOD_COLOR: Record<LoginHistoryMethod, string> = {
  [METHOD.PASSWORD]: "text-foreground",
  [METHOD.OTP]: "text-warning-foreground",
  [METHOD.MAGIC_LINK]: "text-info",
  [METHOD.FORGOT_PASSWORD]: "text-muted-foreground"
};

export const LOGIN_HISTORY_STATUS_VALUES: LoginHistoryStatus[] = STATUS_VALUES;

export const LOGIN_HISTORY_METHOD_VALUES: LoginHistoryMethod[] = METHOD_VALUES;

export const buildLoginHistoryFilterDefs = (
  tStatus: (key: LeafKeyOf<LoginHistoryMessages["status"]>) => string,
  tMethod: (key: LeafKeyOf<LoginHistoryMessages["method"]>) => string,
  tFilters: (key: LeafKeyOf<LoginHistoryMessages["filters"]>) => string
): ListFilterDef[] => [
  {
    key: "status",
    type: "select",
    label: tFilters("status"),
    options: LOGIN_HISTORY_STATUS_VALUES.map((v) => ({
      value: v,
      label: tStatus(v)
    }))
  },
  {
    key: "method",
    type: "select",
    label: tFilters("method"),
    options: LOGIN_HISTORY_METHOD_VALUES.map((v) => ({
      value: v,
      label: tMethod(v)
    }))
  },
  {
    key: "dateRange",
    type: "dateRange",
    label: tFilters("fromDate")
  }
];

export const buildLoginHistoryColumns = (
  tTable: (key: LeafKeyOf<LoginHistoryMessages["table"]>) => string,
  tStatus: (key: LeafKeyOf<LoginHistoryMessages["status"]>) => string,
  tMethod: (key: LeafKeyOf<LoginHistoryMessages["method"]>) => string,
  tLocation: (key: LeafKeyOf<LoginHistoryMessages["location"]>) => string
): CustomTableColumn<LoginHistoryItem>[] => [
  {
    id: "createdAt",
    header: tTable("createdAt"),
    cell: (item) => (
      <span className="font-medium">
        <FormatTime value={item.createdAt} variant="datetime" />
      </span>
    )
  },
  {
    id: "method",
    header: tTable("method"),
    cell: (item) => (
      <span
        className={cn("font-medium", LOGIN_HISTORY_METHOD_COLOR[item.method])}
      >
        {tMethod(item.method as LoginHistoryMethod)}
      </span>
    )
  },
  {
    id: "status",
    header: tTable("status"),
    cell: (item) => (
      <span className="inline-flex items-center gap-1.5">
        <span
          className={cn(
            "size-1.5 rounded-full",
            item.status === STATUS.SUCCESS ? "bg-success" : "bg-destructive"
          )}
          aria-hidden="true"
        />
        <span
          className={cn(
            "font-medium",
            item.status === STATUS.SUCCESS ? "text-success" : "text-destructive"
          )}
        >
          {tStatus(item.status)}
        </span>
      </span>
    )
  },
  {
    id: "deviceType",
    header: tTable("deviceType"),
    cell: (item) =>
      item.deviceType !== DEVICE_TYPE.UNKNOWN
        ? `${item.deviceType} · ${item.browser}`
        : item.browser
  },
  {
    id: "ip",
    header: tTable("ip"),
    cell: (item) => item.ip,
    cellClassName: "text-muted-foreground font-mono"
  },
  {
    id: "country",
    header: tTable("country"),
    cell: (item) => formatLoginLocation(item.city, item.country, tLocation)
  }
];

export const buildAdminLoginHistoryColumns = (
  tTable: (key: LeafKeyOf<LoginHistoryMessages["table"]>) => string,
  tMethod: (key: LeafKeyOf<LoginHistoryMessages["method"]>) => string,
  tStatus: (key: LeafKeyOf<LoginHistoryMessages["status"]>) => string,
  tLocation: (key: LeafKeyOf<LoginHistoryMessages["location"]>) => string
): CustomTableColumn<LoginHistoryAdminItem>[] => [
  {
    id: "usernameAttempted",
    header: tTable("usernameAttempted"),
    cell: (item) => item.usernameAttempted
  },
  {
    id: "method",
    header: tTable("method"),
    cell: (item) => tMethod(item.method as LoginHistoryMethod)
  },
  {
    id: "status",
    header: tTable("status"),
    cell: (item) => (
      <CustomBadge
        variant={item.status === STATUS.SUCCESS ? "success" : "warning"}
        className="text-xs"
      >
        {tStatus(item.status)}
      </CustomBadge>
    )
  },
  {
    id: "ipLocation",
    header: tTable("ipLocation"),
    cell: (item) => (
      <>
        <span className="text-muted-foreground block font-mono text-xs">
          {item.ip}
        </span>
        <span className="text-muted-foreground block text-xs">
          {formatLoginLocation(item.city, item.country, tLocation)}
        </span>
      </>
    )
  },
  {
    id: "isAnomaly",
    header: tTable("isAnomaly"),
    cell: (item): ReactNode =>
      item.isAnomaly ? (
        <CustomBadge variant="warning" className="text-xs">
          {tTable("anomalyYes")}
        </CustomBadge>
      ) : (
        <span className="text-muted-foreground text-xs">
          {tTable("anomalyNo")}
        </span>
      )
  },
  {
    id: "createdAt",
    header: tTable("createdAt"),
    cell: (item) => <FormatTime value={item.createdAt} variant="datetime" />,
    cellClassName: "text-muted-foreground text-xs"
  }
];
