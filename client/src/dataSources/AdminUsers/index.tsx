// types
import type { AdminUser } from "@/types/AdminUsers";
import type { CustomTableColumn } from "@/types/CustomTable";
import type { ListFilterDef } from "@/types/List";
import type { AdminUsersMessages, LeafKeyOf } from "@/types/libs";
// components
import FormatTime from "@/components/FormatTime";
import UserRoleBadge from "@/views/AdminUsers/components/UserRoleBadge";
import UserStatusBadge from "@/views/AdminUsers/components/UserStatusBadge";
// others
import CONSTANTS from "@/constants";

export const buildAdminUsersFilterDefs = (
  tRole: (key: LeafKeyOf<AdminUsersMessages["role"]>) => string,
  tStatus: (key: LeafKeyOf<AdminUsersMessages["status"]>) => string,
  tToolbar: (key: LeafKeyOf<AdminUsersMessages["toolbar"]>) => string
): ListFilterDef[] => [
  {
    key: "role",
    type: "select",
    label: tToolbar("role"),
    options: [
      { value: "user", label: tRole("user") },
      { value: "admin", label: tRole("admin") }
    ]
  },
  {
    key: "status",
    type: "select",
    label: tToolbar("status"),
    options: [
      {
        value: CONSTANTS.ADMIN_USER_STATUS.ACTIVE,
        label: tStatus("active")
      },
      {
        value: CONSTANTS.ADMIN_USER_STATUS.LOCKED,
        label: tStatus("locked")
      }
    ]
  }
];

export const buildAdminUsersColumns = (
  tTable: (key: LeafKeyOf<AdminUsersMessages["table"]>) => string
): CustomTableColumn<AdminUser>[] => [
  {
    id: "user",
    header: tTable("user"),
    cell: (user) => (
      <div className="flex flex-col">
        <span className="text-foreground font-medium">{user.fullName}</span>
        <span className="text-muted-foreground text-xs">{user.email}</span>
      </div>
    )
  },
  {
    id: "role",
    header: tTable("role"),
    cell: (user) => <UserRoleBadge role={user.role} />
  },
  {
    id: "status",
    header: tTable("status"),
    cell: (user) => <UserStatusBadge isActive={user.isActive} />
  },
  {
    id: "lastLoginAt",
    header: tTable("lastLoginAt"),
    cell: (user) =>
      user.lastLoginAt ? (
        <FormatTime value={user.lastLoginAt} variant="datetime" />
      ) : (
        tTable("neverLoggedIn")
      ),
    cellClassName: "text-muted-foreground text-xs"
  },
  {
    id: "createdAt",
    header: tTable("createdAt"),
    cell: (user) => <FormatTime value={user.createdAt} variant="datetime" />,
    cellClassName: "text-muted-foreground text-xs"
  }
];
