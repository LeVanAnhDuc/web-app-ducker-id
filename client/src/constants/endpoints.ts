const END_POINTS = {
  // Auth
  AUTH_LOGIN: "/auth/login",
  AUTH_LOGIN_OTP_SEND: "/auth/login/otp/send",
  AUTH_LOGIN_OTP_VERIFY: "/auth/login/otp/verify",
  AUTH_LOGIN_MAGIC_LINK_SEND: "/auth/login/magic-link/send",
  AUTH_LOGIN_MAGIC_LINK_VERIFY: "/auth/login/magic-link/verify",
  AUTH_LOGOUT: "/auth/logout",
  AUTH_REFRESH: "/auth/token/refresh",

  // Signup
  AUTH_SIGNUP_SEND_OTP: "/auth/signup/send-otp",
  AUTH_SIGNUP_VERIFY_OTP: "/auth/signup/verify-otp",
  AUTH_SIGNUP_RESEND_OTP: "/auth/signup/resend-otp",
  AUTH_SIGNUP_COMPLETE: "/auth/signup/complete",
  AUTH_SIGNUP_CHECK_EMAIL: "/auth/signup/check-email/:email",

  // Forgot Password
  AUTH_FORGOT_PASSWORD_OTP_SEND: "/auth/forgot-password/otp/send",
  AUTH_FORGOT_PASSWORD_OTP_VERIFY: "/auth/forgot-password/otp/verify",
  AUTH_FORGOT_PASSWORD_MAGIC_LINK_SEND: "/auth/forgot-password/magic-link/send",
  AUTH_FORGOT_PASSWORD_MAGIC_LINK_VERIFY:
    "/auth/forgot-password/magic-link/verify",
  AUTH_FORGOT_PASSWORD_RESET: "/auth/forgot-password/reset",

  // Change Password
  AUTH_CHANGE_PASSWORD: "/auth/change-password",

  // Users
  USERS_ME: "/users/me",
  USER_BY_ID: "/users/:id",

  // Contact
  CONTACT_SUBMIT: "/contact/submit",
  MY_CONTACTS: "/contacts",
  MY_CONTACT_BY_ID: "/contacts/:id",
  ADMIN_CONTACTS: "/admin/contacts",
  ADMIN_CONTACT_BY_ID: "/admin/contacts/:id",
  ADMIN_CONTACT_STATUS: "/admin/contacts/:id/status",

  // Login History
  LOGIN_HISTORY: "/login-history",
  LOGIN_HISTORY_STATS: "/login-history/stats",
  ADMIN_LOGIN_HISTORY: "/admin/login-history",
  ADMIN_LOGIN_HISTORY_BY_ID: "/admin/login-history/:id",

  // App Registry
  APPS: "/apps",
  APP_CATEGORIES: "/apps/categories",
  ADMIN_APPS: "/admin/apps",
  ADMIN_APP_BY_ID: "/admin/apps/:id",
  ADMIN_APP_CATEGORIES: "/admin/apps/categories",
  FAVORITES: "/users/me/favorites",
  FAVORITE_BY_APP_ID: "/users/me/favorites/:appId",

  // Users (admin)
  ADMIN_USERS: "/admin/users",
  ADMIN_USER_LOCK: "/admin/users/:id/lock",
  ADMIN_USER_UNLOCK: "/admin/users/:id/unlock",
  ADMIN_USER_RESET_PASSWORD: "/admin/users/:id/reset-password",

  // Notifications
  NOTIFICATIONS: "/notifications",
  NOTIFICATIONS_UNREAD_COUNT: "/notifications/unread-count",
  NOTIFICATIONS_READ_ALL: "/notifications/read-all",
  NOTIFICATION_READ: "/notifications/:id/read"
};

export default END_POINTS;
