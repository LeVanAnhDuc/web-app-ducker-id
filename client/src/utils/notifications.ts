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

/**
 * Mirrors the server's check: a notification may only send the user to a path
 * inside this app — never `//host` or `/\host`, which browsers resolve to
 * another origin.
 */
export const isInternalLink = (link: string | null): link is string =>
  !!link &&
  link.startsWith("/") &&
  !link.startsWith("//") &&
  !link.includes("\\");

/** `VN` → `Vietnam` / `Việt Nam`; anything Intl cannot name comes back as is. */
export const formatRegionName = (code: string, locale: string): string => {
  try {
    return new Intl.DisplayNames([locale], { type: "region" }).of(code) ?? code;
  } catch {
    return code;
  }
};
