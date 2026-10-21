// common
import { ForbiddenError } from "@/exceptions";
// others
import { ERROR_CODES } from "@/constants/error-code";
import { verifyRefreshToken } from "../helpers";
import { Logger } from "@/libs/logger";

export class RefreshTokenValidGuard {
  assert(token: string): RefreshTokenPayload {
    try {
      return verifyRefreshToken(token);
    } catch (error) {
      Logger.warn("Token refresh failed - invalid refresh token", {
        error: error instanceof Error ? error.message : "Unknown error"
      });
      throw new ForbiddenError({
        key: "login:errors.invalidRefreshToken",
        code: ERROR_CODES.REFRESH_TOKEN_INVALID
      });
    }
  }
}
