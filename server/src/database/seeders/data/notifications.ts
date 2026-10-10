// types
import type {
  NotificationParams,
  NotificationType
} from "@/modules/notification/types";
// modules
import {
  LOGIN_ANOMALY_REASONS,
  NOTIFICATION_LINKS,
  NOTIFICATION_TYPES,
  PASSWORD_CHANGE_ACTORS
} from "@/modules/notification/constants";

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export interface SeedNotification {
  type: NotificationType;
  params: NotificationParams;
  link: string | null;
  isRead: boolean;
  ageMs: number;
}

// Accounts that receive seeded notifications (regular user + admin for UI testing)
export const TARGET_NOTIFICATION_EMAILS = ["user@test.com", "admin@test.com"];

export const SEED_NOTIFICATION_TOTAL = 26;

const appLink = (appName: string) =>
  `${NOTIFICATION_LINKS.APPS}?search=${encodeURIComponent(appName)}`;

/**
 * Same shapes the real producers write (type + params + link). The padding
 * rows are APP_AVAILABLE for "Seed App <N>", so every one renders a unique
 * sentence the E2E suite can anchor on; row N is read when N is odd.
 */
export const buildSeedNotifications = (): SeedNotification[] => {
  const items: SeedNotification[] = [
    {
      type: NOTIFICATION_TYPES.LOGIN_ANOMALY,
      params: {
        reason: LOGIN_ANOMALY_REASONS.DEVICE,
        browser: "Chrome",
        os: "Windows",
        country: "VN"
      },
      link: NOTIFICATION_LINKS.LOGIN_HISTORY,
      isRead: false,
      ageMs: 2 * MINUTE
    },
    {
      type: NOTIFICATION_TYPES.APP_AVAILABLE,
      params: { appName: "Atlas Imagery" },
      link: appLink("Atlas Imagery"),
      isRead: false,
      ageMs: 30 * MINUTE
    },
    {
      type: NOTIFICATION_TYPES.PASSWORD_CHANGED,
      params: { actor: PASSWORD_CHANGE_ACTORS.ADMIN },
      link: NOTIFICATION_LINKS.PROFILE,
      isRead: false,
      ageMs: 3 * HOUR
    },
    {
      type: NOTIFICATION_TYPES.PASSWORD_CHANGED,
      params: { actor: PASSWORD_CHANGE_ACTORS.SELF },
      link: NOTIFICATION_LINKS.PROFILE,
      isRead: true,
      ageMs: 5 * HOUR
    },
    {
      type: NOTIFICATION_TYPES.ACCOUNT_LOCKED,
      params: { minutes: 30 },
      link: NOTIFICATION_LINKS.LOGIN_HISTORY,
      isRead: true,
      ageMs: 3 * DAY
    }
  ];

  const padded: SeedNotification[] = [...items];
  while (padded.length < SEED_NOTIFICATION_TOTAL) {
    const n = padded.length + 1;
    const appName = `Seed App ${n}`;
    padded.push({
      type: NOTIFICATION_TYPES.APP_AVAILABLE,
      params: { appName },
      link: appLink(appName),
      isRead: n % 2 === 1,
      ageMs: (n + 3) * DAY
    });
  }
  return padded;
};
