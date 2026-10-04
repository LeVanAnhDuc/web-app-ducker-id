// libs
import type { ReactNode } from "react";
// types
import type { CustomTableColumn } from "@/types/CustomTable";
import type { ListFilterDef } from "@/types/List";
import type {
  LoginHistoryAdminItem,
  LoginHistoryItem,
  LoginHistoryMethod,
  LoginHistoryQueryParams,
  LoginHistoryStatus
} from "@/types/LoginHistory";
import type { LeafKeyOf, LoginHistoryMessages } from "@/types/libs";
// components
import FormatTime from "@/components/FormatTime";
import CustomBadge from "@/components/CustomBadge";
import LoginAppLabel from "@/components/LoginAppLabel";
// others
import { cn } from "@/libs/utils";
import { formatLoginLocation } from "@/utils";
import CONSTANTS from "@/constants";

const {
  METHOD,
  STATUS,
  DEVICE_TYPE,
  METHOD_VALUES,
  STATUS_VALUES,
  SOURCE,
  APP_FILTER_IDP,
  SIGN_IN_FILTER
} = CONSTANTS.LOGIN_HISTORY;

export const LOGIN_HISTORY_METHOD_COLOR: Record<LoginHistoryMethod, string> = {
  [METHOD.PASSWORD]: "text-foreground",
  [METHOD.OTP]: "text-warning-foreground",
  [METHOD.MAGIC_LINK]: "text-info",
  [METHOD.FORGOT_PASSWORD]: "text-muted-foreground",
  [METHOD.SSO]: "text-primary"
};

export const LOGIN_HISTORY_STATUS_VALUES: LoginHistoryStatus[] = STATUS_VALUES;

export const LOGIN_HISTORY_METHOD_VALUES: LoginHistoryMethod[] = METHOD_VALUES;

type TFilters = (key: LeafKeyOf<LoginHistoryMessages["filters"]>) => string;
type TApp = (key: LeafKeyOf<LoginHistoryMessages["app"]>) => string;

export interface LoginAppOption {
  id: string;
  name: string;
}

/**
 * The "app" filter (Ducker ID or one catalog app) and the "signIn" filter.
 * `scope` decides what an empty signIn filter means: the user page hides
 * silent SSO by default, the admin page shows everything.
 */
export const buildLoginAppFilterDefs = (
  apps: LoginAppOption[],
  scope: "user" | "admin",
  tFilters: TFilters,
  tApp: TApp
): ListFilterDef[] => [
  {
    key: "app",
    type: "select",
    label: tFilters("app"),
    options: [
      { value: APP_FILTER_IDP, label: tApp("idp") },
      ...apps.map((a) => ({ value: a.id, label: a.name }))
    ]
  },
  scope === "user"
    ? {
        key: "signIn",
        type: "select",
        label: tFilters("signIn"),
        allLabel: tFilters("signInInteractiveDefault"),
        options: [
          { value: SIGN_IN_FILTER.ALL, label: tFilters("signInAll") },
          { value: SIGN_IN_FILTER.SILENT, label: tFilters("signInSilent") }
        ]
      }
    : {
        key: "signIn",
        type: "select",
        label: tFilters("signIn"),
        options: [
          {
            value: SIGN_IN_FILTER.INTERACTIVE,
            label: tFilters("signInInteractive")
          },
          { value: SIGN_IN_FILTER.SILENT, label: tFilters("signInSilent") }
        ]
      }
];

export const toLoginAppQueryParams = (
  filters: Record<string, string | null | undefined>,
  scope: "user" | "admin"
): Pick<LoginHistoryQueryParams, "source" | "webAppId" | "interactive"> => {
  const app = filters.app ?? null;
  const signIn = filters.signIn ?? null;

  const appParams =
    app === APP_FILTER_IDP
      ? { source: SOURCE.IDP }
      : app
        ? { webAppId: app }
        : {};

  const interactive =
    signIn === SIGN_IN_FILTER.SILENT
      ? false
      : signIn === SIGN_IN_FILTER.INTERACTIVE
        ? true
        : signIn === SIGN_IN_FILTER.ALL
          ? undefined
          : scope === "user"
            ? true
            : undefined;

  return {
    ...appParams,
    ...(interactive !== undefined && { interactive })
  };
};

export const buildLoginHistoryFilterDefs = (
  tStatus: (key: LeafKeyOf<LoginHistoryMessages["status"]>) => string,
  tMethod: (key: LeafKeyOf<LoginHistoryMessages["method"]>) => string,
  tFilters: TFilters
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
  tLocation: (key: LeafKeyOf<LoginHistoryMessages["location"]>) => string,
  tApp: TApp
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
    id: "app",
    header: tTable("app"),
    cell: (item) => (
      <LoginAppLabel
        app={item.app}
        interactive={item.interactive}
        idpLabel={tApp("idp")}
        silentLabel={tApp("silent")}
      />
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
  tLocation: (key: LeafKeyOf<LoginHistoryMessages["location"]>) => string,
  tApp: TApp
): CustomTableColumn<LoginHistoryAdminItem>[] => [
  {
    id: "usernameAttempted",
    header: tTable("usernameAttempted"),
    cell: (item) => item.usernameAttempted
  },
  {
    id: "app",
    header: tTable("app"),
    cell: (item) => (
      <LoginAppLabel
        app={item.app}
        interactive={item.interactive}
        idpLabel={tApp("idp")}
        silentLabel={tApp("silent")}
        className="text-xs"
      />
    )
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
