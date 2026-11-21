// types
import type { RateLimiters } from "@/middlewares/common/rate-limiter.middleware";
import type { NotificationDispatcher } from "@/services/notification/notification.dispatcher";
import type { EmailDispatcher } from "@/services/email/email.dispatcher";
import type { AuthenticationService } from "@/modules/authentication/services";
import type { RedisClientType } from "redis";
import type { UserService } from "@/modules/user/services";
import type { LoginHistoryService } from "@/modules/login-history/services";
import type { SessionService } from "@/modules/session/services";
// modules
import { createSignupModule } from "@/modules/signup/signup.module";
import { createLoginModule } from "@/modules/login/login.module";
import { createLogoutModule } from "@/modules/logout/logout.module";
import { createTokenModule } from "@/modules/token/token.module";
import { createUnlockAccountModule } from "@/modules/unlock-account/unlock-account.module";
import { createForgotPasswordModule } from "@/modules/forgot-password/forgot-password.module";
import { createChangePasswordModule } from "@/modules/change-password/change-password.module";
import { createCategoryModule } from "@/modules/category/category.module";
import { createContactAdminModule } from "@/modules/contact-admin/contact-admin.module";
import { createEntitlementModule } from "@/modules/entitlement/entitlement.module";
import { createUserModule } from "@/modules/user/user.module";
import { createWebAppModule } from "@/modules/web-app/web-app.module";
import { createFavoriteModule } from "@/modules/favorite/favorite.module";
import { createLoginHistoryModule } from "@/modules/login-history/login-history.module";
import { createNotificationModule } from "@/modules/notification/notification.module";
import { createRecentAppModule } from "@/modules/recent-app/recent-app.module";
// others
import { describeRoutes } from "../mount";

type Row = [
  method: string,
  path: string,
  chain: string,
  status: string,
  message: string,
  action: string
];

// Appendix A of docs/specs/routing-controllers/plan.md: all 63 routes. A route
// with no middleware has chain "" here (Appendix A shows it as a dash).
const EXPECTED: Row[] = [
  [
    "POST",
    "/api/v1/auth/signup/send-otp",
    "rl:signupOtpByIp > rl:signupOtpByEmail > body:SendOtpBodyDto",
    "OK",
    "signup:success.otpSent",
    "sendOtp"
  ],
  [
    "POST",
    "/api/v1/auth/signup/verify-otp",
    "body:VerifyOtpBodyDto",
    "OK",
    "signup:success.otpVerified",
    "verifyOtp"
  ],
  [
    "POST",
    "/api/v1/auth/signup/resend-otp",
    "rl:signupOtpByIp > rl:signupOtpByEmail > body:ResendOtpBodyDto",
    "OK",
    "signup:success.otpResent",
    "resendOtp"
  ],
  [
    "POST",
    "/api/v1/auth/signup/complete",
    "body:CompleteSignupBodyDto",
    "CREATED",
    "signup:success.signupCompleted",
    "completeSignup"
  ],
  [
    "GET",
    "/api/v1/auth/signup/check-email/:email",
    "rl:checkEmailByIp > params:CheckEmailParamsDto",
    "OK",
    "—",
    "checkEmail"
  ],
  [
    "POST",
    "/api/v1/auth/login",
    "rl:loginByIp > body:LoginBodyDto",
    "OK",
    "login:success.loginSuccessful",
    "login"
  ],
  [
    "POST",
    "/api/v1/auth/login/otp/send",
    "rl:loginOtpByIp > rl:loginOtpByEmail > body:OtpSendBodyDto",
    "OK",
    "login:success.otpSent",
    "sendOtp"
  ],
  [
    "POST",
    "/api/v1/auth/login/otp/verify",
    "rl:loginByIp > body:OtpVerifyBodyDto",
    "OK",
    "login:success.loginSuccessful",
    "verifyOtp"
  ],
  [
    "POST",
    "/api/v1/auth/login/magic-link/send",
    "rl:magicLinkByIp > rl:magicLinkByEmail > body:MagicLinkSendBodyDto",
    "OK",
    "login:success.magicLinkSent",
    "sendMagicLink"
  ],
  [
    "POST",
    "/api/v1/auth/login/magic-link/verify",
    "rl:loginByIp > body:MagicLinkVerifyBodyDto",
    "OK",
    "login:success.loginSuccessful",
    "verifyMagicLink"
  ],
  [
    "POST",
    "/api/v1/auth/logout",
    "passwordChangeAuth",
    "NO_CONTENT",
    "—",
    "logout"
  ],
  [
    "POST",
    "/api/v1/auth/token/refresh",
    "",
    "OK",
    "login:success.tokenRefreshed",
    "refreshToken"
  ],
  [
    "POST",
    "/api/v1/auth/unlock/request",
    "body:UnlockRequestBodyDto",
    "OK",
    "unlockAccount:success.unlockEmailSent",
    "unlockRequest"
  ],
  [
    "POST",
    "/api/v1/auth/unlock/verify",
    "rl:loginByIp > body:UnlockVerifyBodyDto",
    "OK",
    "unlockAccount:success.accountUnlocked",
    "unlockVerify"
  ],
  [
    "POST",
    "/api/v1/auth/forgot-password/otp/send",
    "rl:forgotPasswordOtpByIp > rl:forgotPasswordOtpByEmail > body:OtpSendBodyDto",
    "OK",
    "forgotPassword:success.otpSent",
    "sendOtp"
  ],
  [
    "POST",
    "/api/v1/auth/forgot-password/otp/verify",
    "rl:forgotPasswordOtpByIp > body:OtpVerifyBodyDto",
    "OK",
    "forgotPassword:success.otpVerified",
    "verifyOtp"
  ],
  [
    "POST",
    "/api/v1/auth/forgot-password/magic-link/send",
    "rl:forgotPasswordMagicLinkByIp > rl:forgotPasswordMagicLinkByEmail > body:MagicLinkSendBodyDto",
    "OK",
    "forgotPassword:success.magicLinkSent",
    "sendMagicLink"
  ],
  [
    "POST",
    "/api/v1/auth/forgot-password/magic-link/verify",
    "rl:forgotPasswordMagicLinkByIp > body:MagicLinkVerifyBodyDto",
    "OK",
    "forgotPassword:success.magicLinkVerified",
    "verifyMagicLink"
  ],
  [
    "POST",
    "/api/v1/auth/forgot-password/reset",
    "rl:forgotPasswordResetByIp > body:ResetPasswordBodyDto",
    "OK",
    "forgotPassword:success.passwordReset",
    "resetPassword"
  ],
  [
    "PATCH",
    "/api/v1/auth/change-password",
    "passwordChangeAuth > rl:changePasswordByIpAndUser > body:ChangePasswordBodyDto",
    "OK",
    "changePassword:success.passwordChanged",
    "changePassword"
  ],
  [
    "GET",
    "/api/v1/users/me",
    "auth",
    "OK",
    "user:success.getProfile",
    "getMyProfile"
  ],
  [
    "PATCH",
    "/api/v1/users/me",
    "rl:updateProfileByIp > auth > body:UpdateProfileBodyDto",
    "OK",
    "user:success.updateProfile",
    "updateMyProfile"
  ],
  [
    "GET",
    "/api/v1/users/:id",
    "params:PublicProfileParamsDto",
    "OK",
    "user:success.getPublicProfile",
    "getPublicProfile"
  ],
  [
    "GET",
    "/api/v1/admin/users",
    "auth > admin > query:AdminUsersQueryDto",
    "OK",
    "user:success.getAdminUsers",
    "getAdminUsers"
  ],
  [
    "PATCH",
    "/api/v1/admin/users/:id/lock",
    "auth > admin > rl:adminUserMutationByIpAndUser > params:AdminUserIdParamsDto",
    "OK",
    "user:success.lockUser",
    "lockUser"
  ],
  [
    "PATCH",
    "/api/v1/admin/users/:id/unlock",
    "auth > admin > rl:adminUserMutationByIpAndUser > params:AdminUserIdParamsDto",
    "OK",
    "user:success.unlockUser",
    "unlockUser"
  ],
  [
    "POST",
    "/api/v1/admin/users/:id/reset-password",
    "auth > admin > rl:adminUserMutationByIpAndUser > params:AdminUserIdParamsDto",
    "OK",
    "user:success.resetPassword",
    "resetUserPassword"
  ],
  [
    "GET",
    "/api/v1/login-history/stats",
    "auth > query:LoginHistoryStatsQueryDto",
    "OK",
    "loginHistory:success.getMyStats",
    "getMyStats"
  ],
  [
    "GET",
    "/api/v1/login-history",
    "auth > query:LoginHistoryQueryDto",
    "OK",
    "loginHistory:success.getMyHistory",
    "getMyHistory"
  ],
  [
    "GET",
    "/api/v1/admin/login-history",
    "auth > admin > query:LoginHistoryAdminQueryDto",
    "OK",
    "loginHistory:success.getAllHistory",
    "getAllHistory"
  ],
  [
    "GET",
    "/api/v1/admin/login-history/:id",
    "auth > admin > params:LoginHistoryIdParamsDto",
    "OK",
    "loginHistory:success.getHistoryDetail",
    "getHistoryDetail"
  ],
  [
    "GET",
    "/api/v1/notifications/unread-count",
    "auth",
    "OK",
    "notification:success.unreadCount",
    "unreadCount"
  ],
  [
    "PATCH",
    "/api/v1/notifications/read-all",
    "auth",
    "OK",
    "notification:success.markAllRead",
    "markAllRead"
  ],
  [
    "GET",
    "/api/v1/notifications",
    "auth > query:NotificationListQueryDto",
    "OK",
    "notification:success.list",
    "list"
  ],
  [
    "PATCH",
    "/api/v1/notifications/:id/read",
    "auth > params:NotificationIdParamsDto",
    "OK",
    "notification:success.markRead",
    "markRead"
  ],
  [
    "GET",
    "/api/v1/users/me/favorites",
    "auth > query:ListFavoritesQueryDto",
    "OK",
    "favorite:success.list",
    "list"
  ],
  [
    "POST",
    "/api/v1/users/me/favorites/:appId",
    "auth > params:FavoriteAppIdParamsDto",
    "CREATED",
    "favorite:success.add",
    "add"
  ],
  [
    "DELETE",
    "/api/v1/users/me/favorites/:appId",
    "auth > params:FavoriteAppIdParamsDto",
    "NO_CONTENT",
    "—",
    "remove"
  ],
  [
    "GET",
    "/api/v1/users/me/recent-apps",
    "auth > query:ListRecentAppsQueryDto",
    "OK",
    "recentApp:success.list",
    "list"
  ],
  [
    "GET",
    "/api/v1/users/me/recent-apps/stats",
    "auth > query:RecentAppsStatsQueryDto",
    "OK",
    "recentApp:success.stats",
    "stats"
  ],
  [
    "DELETE",
    "/api/v1/users/me/recent-apps",
    "auth",
    "NO_CONTENT",
    "—",
    "clear"
  ],
  [
    "POST",
    "/api/v1/users/me/recent-apps/:appId",
    "auth > rl:recordRecentAppByUser > params:RecentAppIdParamsDto",
    "NO_CONTENT",
    "—",
    "record"
  ],
  [
    "DELETE",
    "/api/v1/users/me/recent-apps/:appId",
    "auth > params:RecentAppIdParamsDto",
    "NO_CONTENT",
    "—",
    "hide"
  ],
  [
    "POST",
    "/api/v1/users/me/recent-apps/:appId/restore",
    "auth > params:RecentAppIdParamsDto",
    "NO_CONTENT",
    "—",
    "restore"
  ],
  [
    "POST",
    "/api/v1/contact/submit",
    "rl:contactByIp > optionalAuth > body:SubmitContactBodyDto",
    "CREATED",
    "contactAdmin:success.submitted",
    "submit"
  ],
  [
    "GET",
    "/api/v1/admin/contacts",
    "auth > admin > query:AdminContactsQueryDto",
    "OK",
    "contactAdmin:success.getContactList",
    "getContactList"
  ],
  [
    "GET",
    "/api/v1/admin/contacts/:id",
    "auth > admin > params:ContactIdParamsDto",
    "OK",
    "contactAdmin:success.getContactDetail",
    "getContactDetail"
  ],
  [
    "PATCH",
    "/api/v1/admin/contacts/:id/status",
    "auth > admin > params:ContactIdParamsDto > body:UpdateContactStatusBodyDto",
    "OK",
    "contactAdmin:success.updateContactStatus",
    "updateContactStatus"
  ],
  [
    "GET",
    "/api/v1/contacts",
    "auth > query:MyContactsQueryDto",
    "OK",
    "contactAdmin:success.getMyContacts",
    "getMyContacts"
  ],
  [
    "GET",
    "/api/v1/contacts/:id",
    "auth > params:ContactIdParamsDto",
    "OK",
    "contactAdmin:success.getMyContactDetail",
    "getMyContactDetail"
  ],
  [
    "GET",
    "/api/v1/admin/apps",
    "auth > admin > query:AdminAppsQueryDto",
    "OK",
    "webApp:success.listApps",
    "listApps"
  ],
  [
    "POST",
    "/api/v1/admin/apps",
    "auth > admin > body:CreateAppBodyDto",
    "CREATED",
    "webApp:success.createApp",
    "createApp"
  ],
  [
    "PATCH",
    "/api/v1/admin/apps/:id",
    "auth > admin > params:AppIdParamsDto > body:UpdateAppBodyDto",
    "OK",
    "webApp:success.updateApp",
    "updateApp"
  ],
  [
    "GET",
    "/api/v1/apps",
    "auth > query:UserAppsQueryDto",
    "OK",
    "webApp:success.listApps",
    "listUserApps"
  ],
  [
    "GET",
    "/api/v1/admin/categories",
    "auth > admin",
    "OK",
    "category:success.list",
    "list"
  ],
  [
    "POST",
    "/api/v1/admin/categories",
    "auth > admin > rl:categoryMutationByIpAndUser > body:CreateCategoryBodyDto",
    "CREATED",
    "category:success.create",
    "create"
  ],
  [
    "PATCH",
    "/api/v1/admin/categories/:id",
    "auth > admin > rl:categoryMutationByIpAndUser > params:CategoryIdParamsDto > body:UpdateCategoryBodyDto",
    "OK",
    "category:success.update",
    "update"
  ],
  [
    "POST",
    "/api/v1/admin/categories/:id/move",
    "auth > admin > rl:categoryMutationByIpAndUser > params:CategoryIdParamsDto > body:MoveCategoryBodyDto",
    "OK",
    "category:success.move",
    "move"
  ],
  [
    "GET",
    "/api/v1/admin/categories/:id/delete-impact",
    "auth > admin > params:CategoryIdParamsDto",
    "OK",
    "category:success.deleteImpact",
    "deleteImpact"
  ],
  [
    "DELETE",
    "/api/v1/admin/categories/:id",
    "auth > admin > rl:categoryMutationByIpAndUser > params:CategoryIdParamsDto > body:DeleteCategoryBodyDto",
    "NO_CONTENT",
    "—",
    "remove"
  ],
  [
    "GET",
    "/api/v1/apps/categories",
    "rl:categoriesByIp > optionalAuth",
    "OK",
    "category:success.list",
    "listPublic"
  ],
  [
    "GET",
    "/api/v1/admin/entitlements",
    "auth > admin > query:EntitlementMatrixQueryDto",
    "OK",
    "entitlement:success.get",
    "getMatrix"
  ],
  [
    "PATCH",
    "/api/v1/admin/entitlements",
    "auth > admin > rl:entitlementMutationByIpAndUser > body:UpdateEntitlementsBodyDto",
    "OK",
    "entitlement:success.update",
    "updateMatrix"
  ]
];

// Limiters are only named by the manifest, never called.
const rl = {} as unknown as RateLimiters;

describe("route manifest", () => {
  it("matches Appendix A for every module", () => {
    const notificationDispatcher = {} as NotificationDispatcher;
    const redis = {} as RedisClientType;
    const authService = {} as AuthenticationService;
    const userService = {} as UserService;
    const loginHistoryService = {} as LoginHistoryService;
    const emailDispatcher = {} as EmailDispatcher;
    const { signupController } = createSignupModule(
      redis,
      authService,
      userService,
      emailDispatcher
    );
    const { loginController, loginService } = createLoginModule(
      redis,
      userService,
      loginHistoryService,
      emailDispatcher,
      {} as SessionService,
      notificationDispatcher
    );
    const { tokenController, tokenService } = createTokenModule(
      redis,
      authService,
      userService
    );
    const { logoutController } = createLogoutModule(
      {} as SessionService,
      tokenService
    );
    const { unlockAccountController } = createUnlockAccountModule(
      redis,
      authService,
      userService,
      loginHistoryService,
      loginService,
      emailDispatcher
    );
    const { forgotPasswordController } = createForgotPasswordModule(
      redis,
      authService,
      userService,
      loginHistoryService,
      emailDispatcher
    );
    const { changePasswordController } = createChangePasswordModule(
      authService,
      userService,
      emailDispatcher,
      notificationDispatcher
    );
    const { userController, userAdminController } = createUserModule(
      {} as AuthenticationService,
      {} as EmailDispatcher,
      notificationDispatcher
    );
    const { loginHistoryController, loginHistoryAdminController } =
      createLoginHistoryModule(notificationDispatcher);
    const { contactController, adminContactsController, myContactsController } =
      createContactAdminModule();
    const { categoryRepository, categoryAdminController, categoryController } =
      createCategoryModule();
    const { accessPolicy, entitlementAdminController } =
      createEntitlementModule(notificationDispatcher);
    const { webAppAdminController, webAppController } = createWebAppModule(
      categoryRepository,
      accessPolicy,
      notificationDispatcher
    );
    const { notificationController } = createNotificationModule();
    const { favoriteController, favoriteRepository } =
      createFavoriteModule(accessPolicy);
    const { recentAppController } = createRecentAppModule(
      favoriteRepository,
      accessPolicy
    );
    const controllers = [
      signupController,
      loginController,
      logoutController,
      tokenController,
      unlockAccountController,
      forgotPasswordController,
      changePasswordController,
      userController,
      userAdminController,
      loginHistoryController,
      loginHistoryAdminController,
      notificationController,
      favoriteController,
      recentAppController,
      contactController,
      adminContactsController,
      myContactsController,
      webAppAdminController,
      webAppController,
      categoryAdminController,
      categoryController,
      entitlementAdminController
    ];
    const rows = describeRoutes(controllers, rl).map(
      ({ method, path, chain, status, message, action }): Row => [
        method,
        path,
        chain,
        status,
        message,
        action
      ]
    );

    expect(rows).toHaveLength(63);
    expect(rows).toEqual(EXPECTED);

    // Route precedence is controller order: it must stay the order the
    // hand-assembled routers were mounted in.
    expect(
      controllers.map((controller) => controller.constructor.name)
    ).toEqual([
      "SignupController",
      "LoginController",
      "LogoutController",
      "TokenController",
      "UnlockAccountController",
      "ForgotPasswordController",
      "ChangePasswordController",
      "UserController",
      "UserAdminController",
      "LoginHistoryController",
      "LoginHistoryAdminController",
      "NotificationController",
      "FavoriteController",
      "RecentAppController",
      "ContactController",
      "AdminContactsController",
      "MyContactsController",
      "WebAppAdminController",
      "WebAppController",
      "CategoryAdminController",
      "CategoryController",
      "EntitlementAdminController"
    ]);
  });

  it("GET /users/me is registered before GET /users/:id", () => {
    const { userController } = createUserModule(
      {} as AuthenticationService,
      {} as EmailDispatcher,
      {} as NotificationDispatcher
    );
    const paths = describeRoutes([userController], rl).map(
      ({ method, path }) => `${method} ${path}`
    );

    expect(paths.indexOf("GET /api/v1/users/me")).toBeGreaterThanOrEqual(0);
    expect(paths.indexOf("GET /api/v1/users/me")).toBeLessThan(
      paths.indexOf("GET /api/v1/users/:id")
    );
  });
});
