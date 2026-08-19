// types
import type { AuthTokensResponse } from "@/modules/authentication/types";

export interface LoginResponseDto {
  accessToken: string;
  refreshToken: string;
  idToken: string;
  expiresIn: number;
}

export const toLoginResponseDto = (
  data: AuthTokensResponse
): LoginResponseDto => ({
  accessToken: data.accessToken,
  refreshToken: data.refreshToken,
  idToken: data.idToken,
  expiresIn: data.expiresIn
});
