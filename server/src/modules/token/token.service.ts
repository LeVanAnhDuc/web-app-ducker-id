// types
import type { RefreshTokenDto } from "./dtos";
import type { AuthenticationService } from "@/modules/authentication/authentication.service";
import type { UserService } from "@/modules/user/user.service";
import type {
  RefreshTokenPresentGuard,
  RefreshTokenValidGuard,
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

export class TokenService {
  constructor(
    private readonly authService: AuthenticationService,
    private readonly userService: UserService,
    private readonly refreshTokenPresentGuard: RefreshTokenPresentGuard,
    private readonly refreshTokenValidGuard: RefreshTokenValidGuard,
    private readonly authActiveGuard: AuthActiveGuard,
    private readonly passwordNotChangedGuard: PasswordNotChangedGuard,
    private readonly userExistsGuard: UserExistsGuard
  ) {}

  async refreshAccessToken(
    refreshToken: string | undefined
  ): Promise<RefreshTokenDto> {
    this.refreshTokenPresentGuard.assert(refreshToken);
    const payload = this.refreshTokenValidGuard.assert(refreshToken);

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
}
