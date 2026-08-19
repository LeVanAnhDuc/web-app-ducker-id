// types
import type { AppStatus, WebApp } from "@/types/AdminApps";
import type { AuthenticationRole } from "@/types/User";
import type { CustomTableColumn } from "@/types/CustomTable";
import type { ListFilterDef, ListFilterOption } from "@/types/List";
import type { AdminAppsMessages, LeafKeyOf } from "@/types/libs";
// components
import FormatTime from "@/components/FormatTime";
import AppStatusBadge from "@/views/AdminApps/components/AppStatusBadge";
import RoleChip from "@/views/AdminApps/components/RoleChip";
// others
import CONSTANTS from "@/constants";
import { COLUMN_BREAKPOINT } from "@/constants/list";

const { AUTHENTICATION_ROLES, APP_STATUS } = CONSTANTS;

export const APP_STATUSES: readonly AppStatus[] = [
  APP_STATUS.ACTIVE,
  APP_STATUS.INACTIVE
] as const;

export const APP_ROLE_OPTIONS: readonly AuthenticationRole[] = [
  AUTHENTICATION_ROLES.USER,
  AUTHENTICATION_ROLES.ADMIN
] as const;

export const buildAdminAppsFilterDefs = (
  statusOptions: ListFilterOption[],
  categoryOptions: ListFilterOption[],
  labels: { status: string; category: string }
): ListFilterDef[] => [
  {
    key: "status",
    type: "select",
    label: labels.status,
    options: statusOptions
  },
  {
    key: "categoryId",
    type: "select",
    label: labels.category,
    options: categoryOptions
  }
];

export const buildAdminAppsColumns = (
  tTable: (key: LeafKeyOf<AdminAppsMessages["table"]>) => string,
  categoryMap: Map<string, string>
): CustomTableColumn<WebApp>[] => [
  {
    id: "app",
    header: tTable("app"),
    sortable: true,
    width: "28%",
    cell: (app) => (
      <div className="flex flex-col">
        <span className="text-foreground font-medium">{app.displayName}</span>
        <span className="text-muted-foreground font-mono text-xs">
          {app.name}
        </span>
      </div>
    )
  },
  {
    id: "category",
    header: tTable("category"),
    hideBelow: COLUMN_BREAKPOINT.SM,
    cell: (app) => categoryMap.get(app.categoryId) ?? "—",
    cellClassName: "text-muted-foreground text-sm"
  },
  {
    id: "status",
    header: tTable("status"),
    cell: (app) => <AppStatusBadge status={app.status} />
  },
  {
    id: "roles",
    header: tTable("roles"),
    cell: (app) => (
      <div className="flex flex-wrap gap-1">
        {app.requiredRoles.map((role) => (
          <RoleChip key={role} role={role} />
        ))}
      </div>
    )
  },
  {
    id: "redirectUris",
    header: tTable("redirectUris"),
    hideBelow: COLUMN_BREAKPOINT.MD,
    cell: (app) => app.redirectUris.length,
    cellClassName: "text-muted-foreground text-sm"
  },
  {
    id: "updatedAt",
    header: tTable("updatedAt"),
    sortable: true,
    cell: (app) => <FormatTime value={app.updatedAt} variant="datetime" />,
    cellClassName: "text-muted-foreground text-xs"
  }
];

export const ADMIN_APPS_SORT_ACCESSORS: Record<
  string,
  (app: WebApp) => string | number
> = {
  app: (app) => app.displayName.toLowerCase(),
  updatedAt: (app) => app.updatedAt
};
