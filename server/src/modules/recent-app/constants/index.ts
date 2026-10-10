const SECONDS_PER_DAY = 24 * 60 * 60;

export const RECENT_APP_CONFIG = {
  SORT_FIELD: "lastUsedAt",
  // A soft-deleted row is purged by a TTL index this long after `hiddenAt`.
  HIDDEN_RETENTION_SECONDS: 30 * SECONDS_PER_DAY,
  // One open usually produces two writes (the launcher POST, then the OIDC
  // authorize the app redirects into). Writes this close together count once.
  DEDUPE_WINDOW_MS: 60 * 1000
} as const;

export const RECENT_APP_STATS = {
  TOP_APPS_DEFAULT_LIMIT: 5,
  TOP_APPS_MAX_LIMIT: 10,
  // "Still in use" windows, measured back from now rather than by calendar
  // day: these are counts, not a chart, so a local midnight does not matter.
  ACTIVE_WINDOW_DAYS: { RECENT: 7, EXTENDED: 30 }
} as const;
