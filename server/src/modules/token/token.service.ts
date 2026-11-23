// types
import type { RefreshTokenDto } from "./dtos";
import type { AuthenticationService } from "@/modules/authentication/authentication.service";
import type { UserService } from "@/modules/user/services";
import type { RevokedRefreshTokenRepository } from "./repository/revoked-refresh-token.repository";
import type {
  RefreshTokenPresentGuard,
  RefreshTokenValidGuard,
  RefreshTokenNotRevokedGuard,
  AuthActiveGuard,
  PasswordNotChangedGuard,
  UserExistsGuard
} from "./guards";
// modules
import { generateAuthTokensResponse } from "@/modules/authentication/helpers";
// dtos
import { toRefreshTokenDto } from "./dtos";
// others
import { Logger } from "@/libs/logger";
import { MILLISECONDS_PER_SECOND } from "@/constants/time";
import { verifyRefreshToken } from "./helpers";

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

  async refreshAccessToken(
    refreshToken: string | undefined
  ): Promise<RefreshTokenDto> {
    this.refreshTokenPresentGuard.assert(refreshToken);
    const payload = this.refreshTokenValidGuard.assert(refreshToken);
    await this.refreshTokenNotRevokedGuard.assert(refreshToken, payload.authId);

    const [auth, user] = await Promise.all([
      this.authService.findById(payload.authId),
      this.userService.findByAuthId(payload.authId)
    ]);

    this.authActiveGuard.assert(auth, payload.authId);
    this.passwordNotChangedGuard.assert(auth, payload);
    this.userExistsGuard.assert(user, payload.authId);

    const authTokensResponse = generateAuthTokensResponse({
      userId: user._id.toString(),
      authId: auth._id.toString(),
      email: user.email,
      roles: auth.roles,
      fullName: user.fullName,
      avatar: user.avatar ?? null,
      // Carry the auth's CURRENT version forward — refresh must not bump it.
      tokenVersion: auth.tokenVersion ?? 0,
      mustChangePassword: auth.mustChangePassword ?? false
    });

    Logger.info("Token refresh successful", { userId: user._id.toString() });

    return toRefreshTokenDto(authTokensResponse);
  }

  /**
   * Puts the caller's refresh token on the denylist for the rest of its life.
   * A missing, forged or already-expired token can mint nothing anyway, so it
   * is skipped instead of failing the logout.
   */
  async revokeRefreshToken(refreshToken: string | undefined): Promise<void> {
    if (!refreshToken) return;

    let payload: RefreshTokenPayload;
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch {
      return;
    }

    const nowSeconds = Math.floor(Date.now() / MILLISECONDS_PER_SECOND);
    const ttlSeconds = (payload.exp ?? 0) - nowSeconds;
    if (ttlSeconds <= 0) return;

    await this.revokedRefreshTokenRepo.revoke(refreshToken, ttlSeconds);

    Logger.info("Refresh token revoked", { authId: payload.authId });
  }
}
