// types
import type { LucideIcon } from "lucide-react";

export type AdminNavKey =
  | "dashboard"
  | "users"
  | "loginHistory"
  | "contacts"
  | "apps"
  | "entitlements";

export type AdminNavGroupKey = "overview" | "identity" | "apps";

export interface AdminNavItem {
  key: AdminNavKey;
  icon: LucideIcon;
  href: string;
}

export interface AdminNavGroup {
  key: AdminNavGroupKey;
  items: readonly AdminNavItem[];
}
