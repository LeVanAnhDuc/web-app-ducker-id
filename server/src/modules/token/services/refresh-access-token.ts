// types
import type { RefreshTokenDto } from "../dtos";
import type { TokenServiceDeps } from "./deps";
// modules
import { generateAuthTokensResponse } from "@/modules/authentication/helpers";
// dtos
import { toRefreshTokenDto } from "../dtos";
// others
import { Logger } from "@/libs/logger";

export const refreshAccessToken = async (
  deps: TokenServiceDeps,
  refreshToken: string | undefined
): Promise<RefreshTokenDto> => {
  deps.refreshTokenPresentGuard.assert(refreshToken);
  const payload = deps.refreshTokenValidGuard.assert(refreshToken);
  await deps.refreshTokenNotRevokedGuard.assert(refreshToken, payload.authId);

  const [auth, user] = await Promise.all([
    deps.authService.findById(payload.authId),
    deps.userService.findByAuthId(payload.authId)
  ]);

  deps.authActiveGuard.assert(auth, payload.authId);
  deps.passwordNotChangedGuard.assert(auth, payload);
  deps.userExistsGuard.assert(user, payload.authId);

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
};
