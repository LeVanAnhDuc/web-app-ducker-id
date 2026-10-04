export const CATEGORY_CONFIG = {
  NAME_MAX_LENGTH: 100,
  SLUG_MAX_LENGTH: 100,
  /** Room left for a `-n` suffix so a suffixed slug never exceeds SLUG_MAX_LENGTH. */
  SLUG_BASE_MAX_LENGTH: 90,
  /** Retries when a concurrent create/rename grabs the same slug first. */
  SLUG_MAX_ATTEMPTS: 3,
  MAX_REASSIGNMENTS: 500
} as const;

export const CATEGORY_MOVE_DIRECTIONS = {
  UP: "up",
  DOWN: "down"
} as const;

/** Case-insensitive match used by the `name.en` unique index and its lookups. */
export const CATEGORY_NAME_COLLATION = { locale: "en", strength: 2 } as const;
