// types
import type { AuthTokensResponse } from "@/modules/authentication/types";

export interface RefreshTokenDto {
  accessToken: string;
  refreshToken: string;
  idToken: string;
  expiresIn: number;
}

export const toRefreshTokenDto = (
  tokens: AuthTokensResponse
): RefreshTokenDto => ({
  accessToken: tokens.accessToken,
  refreshToken: tokens.refreshToken,
  idToken: tokens.idToken,
  expiresIn: tokens.expiresIn
});
