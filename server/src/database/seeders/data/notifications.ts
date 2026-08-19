// modules
import { NOTIFICATION_TYPES } from "@/modules/notification/constants";

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export interface SeedNotification {
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  ageMs: number;
}

// Accounts that receive seeded notifications (regular user + admin for UI testing)
export const TARGET_NOTIFICATION_EMAILS = ["user@test.com", "admin@test.com"];

export const buildSeedNotifications = (): SeedNotification[] => {
  const items: SeedNotification[] = [
    {
      type: NOTIFICATION_TYPES.LOGIN_ANOMALY,
      title: "Unusual sign-in detected",
      message: "A new sign-in from Chrome on Windows was detected.",
      isRead: false,
      ageMs: 2 * MINUTE
    },
    {
      type: NOTIFICATION_TYPES.APP_AVAILABLE,
      title: "New app available",
      message: "Atlas Imagery is now available in your launcher.",
      isRead: false,
      ageMs: 30 * MINUTE
    },
    {
      type: NOTIFICATION_TYPES.ENTITLEMENT_GRANTED,
      title: "Access granted",
      message: "You were granted access to Orbit Console.",
      isRead: false,
      ageMs: 3 * HOUR
    },
    {
      type: NOTIFICATION_TYPES.PASSWORD_CHANGED,
      title: "Password changed",
      message: "Your password was changed successfully.",
      isRead: true,
      ageMs: 5 * HOUR
    },
    {
      type: NOTIFICATION_TYPES.SYSTEM_ANNOUNCEMENT,
      title: "Scheduled maintenance",
      message: "Maintenance window Saturday 02:00-04:00 UTC.",
      isRead: true,
      ageMs: 26 * HOUR
    },
    {
      type: NOTIFICATION_TYPES.ENTITLEMENT_REVOKED,
      title: "Access revoked",
      message: "Your access to Legacy Reports was revoked.",
      isRead: true,
      ageMs: 28 * HOUR
    },
    {
      type: NOTIFICATION_TYPES.ACCOUNT_LOCKED,
      title: "Account locked",
      message: "Your account was temporarily locked after failed logins.",
      isRead: true,
      ageMs: 3 * DAY
    }
  ];
  const padded: SeedNotification[] = [...items];
  let i = 0;
  while (padded.length < 26) {
    const base = items[i % items.length];
    padded.push({
      ...base,
      title: `${base.title} (#${padded.length + 1})`,
      isRead: padded.length % 2 === 0,
      ageMs: base.ageMs + (padded.length + 1) * DAY
    });
    i++;
  }
  return padded;
};
