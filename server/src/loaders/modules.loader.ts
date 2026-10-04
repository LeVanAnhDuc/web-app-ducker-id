// libs
import { Router } from "express";
// types
import type { Express } from "express";
import type { RedisClientType } from "redis";
import type { EmailDispatcher } from "@/services/email/email.dispatcher";
// database
import { instanceRedis } from "@/database/redis";
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
import { createWebAppModule } from "@/modules/web-app/web-app.module";
import { createUserModule } from "@/modules/user/user.module";
import { createNotificationModule } from "@/modules/notification/notification.module";
import { createFavoriteModule } from "@/modules/favorite/favorite.module";
import { createRecentAppModule } from "@/modules/recent-app/recent-app.module";
import { createSessionModule } from "@/modules/session/session.module";
import { createOAuthModule } from "@/modules/oauth/oauth.module";
// others
import { RateLimiterMiddleware } from "@/middlewares";
import { Logger } from "@/libs/logger";

interface ModuleRoutes {
  signup: Router;
  login: Router;
  logout: Router;
  token: Router;
  unlockAccount: Router;
  forgotPassword: Router;
  changePassword: Router;
  user: Router;
  userAdmin: Router;
  loginHistoryUser: Router;
  loginHistoryAdmin: Router;
  notification: Router;
  favorite: Router;
  recentApp: Router;
  contact: Router;
  contactAdmin: Router;
  myContacts: Router;
  webAppAdmin: Router;
  webAppUser: Router;
}

/**
 * Router OAuth mount THẲNG lên app, không qua `/api/v1`.
 *
 * OIDC Discovery bắt buộc `/.well-known/openid-configuration` nằm ở gốc
 * origin, và `/oauth/*` là đường dẫn công khai mà app vệ tinh cấu hình cứng —
 * đổi prefix là phá hợp đồng với mọi client đã đăng ký.
 */
const mountOAuthRoutes = (app: Express, oauthRouter: Router): void => {
  app.use(oauthRouter);
};

const mountRoutes = (app: Express, routes: ModuleRoutes): void => {
  const v1Router = Router();

  // Auth
  v1Router.use(routes.signup);
  v1Router.use(routes.login);
  v1Router.use(routes.logout);
  v1Router.use(routes.token);
  v1Router.use(routes.unlockAccount);
  v1Router.use(routes.forgotPassword);
  v1Router.use(routes.changePassword);

  // User
  v1Router.use(routes.user);
  v1Router.use(routes.userAdmin);
  v1Router.use(routes.loginHistoryUser);
  v1Router.use(routes.loginHistoryAdmin);
  v1Router.use(routes.notification);
  v1Router.use(routes.favorite);
  v1Router.use(routes.recentApp);

  // Contact
  v1Router.use(routes.contact);
  v1Router.use(routes.contactAdmin);
  v1Router.use(routes.myContacts);

  // App Registry
  v1Router.use(routes.webAppAdmin);
  v1Router.use(routes.webAppUser);

  app.use("/api/v1", v1Router);
};

export const loadModules = (
  app: Express,
  emailDispatcher: EmailDispatcher
): void => {
  const redisClient = instanceRedis.getClient() as RedisClientType;

  // --- Shared infrastructure ---
  const { authService } = createAuthenticationModule();
  const rateLimiter = new RateLimiterMiddleware(redisClient);
  const { sessionService } = createSessionModule(redisClient);

  // --- Module creation ---
  const { userRouter, userAdminRouter, userService } = createUserModule(
    rateLimiter,
    authService,
    emailDispatcher
  );

  const {
    loginHistoryService,
    loginHistoryUserRouter,
    loginHistoryAdminRouter
  } = createLoginHistoryModule();

  const { loginRouter, loginService } = createLoginModule(
    redisClient,
    userService,
    loginHistoryService,
    emailDispatcher,
    rateLimiter,
    sessionService
  );

  const { signupRouter } = createSignupModule(
    redisClient,
    authService,
    userService,
    emailDispatcher,
    rateLimiter
  );

  const { logoutRouter } = createLogoutModule(sessionService);
  const { tokenRouter } = createTokenModule(authService, userService);

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
    rateLimiter
  );

  const { contactAdminRouter, adminContactsRouter, myContactsRouter } =
    createContactAdminModule(rateLimiter);

  const { webAppAdminRouter, webAppUserRouter } =
    createWebAppModule(rateLimiter);

  const { notificationUserRouter } = createNotificationModule();

  const { favoriteRepository, favoriteUserRouter } = createFavoriteModule();

  const { recentAppService, recentAppUserRouter } = createRecentAppModule(
    favoriteRepository,
    rateLimiter
  );

  const { oauthRouter } = createOAuthModule(
    redisClient,
    sessionService,
    authService,
    userService,
    loginHistoryService,
    recentAppService,
    rateLimiter
  );

  // --- Route mounting ---
  mountOAuthRoutes(app, oauthRouter);

  mountRoutes(app, {
    signup: signupRouter,
    login: loginRouter,
    logout: logoutRouter,
    token: tokenRouter,
    unlockAccount: unlockAccountRouter,
    forgotPassword: forgotPasswordRouter,
    changePassword: changePasswordRouter,
    user: userRouter,
    userAdmin: userAdminRouter,
    loginHistoryUser: loginHistoryUserRouter,
    loginHistoryAdmin: loginHistoryAdminRouter,
    notification: notificationUserRouter,
    favorite: favoriteUserRouter,
    recentApp: recentAppUserRouter,
    contact: contactAdminRouter,
    contactAdmin: adminContactsRouter,
    myContacts: myContactsRouter,
    webAppAdmin: webAppAdminRouter,
    webAppUser: webAppUserRouter
  });

  Logger.info("Modules loaded and routes mounted successfully");
};
