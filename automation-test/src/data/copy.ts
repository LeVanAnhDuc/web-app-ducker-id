// Text the tests assert on. Not copied: imported straight from the catalogues
// the app renders, so a copy change reaches the tests without a copy step and
// an assertion can never drift from the real string.
//
//   copy.<namespace>          client/src/locales/en/<namespace>.json (next-intl)
//   serverMessage.<namespace> server/src/i18n/locales/en/<namespace>.json (i18next)
//   copyVi / serverMessageVi  the same catalogues in vi, for specs that assert
//                             the Vietnamese UI or Accept-Language: vi
//
// A message with placeholders is filled with `fill()`: next-intl uses
// `{name}`, i18next uses `{{name}}`. A message asserted loosely (a number
// the test cannot know) becomes a RegExp with `pattern()`. Add a namespace
// here when a migrated module first needs it.

import clientCommon from "../../../client/src/locales/en/common.json";
import clientLogin from "../../../client/src/locales/en/login.json";
import clientSignup from "../../../client/src/locales/en/signup.json";
import serverLogin from "../../../server/src/i18n/locales/en/login.json";
import serverLogout from "../../../server/src/i18n/locales/en/logout.json";
import serverSignup from "../../../server/src/i18n/locales/en/signup.json";
import serverUnlock from "../../../server/src/i18n/locales/en/unlockAccount.json";
import serverValidation from "../../../server/src/i18n/locales/en/validation.json";
import clientCommonVi from "../../../client/src/locales/vi/common.json";
import clientLoginVi from "../../../client/src/locales/vi/login.json";
import serverLoginVi from "../../../server/src/i18n/locales/vi/login.json";
import serverValidationVi from "../../../server/src/i18n/locales/vi/validation.json";
import clientAdminUsers from "../../../client/src/locales/en/adminUsers.json";
import clientList from "../../../client/src/locales/en/list.json";
import serverCommon from "../../../server/src/i18n/locales/en/common.json";
import serverUser from "../../../server/src/i18n/locales/en/user.json";
import clientAdminUsersVi from "../../../client/src/locales/vi/adminUsers.json";
import clientListVi from "../../../client/src/locales/vi/list.json";
import serverCommonVi from "../../../server/src/i18n/locales/vi/common.json";
import serverUserVi from "../../../server/src/i18n/locales/vi/user.json";
import clientApps from "../../../client/src/locales/en/apps.json";
import clientDashboard from "../../../client/src/locales/en/dashboard.json";
import serverCategory from "../../../server/src/i18n/locales/en/category.json";
import clientAppsVi from "../../../client/src/locales/vi/apps.json";
import clientDashboardVi from "../../../client/src/locales/vi/dashboard.json";
import clientNotifications from "../../../client/src/locales/en/notifications.json";
import clientNotificationsVi from "../../../client/src/locales/vi/notifications.json";
import serverNotification from "../../../server/src/i18n/locales/en/notification.json";
import clientAdminEntitlements from "../../../client/src/locales/en/adminEntitlements.json";
import clientAdminEntitlementsVi from "../../../client/src/locales/vi/adminEntitlements.json";
import serverEntitlement from "../../../server/src/i18n/locales/en/entitlement.json";
import clientAccount from "../../../client/src/locales/en/account.json";
import clientForgotPassword from "../../../client/src/locales/en/forgotPassword.json";
import clientForgotPasswordReset from "../../../client/src/locales/en/forgotPasswordReset.json";
import clientForceChangePassword from "../../../client/src/locales/en/forceChangePassword.json";
import clientSupport from "../../../client/src/locales/en/support.json";
import serverForgotPassword from "../../../server/src/i18n/locales/en/forgotPassword.json";
import serverChangePassword from "../../../server/src/i18n/locales/en/changePassword.json";
import clientAccountVi from "../../../client/src/locales/vi/account.json";
import clientForgotPasswordVi from "../../../client/src/locales/vi/forgotPassword.json";
import clientForgotPasswordResetVi from "../../../client/src/locales/vi/forgotPasswordReset.json";
import clientForceChangePasswordVi from "../../../client/src/locales/vi/forceChangePassword.json";
import clientRecentlyUsed from "../../../client/src/locales/en/recentlyUsed.json";
import clientRecentlyUsedVi from "../../../client/src/locales/vi/recentlyUsed.json";
import serverRecentApp from "../../../server/src/i18n/locales/en/recentApp.json";
import clientAdminApps from "../../../client/src/locales/en/adminApps.json";
import clientAdminAppsVi from "../../../client/src/locales/vi/adminApps.json";
import serverWebApp from "../../../server/src/i18n/locales/en/webApp.json";
import serverWebAppVi from "../../../server/src/i18n/locales/vi/webApp.json";
import clientFavorites from "../../../client/src/locales/en/favorites.json";
import clientFavoritesVi from "../../../client/src/locales/vi/favorites.json";
import serverFavorite from "../../../server/src/i18n/locales/en/favorite.json";
import clientLoginHistory from "../../../client/src/locales/en/loginHistory.json";
import clientLoginHistoryVi from "../../../client/src/locales/vi/loginHistory.json";
import serverLoginHistory from "../../../server/src/i18n/locales/en/loginHistory.json";
import clientHome from "../../../client/src/locales/en/home.json";
import clientHomeVi from "../../../client/src/locales/vi/home.json";
import clientAdminCategories from "../../../client/src/locales/en/adminCategories.json";
import clientAdminCategoriesVi from "../../../client/src/locales/vi/adminCategories.json";
import serverCategoryVi from "../../../server/src/i18n/locales/vi/category.json";
import clientAdmin from "../../../client/src/locales/en/admin.json";
import clientContactAdmin from "../../../client/src/locales/en/contactAdmin.json";
import clientContactAdminVi from "../../../client/src/locales/vi/contactAdmin.json";
import clientSupportVi from "../../../client/src/locales/vi/support.json";
import serverContactAdmin from "../../../server/src/i18n/locales/en/contactAdmin.json";
import clientAdminDashboard from "../../../client/src/locales/en/adminDashboard.json";
import clientAdminDashboardVi from "../../../client/src/locales/vi/adminDashboard.json";

export const copy = {
  common: clientCommon,
  login: clientLogin,
  signup: clientSignup,
  adminUsers: clientAdminUsers,
  list: clientList,
  apps: clientApps,
  dashboard: clientDashboard,
  notifications: clientNotifications,
  adminEntitlements: clientAdminEntitlements,
  account: clientAccount,
  forgotPassword: clientForgotPassword,
  forgotPasswordReset: clientForgotPasswordReset,
  forceChangePassword: clientForceChangePassword,
  support: clientSupport,
  recentlyUsed: clientRecentlyUsed,
  adminApps: clientAdminApps,
  favorites: clientFavorites,
  loginHistory: clientLoginHistory,
  home: clientHome,
  adminCategories: clientAdminCategories,
  admin: clientAdmin,
  contactAdmin: clientContactAdmin,
  adminDashboard: clientAdminDashboard
} as const;

export const serverMessage = {
  login: serverLogin,
  logout: serverLogout,
  signup: serverSignup,
  unlockAccount: serverUnlock,
  validation: serverValidation,
  common: serverCommon,
  user: serverUser,
  category: serverCategory,
  notification: serverNotification,
  entitlement: serverEntitlement,
  forgotPassword: serverForgotPassword,
  changePassword: serverChangePassword,
  webApp: serverWebApp,
  favorite: serverFavorite,
  recentApp: serverRecentApp,
  loginHistory: serverLoginHistory,
  contactAdmin: serverContactAdmin
} as const;

export const copyVi = {
  common: clientCommonVi,
  login: clientLoginVi,
  adminUsers: clientAdminUsersVi,
  list: clientListVi,
  apps: clientAppsVi,
  dashboard: clientDashboardVi,
  notifications: clientNotificationsVi,
  adminEntitlements: clientAdminEntitlementsVi,
  account: clientAccountVi,
  forgotPassword: clientForgotPasswordVi,
  forgotPasswordReset: clientForgotPasswordResetVi,
  forceChangePassword: clientForceChangePasswordVi,
  adminApps: clientAdminAppsVi,
  favorites: clientFavoritesVi,
  recentlyUsed: clientRecentlyUsedVi,
  loginHistory: clientLoginHistoryVi,
  home: clientHomeVi,
  adminCategories: clientAdminCategoriesVi,
  contactAdmin: clientContactAdminVi,
  support: clientSupportVi,
  adminDashboard: clientAdminDashboardVi
} as const;

/** The catalogues a password screen reads: `copy` (en) or `copyVi`. */
export type PasswordCopy = Pick<
  typeof copy,
  | "account"
  | "common"
  | "forceChangePassword"
  | "forgotPassword"
  | "forgotPasswordReset"
  | "support"
>;

/**
 * Text the client hardcodes outside its catalogues — kept here so a spec
 * still never writes an asserted string itself. Source in each comment.
 */
export const clientLiteral = {
  /** client/src/libs/query-client.ts — the global toast for any 5xx mutation. */
  serverErrorToast: "Server error. Please try again later.",
  /** client/src/libs/axios.ts — the blocking toast for a request with no response. */
  networkErrorToast:
    "Unable to connect to server. Please check your internet connection.",
  /** client/src/utils/index.ts (confirmErrorToast) — its dismiss button. */
  toastOk: "OK",
  /** client/src/i18n/config.ts (localeNames) — each language named in itself. */
  localeNames: { en: "English", vi: "Tiếng Việt" },
  /** client/src/utils/index.ts (INVALID_DATE_DISPLAY) — a date that cannot be shown. */
  invalidDateDisplay: "—",
  /** client/src/dataSources/ContactAdmin (buildAdminContactColumns) — the Email cell of a request filed without one. */
  contactNoEmail: "—"
} as const;

/**
 * Text the server hardcodes outside its i18next catalogues (not translated per
 * request). Source in each comment.
 */
export const serverLiteral = {
  /** server/src/loaders/health.loader.ts — the success message of each probe. */
  health: {
    all: "All services are healthy",
    mongodb: "MongoDB is healthy",
    redis: "Redis is healthy"
  }
} as const;

/** The catalogues a sign-in screen reads: `copy` (en) or `copyVi`. */
export type LoginCopy = Pick<typeof copy, "login" | "common">;

export const serverMessageVi = {
  login: serverLoginVi,
  validation: serverValidationVi,
  common: serverCommonVi,
  user: serverUserVi,
  webApp: serverWebAppVi,
  category: serverCategoryVi
} as const;

/** Replaces `{name}` (next-intl) and `{{name}}` (i18next) placeholders. */
export function fill(
  message: string,
  values: Record<string, string | number>
): string {
  return message.replace(/\{\{?\s*(\w+)\s*\}?\}/g, (all, key: string) =>
    key in values ? String(values[key]) : all
  );
}

const escapeRegExp = (text: string) =>
  text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * A message as a RegExp: the text is matched literally, placeholders named in
 * `values` are filled, every other placeholder matches a number (`\d+`).
 * `exact` anchors it (`^…$`).
 *
 *   pattern(serverMessage.login.errors.otpCooldown, {}, { exact: true })
 *     → /^Please wait \d+ seconds before requesting a new OTP$/
 */
export function pattern(
  message: string,
  values: Record<string, string | number> = {},
  { exact = false }: { exact?: boolean } = {}
): RegExp {
  const source = message
    .split(/(\{\{?\s*\w+\s*\}?\})/)
    .map((part, i) => {
      if (i % 2 === 0) return escapeRegExp(part);
      const key = /\w+/.exec(part)![0];
      return key in values ? escapeRegExp(String(values[key])) : "\\d+";
    })
    .join("");
  return new RegExp(exact ? `^${source}$` : source);
}
