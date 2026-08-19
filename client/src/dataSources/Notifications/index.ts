// types
import type {
  ApiNotificationType,
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

export const NOTIFICATION_VISUALS: Record<
  ApiNotificationType,
  NotificationVisual
> = {
  LOGIN_ANOMALY: {
    icon: ShieldAlert,
    iconBg: "bg-destructive/10",
    iconColor: "text-destructive"
  },
  ACCOUNT_LOCKED: {
    icon: Lock,
    iconBg: "bg-destructive/10",
    iconColor: "text-destructive"
  },
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
  PASSWORD_CHANGED: {
    icon: KeyRound,
    iconBg: "bg-primary/15",
    iconColor: "text-primary"
  },
  SYSTEM_ANNOUNCEMENT: {
    icon: Megaphone,
    iconBg: "bg-muted",
    iconColor: "text-muted-foreground"
  }
};
