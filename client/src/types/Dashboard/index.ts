// types
import type { LucideIcon } from "lucide-react";
import type { SORT_OPTIONS } from "@/dataSources/Dashboard";

export interface App {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
  category: string;
  rating: number;
  downloads: string;
  colorClass: string;
  lastUsed?: Date;
  featured?: boolean;
  tags: string[];
}

export type NavKey =
  | "home"
  | "apps"
  | "loginHistory"
  | "favorites"
  | "recentlyUsed"
  | "profile"
  | "billing";

export type NavGroupKey = "discover" | "mine" | "settings";

export interface NavItem {
  key: NavKey;
  icon: LucideIcon;
  href: string;
}

export interface NavGroup {
  key: NavGroupKey;
  items: readonly NavItem[];
}

export type SortOption = (typeof SORT_OPTIONS)[number]["value"];
