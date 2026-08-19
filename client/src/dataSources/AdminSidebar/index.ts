// types
import type { AdminNavGroup } from "@/types/AdminSidebar";
// libs
import {
  LayoutDashboard,
  Users,
  History,
  Inbox,
  LayoutGrid,
  ShieldCheck
} from "lucide-react";
// others
import CONSTANTS from "@/constants";

const { ROUTES } = CONSTANTS;

export const ADMIN_NAV_GROUPS: readonly AdminNavGroup[] = [
  {
    key: "overview",
    items: [
      { key: "dashboard", icon: LayoutDashboard, href: ROUTES.ADMIN_DASHBOARD }
    ]
  },
  {
    key: "identity",
    items: [
      { key: "users", icon: Users, href: ROUTES.ADMIN_USERS },
      { key: "loginHistory", icon: History, href: ROUTES.ADMIN_LOGIN_HISTORY },
      { key: "contacts", icon: Inbox, href: ROUTES.ADMIN_CONTACT }
    ]
  },
  {
    key: "apps",
    items: [
      { key: "apps", icon: LayoutGrid, href: ROUTES.ADMIN_APPS },
      {
        key: "entitlements",
        icon: ShieldCheck,
        href: ROUTES.ADMIN_ENTITLEMENTS
      }
    ]
  }
] as const;
