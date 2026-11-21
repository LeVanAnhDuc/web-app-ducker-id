const END_POINTS = {
  AUTH_LOGIN: "/auth/login",
  AUTH_LOGIN_OTP_SEND: "/auth/login/otp/send",
  AUTH_LOGIN_OTP_VERIFY: "/auth/login/otp/verify",
  AUTH_LOGIN_MAGIC_LINK_SEND: "/auth/login/magic-link/send",
  AUTH_LOGIN_MAGIC_LINK_VERIFY: "/auth/login/magic-link/verify",
  AUTH_LOGOUT: "/auth/logout",
  AUTH_UNLOCK_REQUEST: "/auth/unlock/request",
  AUTH_UNLOCK_VERIFY: "/auth/unlock/verify",
  AUTH_REFRESH: "/auth/token/refresh",

  AUTH_SIGNUP_SEND_OTP: "/auth/signup/send-otp",
  AUTH_SIGNUP_VERIFY_OTP: "/auth/signup/verify-otp",
  AUTH_SIGNUP_RESEND_OTP: "/auth/signup/resend-otp",
  AUTH_SIGNUP_COMPLETE: "/auth/signup/complete",
  AUTH_SIGNUP_CHECK_EMAIL: "/auth/signup/check-email",

  AUTH_FORGOT_PASSWORD_OTP_SEND: "/auth/forgot-password/otp/send",
  AUTH_FORGOT_PASSWORD_OTP_VERIFY: "/auth/forgot-password/otp/verify",
  AUTH_FORGOT_PASSWORD_MAGIC_LINK_SEND: "/auth/forgot-password/magic-link/send",
  AUTH_FORGOT_PASSWORD_MAGIC_LINK_VERIFY:
    "/auth/forgot-password/magic-link/verify",
  AUTH_FORGOT_PASSWORD_RESET: "/auth/forgot-password/reset",

  AUTH_CHANGE_PASSWORD: "/auth/change-password",

  USERS_ME: "/users/me",
  USER_BY_ID: "/users/:id",

  CONTACT_SUBMIT: "/contact/submit",
  MY_CONTACTS: "/contacts",
  MY_CONTACT_BY_ID: "/contacts/:id",
  ADMIN_CONTACTS: "/admin/contacts",
  ADMIN_CONTACT_BY_ID: "/admin/contacts/:id",
  ADMIN_CONTACT_STATUS: "/admin/contacts/:id/status",

  LOGIN_HISTORY: "/login-history",
  LOGIN_HISTORY_STATS: "/login-history/stats",
  ADMIN_LOGIN_HISTORY: "/admin/login-history",
  ADMIN_LOGIN_HISTORY_BY_ID: "/admin/login-history/:id",

  APPS: "/apps",
  APP_CATEGORIES: "/apps/categories",
  ADMIN_APPS: "/admin/apps",
  ADMIN_APP_BY_ID: "/admin/apps/:id",
  ADMIN_CATEGORIES: "/admin/categories",
  ADMIN_CATEGORY_BY_ID: "/admin/categories/:id",
  ADMIN_CATEGORY_MOVE: "/admin/categories/:id/move",
  ADMIN_CATEGORY_DELETE_IMPACT: "/admin/categories/:id/delete-impact",
  FAVORITES: "/users/me/favorites",
  FAVORITE_BY_APP_ID: "/users/me/favorites/:appId",
  RECENT_APPS: "/users/me/recent-apps",
  RECENT_APPS_STATS: "/users/me/recent-apps/stats",
  RECENT_APP_BY_APP_ID: "/users/me/recent-apps/:appId",
  RECENT_APP_RESTORE: "/users/me/recent-apps/:appId/restore",

  ADMIN_ENTITLEMENTS: "/admin/entitlements",

  ADMIN_USERS: "/admin/users",
  ADMIN_USER_LOCK: "/admin/users/:id/lock",
  ADMIN_USER_UNLOCK: "/admin/users/:id/unlock",
  ADMIN_USER_RESET_PASSWORD: "/admin/users/:id/reset-password",

  NOTIFICATIONS: "/notifications",
  NOTIFICATIONS_UNREAD_COUNT: "/notifications/unread-count",
  NOTIFICATIONS_READ_ALL: "/notifications/read-all",
  NOTIFICATION_READ: "/notifications/:id/read"
};

export default END_POINTS;
