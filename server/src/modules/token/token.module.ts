// types
import type { RedisClientType } from "redis";
import type { AuthenticationService } from "@/modules/authentication/services";
import type { UserService } from "@/modules/user/services";
// repositories
import { RedisRevokedRefreshTokenRepository } from "./repository/impl/redis-revoked-refresh-token.repository";
// guards
import {
  RefreshTokenPresentGuard,
  RefreshTokenValidGuard,
  RefreshTokenNotRevokedGuard,
  AuthActiveGuard,
  PasswordNotChangedGuard,
  UserExistsGuard
} from "./guards";
// others
import { TokenService } from "./services";
import { TokenController } from "./token.controller";
import { createTokenRoutes } from "./token.routes";

export const createTokenModule = (
  redisClient: RedisClientType,
  authService: AuthenticationService,
  userService: UserService
) => {
  const revokedRefreshTokenRepo = new RedisRevokedRefreshTokenRepository(
    redisClient
  );

  const tokenService = new TokenService({
    authService,
    userService,
    revokedRefreshTokenRepo,
    refreshTokenPresentGuard: new RefreshTokenPresentGuard(),
    refreshTokenValidGuard: new RefreshTokenValidGuard(),
    refreshTokenNotRevokedGuard: new RefreshTokenNotRevokedGuard(
      revokedRefreshTokenRepo
    ),
    authActiveGuard: new AuthActiveGuard(),
    passwordNotChangedGuard: new PasswordNotChangedGuard(),
    userExistsGuard: new UserExistsGuard()
  });
  const tokenController = new TokenController(tokenService);

  return {
    tokenRouter: createTokenRoutes(tokenController),
    tokenService
  };
};
