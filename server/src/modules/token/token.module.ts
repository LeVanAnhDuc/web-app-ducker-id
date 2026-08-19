// types
import type { AuthenticationService } from "@/modules/authentication/authentication.service";
import type { UserService } from "@/modules/user/user.service";
// guards
import {
  RefreshTokenPresentGuard,
  RefreshTokenValidGuard,
  AuthActiveGuard,
  PasswordNotChangedGuard,
  UserExistsGuard
} from "./guards";
// others
import { TokenService } from "./token.service";
import { TokenController } from "./token.controller";
import { createTokenRoutes } from "./token.routes";

export const createTokenModule = (
  authService: AuthenticationService,
  userService: UserService
) => {
  const refreshTokenPresentGuard = new RefreshTokenPresentGuard();
  const refreshTokenValidGuard = new RefreshTokenValidGuard();
  const authActiveGuard = new AuthActiveGuard();
  const passwordNotChangedGuard = new PasswordNotChangedGuard();
  const userExistsGuard = new UserExistsGuard();

  const tokenService = new TokenService(
    authService,
    userService,
    refreshTokenPresentGuard,
    refreshTokenValidGuard,
    authActiveGuard,
    passwordNotChangedGuard,
    userExistsGuard
  );
  const tokenController = new TokenController(tokenService);

  return {
    tokenRouter: createTokenRoutes(tokenController),
    tokenService
  };
};
