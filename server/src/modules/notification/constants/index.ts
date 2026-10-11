export const NOTIFICATION_TYPES = {
  LOGIN_ANOMALY: "LOGIN_ANOMALY",
  ACCOUNT_LOCKED: "ACCOUNT_LOCKED",
  APP_AVAILABLE: "APP_AVAILABLE",
  ENTITLEMENT_GRANTED: "ENTITLEMENT_GRANTED",
  ENTITLEMENT_REVOKED: "ENTITLEMENT_REVOKED",
  PASSWORD_CHANGED: "PASSWORD_CHANGED",
  SYSTEM_ANNOUNCEMENT: "SYSTEM_ANNOUNCEMENT"
} as const;

export const NOTIFICATION_CATEGORIES = {
  SECURITY: "security",
  ACCOUNT: "account",
  APP: "app",
  SYSTEM: "system"
} as const;

// Category được tính một lần lúc ghi để lọc và index bằng một field — client
// không phải giữ một bảng map type → nhóm thứ hai.
export const NOTIFICATION_CATEGORY_BY_TYPE = {
  LOGIN_ANOMALY: NOTIFICATION_CATEGORIES.SECURITY,
  ACCOUNT_LOCKED: NOTIFICATION_CATEGORIES.SECURITY,
  PASSWORD_CHANGED: NOTIFICATION_CATEGORIES.SECURITY,
  ENTITLEMENT_GRANTED: NOTIFICATION_CATEGORIES.ACCOUNT,
  ENTITLEMENT_REVOKED: NOTIFICATION_CATEGORIES.ACCOUNT,
  APP_AVAILABLE: NOTIFICATION_CATEGORIES.APP,
  SYSTEM_ANNOUNCEMENT: NOTIFICATION_CATEGORIES.SYSTEM
} as const;

// Route của client mà notification dẫn tới. Chỉ là đường dẫn nội bộ — xem
// `isInternalLink`.
export const NOTIFICATION_LINKS = {
  PROFILE: "/profile",
  LOGIN_HISTORY: "/login-history",
  APPS: "/apps"
} as const;

export const PASSWORD_CHANGE_ACTORS = {
  SELF: "self",
  ADMIN: "admin"
} as const;

export const LOGIN_ANOMALY_REASONS = {
  DEVICE: "device",
  COUNTRY: "country",
  BOTH: "both"
} as const;

export const NOTIFICATION_CONFIG = {
  LINK_MAX_LENGTH: 2048,
  // Fan-out ghi theo lô để một app mới không giữ hàng chục nghìn _id trong RAM
  // hay gửi một insertMany khổng lồ.
  BROADCAST_BATCH_SIZE: 500
} as const;
