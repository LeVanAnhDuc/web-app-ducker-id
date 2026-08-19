// types
import type { NavGroup } from "@/types/Dashboard";
// libs
import {
  Home,
  LayoutGrid,
  History,
  Star,
  Clock,
  User,
  CreditCard
} from "lucide-react";
// others
import CONSTANTS from "@/constants";

const { ROUTES } = CONSTANTS;

export const NAV_GROUPS: readonly NavGroup[] = [
  {
    key: "discover",
    items: [
      { key: "home", icon: Home, href: ROUTES.HOME },
      { key: "apps", icon: LayoutGrid, href: ROUTES.APPS }
    ]
  },
  {
    key: "mine",
    items: [
      { key: "loginHistory", icon: History, href: ROUTES.LOGIN_HISTORY },
      { key: "favorites", icon: Star, href: ROUTES.FAVORITES },
      { key: "recentlyUsed", icon: Clock, href: ROUTES.RECENTLY_USED }
    ]
  },
  {
    key: "settings",
    items: [
      { key: "profile", icon: User, href: ROUTES.PROFILE },
      { key: "billing", icon: CreditCard, href: ROUTES.BILLING }
    ]
  }
] as const;

export const SORT_OPTIONS = [
  { value: "featured" },
  { value: "rating" },
  { value: "downloads" },
  { value: "name" }
] as const;
