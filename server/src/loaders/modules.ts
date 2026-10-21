// types
import type { Router } from "express";
import type { RedisClientType } from "redis";
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
import { RateLimiterMiddleware } from "@/middlewares";

export interface ModuleDeps {
  redis: RedisClientType;
  emailDispatcher: EmailDispatcher;
  notificationDispatcher: NotificationDispatcher;
}

export interface ModuleRouters {
  oauthRouter: Router;
  apiRouters: Router[];
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
  // --- Shared infrastructure ---
  const { authService } = createAuthenticationModule();
  const rateLimiter = new RateLimiterMiddleware(redisClient);
  const { sessionService } = createSessionModule(redisClient);

  // --- Module creation ---
  const { userRouter, userAdminRouter, userService } = createUserModule(
    rateLimiter,
    authService,
    emailDispatcher,
    notificationDispatcher
  );

  const {
    loginHistoryService,
    loginHistoryUserRouter,
    loginHistoryAdminRouter
  } = createLoginHistoryModule(notificationDispatcher);

  const { loginRouter, loginService } = createLoginModule(
    redisClient,
    userService,
    loginHistoryService,
    emailDispatcher,
    rateLimiter,
    sessionService,
    notificationDispatcher
  );

  const { signupRouter } = createSignupModule(
    redisClient,
    authService,
    userService,
    emailDispatcher,
    rateLimiter
  );

  const { tokenRouter, tokenService } = createTokenModule(
    redisClient,
    authService,
    userService
  );
  const { logoutRouter } = createLogoutModule(sessionService, tokenService);

  const { unlockAccountRouter } = createUnlockAccountModule(
    redisClient,
    authService,
    userService,
    loginHistoryService,
    loginService,
    emailDispatcher,
    rateLimiter
  );

  const { forgotPasswordRouter } = createForgotPasswordModule(
    redisClient,
    authService,
    userService,
    loginHistoryService,
    emailDispatcher,
    rateLimiter
  );

  const { changePasswordRouter } = createChangePasswordModule(
    authService,
    userService,
    emailDispatcher,
    notificationDispatcher,
    rateLimiter
  );

  const { contactAdminRouter, adminContactsRouter, myContactsRouter } =
    createContactAdminModule(rateLimiter);

  const { categoryRepository, categoryAdminRouter, categoryUserRouter } =
    createCategoryModule(rateLimiter);

  const { accessPolicy, entitlementAdminRouter } = createEntitlementModule(
    rateLimiter,
    notificationDispatcher
  );

  const { webAppAdminRouter, webAppUserRouter } = createWebAppModule(
    categoryRepository,
    accessPolicy,
    notificationDispatcher
  );

  const { notificationUserRouter } = createNotificationModule();

  const { favoriteRepository, favoriteUserRouter } =
    createFavoriteModule(accessPolicy);

  const { recentAppService, recentAppUserRouter } = createRecentAppModule(
    favoriteRepository,
    accessPolicy,
    rateLimiter
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
    apiRouters: [
      // Auth
      signupRouter,
      loginRouter,
      logoutRouter,
      tokenRouter,
      unlockAccountRouter,
      forgotPasswordRouter,
      changePasswordRouter,
      // User
      userRouter,
      userAdminRouter,
      loginHistoryUserRouter,
      loginHistoryAdminRouter,
      notificationUserRouter,
      favoriteUserRouter,
      recentAppUserRouter,
      // Contact
      contactAdminRouter,
      adminContactsRouter,
      myContactsRouter,
      // App Registry
      webAppAdminRouter,
      webAppUserRouter,
      categoryAdminRouter,
      categoryUserRouter,
      entitlementAdminRouter
    ]
  };
};
