// types
import type { RevokedRefreshTokenRepository } from "../repository/revoked-refresh-token.repository";
// common
import { ForbiddenError } from "@/exceptions";
// others
import { ERROR_CODES } from "@/constants/error-code";
import { Logger } from "@/libs/logger";

export class RefreshTokenNotRevokedGuard {
  constructor(private readonly repo: RevokedRefreshTokenRepository) {}

  async assert(token: string, authId: string): Promise<void> {
    if (!(await this.repo.isRevoked(token))) return;

    Logger.warn("Token refresh rejected - refresh token revoked by logout", {
      authId
    });
    throw new ForbiddenError({
      i18nMessage: (t) => t("login:errors.invalidRefreshToken"),
      code: ERROR_CODES.REFRESH_TOKEN_INVALID
    });
  }
}
