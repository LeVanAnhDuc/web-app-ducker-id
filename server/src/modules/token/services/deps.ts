// types
import type { AuthenticationService } from "@/modules/authentication/services";
import type { UserService } from "@/modules/user/services";
import type { RevokedRefreshTokenRepository } from "../repository/revoked-refresh-token.repository";
import type {
  RefreshTokenPresentGuard,
  RefreshTokenValidGuard,
  RefreshTokenNotRevokedGuard,
  AuthActiveGuard,
  PasswordNotChangedGuard,
  UserExistsGuard
} from "../guards";

export interface TokenServiceDeps {
  authService: AuthenticationService;
  userService: UserService;
  revokedRefreshTokenRepo: RevokedRefreshTokenRepository;
  refreshTokenPresentGuard: RefreshTokenPresentGuard;
  refreshTokenValidGuard: RefreshTokenValidGuard;
  refreshTokenNotRevokedGuard: RefreshTokenNotRevokedGuard;
  authActiveGuard: AuthActiveGuard;
  passwordNotChangedGuard: PasswordNotChangedGuard;
  userExistsGuard: UserExistsGuard;
}
