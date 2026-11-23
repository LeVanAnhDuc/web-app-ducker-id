// types
import type { UserInfoResponse } from "../types";
import type { AuthenticationService } from "@/modules/authentication/authentication.service";
import type { UserService } from "@/modules/user/user.service";
// others
import { filterClaimsByScopes, parseScopeParam } from "../helpers";
import { loadClaims } from "./shared/load-claims";

export const getUserInfo = async (
  deps: {
    authService: AuthenticationService;
    userService: UserService;
  },
  authId: string,
  userId: string,
  scope: string
): Promise<UserInfoResponse> => {
  const claims = await loadClaims(deps, authId, userId);
  const scopes = parseScopeParam(scope);

  return {
    sub: userId,
    ...filterClaimsByScopes(claims, scopes)
  } as UserInfoResponse;
};
