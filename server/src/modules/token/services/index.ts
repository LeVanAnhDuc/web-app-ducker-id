// types
import type { RefreshTokenDto } from "../dtos";
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
// others
import { refreshAccessToken } from "./refresh-access-token";
import { revokeRefreshToken } from "./revoke-refresh-token";

export class TokenService {
  constructor(
    private readonly authService: AuthenticationService,
    private readonly userService: UserService,
    private readonly revokedRefreshTokenRepo: RevokedRefreshTokenRepository,
    private readonly refreshTokenPresentGuard: RefreshTokenPresentGuard,
    private readonly refreshTokenValidGuard: RefreshTokenValidGuard,
    private readonly refreshTokenNotRevokedGuard: RefreshTokenNotRevokedGuard,
    private readonly authActiveGuard: AuthActiveGuard,
    private readonly passwordNotChangedGuard: PasswordNotChangedGuard,
    private readonly userExistsGuard: UserExistsGuard
  ) {}

  refreshAccessToken(
    refreshToken: string | undefined
  ): Promise<RefreshTokenDto> {
    return refreshAccessToken(
      {
        authService: this.authService,
        userService: this.userService,
        refreshTokenPresentGuard: this.refreshTokenPresentGuard,
        refreshTokenValidGuard: this.refreshTokenValidGuard,
        refreshTokenNotRevokedGuard: this.refreshTokenNotRevokedGuard,
        authActiveGuard: this.authActiveGuard,
        passwordNotChangedGuard: this.passwordNotChangedGuard,
        userExistsGuard: this.userExistsGuard
      },
      refreshToken
    );
  }

  revokeRefreshToken(refreshToken: string | undefined): Promise<void> {
    return revokeRefreshToken(this.revokedRefreshTokenRepo, refreshToken);
  }
}
