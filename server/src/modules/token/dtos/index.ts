// types
import type { AuthTokensResponse } from "@/modules/authentication/types";
// common
import { ApiProperty } from "@/common/openapi";

/**
 * The tokens every sign-in route answers with (login, OTP, magic link, sign-up,
 * unlock, change password, refresh). The refresh token stays in its HttpOnly
 * cookie — echoing it here would hand it to page script (BUG-AUTH-07).
 *
 * Plain data: `toAccessTokensDto` builds an object literal typed as this
 * class, and the sign-in controllers strip `refreshToken` from theirs.
 */
export class AccessTokensDto {
  @ApiProperty({
    type: "string",
    example: "eyJhbGciOiJIUzI1NiIs...",
    description: "JWT access token, sent as a Bearer token"
  })
  accessToken!: string;

  @ApiProperty({
    type: "string",
    example: "eyJhbGciOiJIUzI1NiIs...",
    description: "JWT ID token containing user info"
  })
  idToken!: string;

  @ApiProperty({
    type: "integer",
    example: 28800000,
    description: "Access token lifetime in milliseconds"
  })
  expiresIn!: number;
}

export const toAccessTokensDto = (
  tokens: AuthTokensResponse
): AccessTokensDto => ({
  accessToken: tokens.accessToken,
  idToken: tokens.idToken,
  expiresIn: tokens.expiresIn
});
