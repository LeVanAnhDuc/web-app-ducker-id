// validators
import { AGE_VALIDATION } from "@/validators/constants";

const HOUR_MS = 3_600_000;

/**
 * Age limits in calendar days. A `YYYY-MM-DD` birth date arrives as UTC
 * midnight, while "today" depends on where the user is (UTC-12 … UTC+14), so
 * the bounds use the latest and earliest calendar day it can be anywhere:
 * someone's 13th birthday is accepted from the first time zone it starts in.
 * Computed per call — a bound built once at boot goes stale while the server runs.
 */
export const getDateOfBirthBounds = (
  now: Date = new Date()
): {
  minDate: Date;
  maxDate: Date;
} => {
  const latestToday = new Date(now.getTime() + 14 * HOUR_MS);
  const earliestToday = new Date(now.getTime() - 12 * HOUR_MS);
  const maxDate = new Date(
    Date.UTC(
      latestToday.getUTCFullYear() - AGE_VALIDATION.MIN_AGE,
      latestToday.getUTCMonth(),
      latestToday.getUTCDate()
    )
  );
  const minDate = new Date(
    Date.UTC(
      earliestToday.getUTCFullYear() - AGE_VALIDATION.MAX_AGE,
      earliestToday.getUTCMonth(),
      earliestToday.getUTCDate()
    )
  );
  return { minDate, maxDate };
};
