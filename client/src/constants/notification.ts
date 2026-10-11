const NOTIFICATION = {
  TYPE: {
    LOGIN_ANOMALY: "LOGIN_ANOMALY",
    ACCOUNT_LOCKED: "ACCOUNT_LOCKED",
    APP_AVAILABLE: "APP_AVAILABLE",
    ENTITLEMENT_GRANTED: "ENTITLEMENT_GRANTED",
    ENTITLEMENT_REVOKED: "ENTITLEMENT_REVOKED",
    PASSWORD_CHANGED: "PASSWORD_CHANGED",
    SYSTEM_ANNOUNCEMENT: "SYSTEM_ANNOUNCEMENT"
  },
  CATEGORY: {
    SECURITY: "security",
    ACCOUNT: "account",
    APP: "app",
    SYSTEM: "system"
  },
  STATUS_TAB: {
    ALL: "all",
    UNREAD: "unread",
    READ: "read"
  },
  /** `all` is the "no category filter" chip, not a server value. */
  CATEGORY_FILTER_ALL: "all",
  PANEL_LIMIT: 8,
  // Until realtime push lands the badge polls; a minute keeps it current
  // without hammering the API from every open tab.
  UNREAD_POLL_MS: 60_000
} as const;

export default NOTIFICATION;
