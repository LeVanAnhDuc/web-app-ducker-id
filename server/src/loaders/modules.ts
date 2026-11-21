// types
import type { Router } from "express";
import type { RedisClientType } from "redis";
import type { RateLimiters } from "@/middlewares/common/rate-limiter.middleware";
import type { EmailDispatcher } from "@/services/email/email.dispatcher";
import type { NotificationDispatcher } from "@/services/notification/notification.dispatcher";
// modules
import { createAuthenticationModule } from "@/modules/authentication/authentication.module";
import { createLoginHistoryModule } from "@/modules/login-history/login-history.module";
import { createLoginModule } from "@/modules/login/login.module";
import { createSignupModule } from "@/modules/signup/signup.module";
import { createLogoutModule } from "@/modules/logout/logout.module";
import { createTokenModule } from "@/modules/token/token.module";
import { createUnlockAccountModule } from "@/modules/unlock-account/unlock-account.module";
import { createForgotPasswordModule } from "@/modules/forgot-password/forgot-password.module";
import { createChangePasswordModule } from "@/modules/change-password/change-password.module";
import { createContactAdminModule } from "@/modules/contact-admin/contact-admin.module";
import { createCategoryModule } from "@/modules/category/category.module";
import { createEntitlementModule } from "@/modules/entitlement/entitlement.module";
import { createWebAppModule } from "@/modules/web-app/web-app.module";
import { createUserModule } from "@/modules/user/user.module";
import { createNotificationModule } from "@/modules/notification/notification.module";
import { createFavoriteModule } from "@/modules/favorite/favorite.module";
import { createRecentAppModule } from "@/modules/recent-app/recent-app.module";
import { createSessionModule } from "@/modules/session/session.module";
import { createOAuthModule } from "@/modules/oauth/oauth.module";
// others
import { createRateLimiters } from "@/middlewares";

export interface ModuleDeps {
  redis: RedisClientType;
  emailDispatcher: EmailDispatcher;
  notificationDispatcher: NotificationDispatcher;
}

export interface ModuleRouters {
  oauthRouter: Router;
  apiRouters: Router[];
  /** Annotated controllers, in `apiRouters` order; both coexist until every module has moved. */
  controllers: object[];
  rateLimiters: RateLimiters;
}

/**
 * Calls every module factory in dependency order — a module is built only
 * after the services it takes exist — and returns their routers unmounted.
 */
export const createModules = ({
  redis: redisClient,
  emailDispatcher,
  notificationDispatcher
}: ModuleDeps): ModuleRouters => {
  const { authService } = createAuthenticationModule();
  const rateLimiter = createRateLimiters(redisClient);
  const { sessionService } = createSessionModule(redisClient);

  const { userController, userAdminController, userService } = createUserModule(
    authService,
    emailDispatcher,
    notificationDispatcher
  );

  const {
    loginHistoryService,
    loginHistoryController,
    loginHistoryAdminController
  } = createLoginHistoryModule(notificationDispatcher);

  const { loginController, loginService } = createLoginModule(
    redisClient,
    userService,
    loginHistoryService,
    emailDispatcher,
    sessionService,
    notificationDispatcher
  );

  const { signupController } = createSignupModule(
    redisClient,
    authService,
    userService,
    emailDispatcher
  );

  const { tokenController, tokenService } = createTokenModule(
    redisClient,
    authService,
    userService
  );
  const { logoutController } = createLogoutModule(sessionService, tokenService);

  const { unlockAccountController } = createUnlockAccountModule(
    redisClient,
    authService,
    userService,
    loginHistoryService,
    loginService,
    emailDispatcher
  );

  const { forgotPasswordController } = createForgotPasswordModule(
    redisClient,
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

  const { contactController, adminContactsController, myContactsController } =
    createContactAdminModule();

  const { categoryRepository, categoryAdminController, categoryController } =
    createCategoryModule();

  const { accessPolicy, entitlementAdminController } = createEntitlementModule(
    notificationDispatcher
  );

  const { webAppAdminController, webAppController } = createWebAppModule(
    categoryRepository,
    accessPolicy,
    notificationDispatcher
  );

  const { notificationController } = createNotificationModule();

  const { favoriteRepository, favoriteController } =
    createFavoriteModule(accessPolicy);

  const { recentAppService, recentAppController } = createRecentAppModule(
    favoriteRepository,
    accessPolicy
  );

  const { oauthRouter } = createOAuthModule(
    redisClient,
    sessionService,
    authService,
    userService,
    loginHistoryService,
    recentAppService,
    accessPolicy,
    rateLimiter
  );

  return {
    oauthRouter,
    // Every /api/v1 module is an annotated controller now; Task 6 drops this.
    apiRouters: [],
    controllers: [
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
      contactController,
      adminContactsController,
      myContactsController,
      webAppAdminController,
      webAppController,
      categoryAdminController,
      categoryController,
      entitlementAdminController,
      notificationController,
      recentAppController,
      favoriteController
    ],
    rateLimiters: rateLimiter
  };
};
