// types
import type { RecentApp, RecentGroupKey } from "@/types/RecentlyUsed";
// libs
import {
  FileText,
  ShoppingBag,
  Code,
  CalendarDays,
  SquareCheckBig,
  Music,
  ChefHat,
  GraduationCap,
  Image as ImageIcon
} from "lucide-react";

export const RECENT_GROUP_DOTS: Record<RecentGroupKey, string> = {
  today: "bg-success",
  yesterday: "bg-warning",
  thisWeek: "bg-muted-foreground",
  earlier: "bg-muted-foreground/60"
};

export const RECENT_APPS_MOCK: RecentApp[] = [
  {
    id: "ru1",
    name: "Personal Blog",
    category: "Productivity",
    group: "today",
    time: "12 minutes ago",
    icon: FileText,
    iconColor: "text-primary",
    iconBg: "bg-primary/10"
  },
  {
    id: "ru2",
    name: "Mini Shop",
    category: "E-commerce",
    group: "today",
    time: "2 hours ago",
    icon: ShoppingBag,
    iconColor: "text-warning-foreground",
    iconBg: "bg-warning/20"
  },
  {
    id: "ru3",
    name: "DevTools",
    category: "Developer",
    group: "today",
    time: "5 hours ago",
    icon: Code,
    iconColor: "text-info",
    iconBg: "bg-info/10"
  },
  {
    id: "ru4",
    name: "Calendar Pro",
    category: "Productivity",
    group: "yesterday",
    time: "1 day ago",
    icon: CalendarDays,
    iconColor: "text-success",
    iconBg: "bg-success/10"
  },
  {
    id: "ru5",
    name: "TaskFlow",
    category: "Productivity",
    group: "yesterday",
    time: "1 day ago",
    icon: SquareCheckBig,
    iconColor: "text-info",
    iconBg: "bg-info/10"
  },
  {
    id: "ru6",
    name: "SoundWave",
    category: "Entertainment",
    group: "thisWeek",
    time: "3 days ago",
    icon: Music,
    iconColor: "text-destructive",
    iconBg: "bg-destructive/10"
  },
  {
    id: "ru7",
    name: "Recipe Box",
    category: "Lifestyle",
    group: "thisWeek",
    time: "4 days ago",
    icon: ChefHat,
    iconColor: "text-destructive",
    iconBg: "bg-destructive/10"
  },
  {
    id: "ru8",
    name: "LearnHub",
    category: "Education",
    group: "thisWeek",
    time: "6 days ago",
    icon: GraduationCap,
    iconColor: "text-primary",
    iconBg: "bg-primary/10"
  },
  {
    id: "ru9",
    name: "Photo Gallery",
    category: "Entertainment",
    group: "earlier",
    time: "2 weeks ago",
    icon: ImageIcon,
    iconColor: "text-cream-foreground",
    iconBg: "bg-cream"
  },
  {
    id: "ru10",
    name: "Mini Shop",
    category: "E-commerce",
    group: "earlier",
    time: "3 weeks ago",
    icon: ShoppingBag,
    iconColor: "text-warning-foreground",
    iconBg: "bg-warning/20"
  }
];
