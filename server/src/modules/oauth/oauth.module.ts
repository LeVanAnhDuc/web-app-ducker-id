// types
import type { RedisClientType } from "redis";
import type { RateLimiterMiddleware } from "@/middlewares";
import type { AuthenticationService } from "@/modules/authentication/service";
import type { UserService } from "@/modules/user/user.service";
import type { SessionService } from "@/modules/session/service";
// modules
import { MongoWebAppRepository } from "@/modules/web-app/repositories";
// others
import { RedisOAuthRepository } from "./oauth.repository";
import { OAuthService } from "./oauth.service";
import { OAuthController } from "./oauth.controller";
import { createOAuthRoutes } from "./oauth.routes";

export const createOAuthModule = (
  redisClient: RedisClientType,
  sessionService: SessionService,
  authService: AuthenticationService,
  userService: UserService,
  rateLimiter: RateLimiterMiddleware
) => {
  const oauthRepo = new RedisOAuthRepository(redisClient);
  const webAppRepo = new MongoWebAppRepository();

  const service = new OAuthService(
    oauthRepo,
    webAppRepo,
    sessionService,
    authService,
    userService
  );

  const controller = new OAuthController(service);

  return {
    oauthService: service,
    oauthRouter: createOAuthRoutes(controller, rateLimiter)
  };
};
