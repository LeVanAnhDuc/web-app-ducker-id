// types
import type { NotifGroup } from "@/types/Notification";
// others
import CONSTANTS from "@/constants";

const { TODAY, YESTERDAY, EARLIER } = CONSTANTS.NOTIF_GROUP;

const DAY_MS = 24 * 60 * 60 * 1000;

export const groupOf = (iso: string, now: number): NotifGroup => {
  const startToday = new Date(now).setHours(0, 0, 0, 0);
  const t = new Date(iso).getTime();
  if (t >= startToday) return TODAY;
  if (t >= startToday - DAY_MS) return YESTERDAY;
  return EARLIER;
};
