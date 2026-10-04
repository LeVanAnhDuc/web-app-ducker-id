export const CATEGORY_MOVE_DIRECTION = {
  UP: "up",
  DOWN: "down"
} as const;

export const CATEGORY_LIMITS = {
  NAME_MAX_LENGTH: 100,
  /** Mirrors the server's WEB_APP_CONFIG.MAX_CATEGORIES. */
  MAX_PER_APP: 5
} as const;
