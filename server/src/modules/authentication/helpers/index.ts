// types
import type { AuthTokensResponse } from "@/modules/authentication/types";
// modules
import {
  generateAccessToken,
  generateIdToken,
  generateRefreshToken
} from "@/modules/token/helpers";
import { TOKEN_EXPIRY } from "@/modules/token/constants";

export const generateAuthTokensResponse = ({
  userId,
  authId,
  email,
  roles,
  fullName,
  avatar,
  tokenVersion,
  mustChangePassword
}: {
  userId: string;
  authId: string;
  email: string;
  roles: string;
  fullName: string;
  avatar?: string | null;
  tokenVersion: number;
  mustChangePassword: boolean;
}): AuthTokensResponse => {
  const { accessToken, refreshToken, idToken } = {
    accessToken: generateAccessToken({
      sub: userId,
      authId: authId,
      roles: roles
    }),
    refreshToken: generateRefreshToken({
      sub: userId,
      authId: authId,
      tokenVersion: tokenVersion
    }),
    idToken: generateIdToken({
      sub: userId,
      name: fullName,
      email: email,
      picture: avatar ?? null,
      mustChangePassword: mustChangePassword
    })
  };

  return {
    accessToken,
    refreshToken,
    idToken,
    expiresIn: TOKEN_EXPIRY.NUMBER_ACCESS_TOKEN
  };
};
