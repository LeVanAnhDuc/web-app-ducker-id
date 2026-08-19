// types
import type { AdminDashboardCard } from "@/types/AdminDashboard";
// libs
import { LayoutGrid, ShieldCheck, Users, Inbox, History } from "lucide-react";
// others
import CONSTANTS from "@/constants";

const { ROUTES } = CONSTANTS;

export const ADMIN_DASHBOARD_CARDS: readonly AdminDashboardCard[] = [
  { key: "apps", icon: LayoutGrid, href: ROUTES.ADMIN_APPS },
  { key: "entitlements", icon: ShieldCheck, href: ROUTES.ADMIN_ENTITLEMENTS },
  { key: "users", icon: Users, href: ROUTES.ADMIN_USERS },
  { key: "contacts", icon: Inbox, href: ROUTES.ADMIN_CONTACT },
  { key: "loginHistory", icon: History, href: ROUTES.ADMIN_LOGIN_HISTORY }
] as const;
