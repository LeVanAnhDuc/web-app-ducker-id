const QUERY_KEYS = {
  ADMIN_APPS: "adminApps",
  ADMIN_CATEGORIES: "adminCategories",
  ADMIN_CATEGORY_DELETE_IMPACT: "adminCategoryDeleteImpact",
  APP_CATEGORIES: "appCategories",
  APPS: "apps",
  FAVORITES: "favorites",
  RECENT_APPS: "recentApps",
  RECENT_APPS_STATS: "recentAppsStats",
  ADMIN_CONTACT_LIST: "adminContactList",
  ADMIN_CONTACT_DETAIL: "adminContactDetail",
  MY_CONTACTS: "myContacts",
  MY_CONTACT_DETAIL: "myContactDetail",
  ADMIN_USERS: "adminUsers",
  ADMIN_USERS_LIST: "adminUsersList",
  ADMIN_LOGIN_HISTORY: "adminLoginHistory",
  ADMIN_LOGIN_HISTORY_DETAIL: "adminLoginHistoryDetail",
  LOGIN_HISTORY: "loginHistory",
  MY_PROFILE: "myProfile",
  TOKEN_REFRESH: "token-refresh",
  SESSION_BOOTSTRAP: "session-bootstrap",
  NOTIFICATIONS: "notifications",
  NOTIFICATIONS_UNREAD_COUNT: "notificationsUnreadCount"
} as const;

export default QUERY_KEYS;
