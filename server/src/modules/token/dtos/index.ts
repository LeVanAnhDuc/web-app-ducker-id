// types
import type { AuthTokensResponse } from "@/modules/authentication/types";

/**
 * Same shape as the login body. The refresh token stays in its HttpOnly
 * cookie — echoing it here would hand it to page script (BUG-AUTH-07).
 */
export interface RefreshTokenDto {
  accessToken: string;
  idToken: string;
  expiresIn: number;
}

export const toRefreshTokenDto = (
  tokens: AuthTokensResponse
): RefreshTokenDto => ({
  accessToken: tokens.accessToken,
  idToken: tokens.idToken,
  expiresIn: tokens.expiresIn
});
