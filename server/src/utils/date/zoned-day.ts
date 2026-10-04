/**
 * Calendar-day arithmetic in an IANA timezone, with no dependency.
 *
 * A "day" here is the string `YYYY-MM-DD` as the user's own clock would read
 * it. Everything that groups rows per day — the sign-in activity series — has
 * to agree with the client on where midnight falls, or a login at 00:30 in
 * Hanoi lands on the previous day's column.
 */

/** The calendar day `instant` falls on in `timeZone`. `en-CA` formats as ISO. */
export const toZonedDay = (instant: Date, timeZone: string): string =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(instant);

/**
 * Shift a day string by whole days. The arithmetic runs on the date parts, not
 * on a timestamp: adding 24h across a DST boundary skips or repeats a day.
 */
export const addDays = (day: string, amount: number): string => {
  const [year, month, date] = day.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, date + amount))
    .toISOString()
    .slice(0, 10);
};

/** How far `timeZone` runs ahead of UTC at this instant, in milliseconds. */
const zoneOffsetMs = (instant: Date, timeZone: string): number => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  }).formatToParts(instant);

  const part = (type: Intl.DateTimeFormatPartTypes): number =>
    Number(parts.find((p) => p.type === type)?.value ?? 0);

  // `hour` comes back as 24 at midnight in some ICU builds.
  const asIfUtc = Date.UTC(
    part("year"),
    part("month") - 1,
    part("day"),
    part("hour") % 24,
    part("minute"),
    part("second")
  );

  return asIfUtc - instant.getTime();
};

/**
 * The instant at which a calendar day begins in `timeZone`. Used as the lower
 * bound of a stats range so the first bucket is a whole day rather than a
 * partial one starting at whatever time of day the request arrived.
 */
export const startOfZonedDay = (day: string, timeZone: string): Date => {
  const [year, month, date] = day.split("-").map(Number);
  const midnightIfUtc = Date.UTC(year, month - 1, date);
  const offset = zoneOffsetMs(new Date(midnightIfUtc), timeZone);
  return new Date(midnightIfUtc - offset);
};
