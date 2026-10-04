/**
 * A `YYYY-MM-DD` bucket is a calendar day, not an instant. It is parsed as UTC
 * and formatted in UTC so the label never slides to the day before in a zone
 * behind Greenwich — the server already cut the bucket in the viewer's zone.
 */
export const formatDayLabel = (day: string, locale: string): string =>
  new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "2-digit",
    timeZone: "UTC"
  }).format(new Date(`${day}T00:00:00Z`));

export const formatDayLong = (day: string, locale: string): string =>
  new Intl.DateTimeFormat(locale, {
    weekday: "long",
    day: "2-digit",
    month: "long",
    timeZone: "UTC"
  }).format(new Date(`${day}T00:00:00Z`));

/** Ticks get crowded past a couple of weeks; show roughly a dozen of them. */
export const tickInterval = (points: number): number =>
  Math.max(0, Math.ceil(points / 12) - 1);
