// libs
import { StatusCodes } from "http-status-codes";
// types
import type { AuthenticationService } from "@/modules/authentication/services";
import type { UserService } from "@/modules/user/services";
// common
import { OAuthError } from "@/exceptions";
// others
import { OAUTH_ERRORS } from "../../constants";

export const loadClaims = async (
  deps: {
    authService: AuthenticationService;
    userService: UserService;
  },
  authId: string,
  userId: string
): Promise<Record<string, unknown>> => {
  const [auth, user] = await Promise.all([
    deps.authService.findById(authId),
    deps.userService.findByAuthId(authId)
  ]);

  if (!user) {
    throw new OAuthError({
      error: OAUTH_ERRORS.INVALID_GRANT,
      description: "User no longer exists",
      status: StatusCodes.UNAUTHORIZED
    });
  }

  return {
    sub: userId,
    name: user.fullName,
    picture: user.avatar ?? null,
    email: user.email,
    email_verified: Boolean(auth?.verifiedEmail)
  };
};
