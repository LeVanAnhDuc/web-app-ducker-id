const timeZoneCache = new Map<string, boolean>();

/**
 * A timezone from the client reaches `$dateToString`, so it has to be checked
 * against the runtime rather than against a pattern. The check is "can ICU use
 * it", not "is it in `Intl.supportedValuesOf`": that list holds only the
 * canonical spelling of each zone, and which spelling is canonical depends on
 * the ICU build. On the Node this project runs, the list contains
 * `Asia/Saigon` but not `Asia/Ho_Chi_Minh`, `Asia/Calcutta` but not
 * `Asia/Kolkata`, and no `UTC` at all — while browsers send either name
 * depending on their own ICU. Validating against the list would reject real
 * users over nothing more than a version difference.
 *
 * `Intl.DateTimeFormat` accepts canonical names and links alike and throws
 * `RangeError` on anything else, which is exactly the property needed here.
 */
export const isSupportedTimeZone = (value: string): boolean => {
  const cached = timeZoneCache.get(value);
  if (cached !== undefined) return cached;

  let supported = false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value });
    supported = true;
  } catch {
    supported = false;
  }

  // Bounded by the DTO's MaxLength upstream; one entry per distinct zone the
  // clients actually send.
  if (timeZoneCache.size < 1000) timeZoneCache.set(value, supported);
  return supported;
};

// Joi's own ISO 8601 pattern (joi/lib/common.js): validator.js's `isISO8601`
// accepts and refuses different strings, and Joi's verdict is the contract.
const ISO_DATE_PATTERN =
  /^(?:[-+]\d{2})?(?:\d{4}(?!\d{2}\b))(?:(-?)(?:(?:0[1-9]|1[0-2])(?:\1(?:[12]\d|0[1-9]|3[01]))?|W(?:[0-4]\d|5[0-2])(?:-?[1-7])?|(?:00[1-9]|0[1-9]\d|[12]\d{2}|3(?:[0-5]\d|6[1-6])))(?![T]$|[T][\d]+Z$)(?:[T\s](?:(?:(?:[01]\d|2[0-3])(?:(:?)[0-5]\d)?|24:?00)(?:[.,]\d+(?!:))?)(?:\2[0-5]\d(?:[.,]\d+)?)?(?:[Z]|(?:[+-])(?:[01]\d|2[0-3])(?::?[0-5]\d)?)?)?)?$/;

/**
 * What Joi's `string().isoDate()` turns a value into: the same instant in
 * `toISOString()` form (`"1995-05-15"` → `"1995-05-15T00:00:00.000Z"`), or
 * `null` when it would refuse it. Services and stored data already depend on
 * the normalised form.
 */
export const toIsoDateString = (value: string): string | null => {
  if (!ISO_DATE_PATTERN.test(value)) return null;
  // Joi pads a bare hour offset (`+07`) so `Date` can parse it.
  const padded = /.*T.*[+-]\d\d$/.test(value) ? `${value}00` : value;
  const date = new Date(padded);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};
