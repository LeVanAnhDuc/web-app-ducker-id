import type { APIRequestContext } from "@playwright/test";
import { createAdminEntitlementsClient } from "./admin-entitlements.client";
import { createAdminUsersClient } from "./admin-users.client";
import { createAuthClient } from "./auth.client";
import { bearerHeaders, createBaseClient, type Session } from "./base.client";
import { createCategoryClient } from "./category.client";
import { createNotificationsClient } from "./notifications.client";
import { createChangePasswordClient } from "./change-password.client";
import { createForgotPasswordClient } from "./forgot-password.client";
import { createWebAppClient } from "./web-app.client";
import { createFavoriteClient } from "./favorite.client";
import { createRecentAppClient } from "./recent-app.client";
import { createAdminAppsClient } from "./admin-apps.client";
import { createAdminCategoriesClient } from "./admin-categories.client";
import { createAdminLoginHistoryClient } from "./admin-login-history.client";
import { createLoginHistoryClient } from "./login-history.client";
import { createUserClient } from "./user.client";
import { createOAuthClient } from "./oauth.client";
import { createContactClient } from "./contact.client";

// One namespace per resource. Anonymous endpoints sit at the top level;
// endpoints that need a login sit under as(session). Never spread clients
// flat: two resources with a list() would silently overwrite each other.
export function createApiClient(request: APIRequestContext) {
  const base = createBaseClient(request);
  return {
    /** Escape hatch for an endpoint that has no client method yet. */
    call: base.call,
    auth: createAuthClient(base),
    /** Top level for a context that already carries a Bearer (adminApi), or to prove the guards. */
    adminUsers: createAdminUsersClient(base),
    /** Admin only: use on adminApi, or on userApi / guestApi to prove the guards. */
    adminEntitlements: createAdminEntitlementsClient(base),
    /** GET /apps needs a Bearer: use on userApi / adminApi, or bare to prove the guard. */
    webApps: createWebAppClient(base),
    /** Public list (optional Bearer). */
    categories: createCategoryClient(base),
    /** Needs a Bearer: use on userApi, or bare to prove the guard. */
    recentApps: createRecentAppClient(base),
    /** Needs a Bearer: use on userApi, or bare to prove the guard. */
    favorites: createFavoriteClient(base),
    forgotPassword: createForgotPasswordClient(base),
    /** Needs a Bearer: as(session).changePassword, or bare to prove the guard. */
    changePassword: createChangePasswordClient(base),
    /** Needs a Bearer: as(session).notifications, or bare to prove the guard. */
    notifications: createNotificationsClient(base),
    /** Admin only: use on adminApi, or on userApi / guestApi to prove the guards. */
    adminApps: createAdminAppsClient(base),
    /** Admin only: use on adminApi, or on userApi / guestApi to prove the guards. */
    adminCategories: createAdminCategoriesClient(base),
    /** Admin only: use on adminApi, or on userApi / guestApi to prove the guards. */
    adminLoginHistory: createAdminLoginHistoryClient(base),
    /** The caller's own /login-history (+ /stats): use on userApi, or bare to prove the guard. */
    loginHistory: createLoginHistoryClient(base),
    /** /users/me needs a Bearer: as(session).users or on userApi; GET /users/:id is public. */
    users: createUserClient(base),
    /** OpenID provider at the origin root (/oauth/*, /.well-known/*) — not under the API prefix. */
    oauth: createOAuthClient(base),
    /** POST /contact/submit is public (optional Bearer); /contacts* need one: userApi or as(session). */
    contact: createContactClient(base),
    as(session: Session) {
      const authed = createBaseClient(request, {
        headers: bearerHeaders(session)
      });
      return {
        call: authed.call,
        notifications: createNotificationsClient(authed),
        auth: createAuthClient(authed),
        adminUsers: createAdminUsersClient(authed),
        adminEntitlements: createAdminEntitlementsClient(authed),
        webApps: createWebAppClient(authed),
        categories: createCategoryClient(authed),
        recentApps: createRecentAppClient(authed),
        favorites: createFavoriteClient(authed),
        changePassword: createChangePasswordClient(authed),
        adminApps: createAdminAppsClient(authed),
        adminCategories: createAdminCategoriesClient(authed),
        adminLoginHistory: createAdminLoginHistoryClient(authed),
        loginHistory: createLoginHistoryClient(authed),
        users: createUserClient(authed),
        contact: createContactClient(authed)
      };
    }
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
export type { Session } from "./base.client";
