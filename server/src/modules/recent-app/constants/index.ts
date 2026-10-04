const SECONDS_PER_DAY = 24 * 60 * 60;

export const RECENT_APP_CONFIG = {
  SORT_FIELD: "lastUsedAt",
  // A soft-deleted row is purged by a TTL index this long after `hiddenAt`.
  HIDDEN_RETENTION_SECONDS: 30 * SECONDS_PER_DAY,
  // One open usually produces two writes (the launcher POST, then the OIDC
  // authorize the app redirects into). Writes this close together count once.
  DEDUPE_WINDOW_MS: 60 * 1000
} as const;
