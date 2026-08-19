// types
import type { LucideIcon } from "lucide-react";

export type RecentGroupKey = "today" | "yesterday" | "thisWeek" | "earlier";

export interface RecentApp {
  id: string;
  name: string;
  category: string;
  group: RecentGroupKey;
  time: string;
  icon: LucideIcon;
  iconColor: string;
  iconBg: string;
}
