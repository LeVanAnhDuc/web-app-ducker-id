// types
import type { LucideIcon } from "lucide-react";

export type AdminDashboardCardKey =
  | "apps"
  | "entitlements"
  | "users"
  | "contacts"
  | "loginHistory";

export interface AdminDashboardCard {
  key: AdminDashboardCardKey;
  icon: LucideIcon;
  href: string;
}
