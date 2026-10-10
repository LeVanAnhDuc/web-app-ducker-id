// types
import type {
  ApiNotificationType,
  NotificationCategoryOption,
  NotificationStatusTab,
  NotificationVisual
} from "@/types/Notification";
// libs
import {
  ShieldAlert,
  Lock,
  Sparkles,
  KeyRound,
  CircleCheck,
  CircleX,
  Megaphone
} from "lucide-react";
// others
import CONSTANTS from "@/constants";

const { CATEGORY, CATEGORY_FILTER_ALL, STATUS_TAB } = CONSTANTS.NOTIFICATION;

// Security alerts share the destructive tint so they never read like news.
const SECURITY_TONE = {
  iconBg: "bg-destructive/10",
  iconColor: "text-destructive"
};

export const NOTIFICATION_VISUALS: Record<
  ApiNotificationType,
  NotificationVisual
> = {
  LOGIN_ANOMALY: { icon: ShieldAlert, ...SECURITY_TONE },
  ACCOUNT_LOCKED: { icon: Lock, ...SECURITY_TONE },
  PASSWORD_CHANGED: { icon: KeyRound, ...SECURITY_TONE },
  APP_AVAILABLE: {
    icon: Sparkles,
    iconBg: "bg-info/15",
    iconColor: "text-info"
  },
  ENTITLEMENT_GRANTED: {
    icon: CircleCheck,
    iconBg: "bg-success/15",
    iconColor: "text-success"
  },
  ENTITLEMENT_REVOKED: {
    icon: CircleX,
    iconBg: "bg-warning/20",
    iconColor: "text-warning-foreground"
  },
  SYSTEM_ANNOUNCEMENT: {
    icon: Megaphone,
    iconBg: "bg-muted",
    iconColor: "text-muted-foreground"
  }
};

export const NOTIFICATION_STATUS_TABS: NotificationStatusTab[] = [
  STATUS_TAB.ALL,
  STATUS_TAB.UNREAD,
  STATUS_TAB.READ
];

export const NOTIFICATION_CATEGORY_OPTIONS: NotificationCategoryOption[] = [
  { value: CATEGORY_FILTER_ALL, labelKey: "all" },
  { value: CATEGORY.SECURITY, labelKey: CATEGORY.SECURITY },
  { value: CATEGORY.ACCOUNT, labelKey: CATEGORY.ACCOUNT },
  { value: CATEGORY.APP, labelKey: CATEGORY.APP },
  { value: CATEGORY.SYSTEM, labelKey: CATEGORY.SYSTEM }
];
