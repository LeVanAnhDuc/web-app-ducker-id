// types
import type { TokenServiceDeps } from "./deps";
// others
import { Logger } from "@/libs/logger";
import { MILLISECONDS_PER_SECOND } from "@/constants/time";
import { verifyRefreshToken } from "../helpers";

/**
 * Puts the caller's refresh token on the denylist for the rest of its life.
 * A missing, forged or already-expired token can mint nothing anyway, so it
 * is skipped instead of failing the logout.
 */
export const revokeRefreshToken = async (
  deps: TokenServiceDeps,
  refreshToken: string | undefined
): Promise<void> => {
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

  await deps.revokedRefreshTokenRepo.revoke(refreshToken, ttlSeconds);

  Logger.info("Refresh token revoked", { authId: payload.authId });
};
