// types
import type { RedisClientType } from "redis";
import type { RateLimiterMiddleware } from "@/middlewares";
import type { AuthenticationService } from "@/modules/authentication/services";
import type { UserService } from "@/modules/user/services";
import type { SessionService } from "@/modules/session/services";
import type { LoginHistoryService } from "@/modules/login-history/services";
import type { RecentAppService } from "@/modules/recent-app/services";
// modules
import { MongoWebAppRepository } from "@/modules/web-app/repositories/impl/mongo-web-app.repository";
// others
import { RedisOAuthRepository } from "./repository/impl/redis-oauth.repository";
import { OAuthService } from "./services";
import { OAuthController } from "./oauth.controller";
import { createOAuthRoutes } from "./oauth.routes";

export const createOAuthModule = (
  redisClient: RedisClientType,
  sessionService: SessionService,
  authService: AuthenticationService,
  userService: UserService,
  loginHistoryService: LoginHistoryService,
  recentAppService: RecentAppService,
  rateLimiter: RateLimiterMiddleware
) => {
  const oauthRepo = new RedisOAuthRepository(redisClient);
  const webAppRepo = new MongoWebAppRepository();

  const service = new OAuthService({
    oauthRepo,
    webAppRepo,
    sessionService,
    authService,
    userService,
    loginHistoryService,
    recentAppService
  });

  const controller = new OAuthController(service);

  return {
    oauthService: service,
    oauthRouter: createOAuthRoutes(controller, rateLimiter)
  };
};
