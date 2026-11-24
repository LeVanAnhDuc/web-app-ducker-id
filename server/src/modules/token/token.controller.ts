// libs
import { JsonController, Post, Req } from "routing-controllers";
import { OpenAPI } from "routing-controllers-openapi";
// types
import type { Request } from "express";
import type { TokenService } from "./token.service";
// common
import { ApiErrors } from "@/common/openapi";
import { Respond } from "@/common/routing";
// others
import { AccessTokensDto } from "./dtos";

@JsonController("/auth/token")
@OpenAPI({ tags: ["Auth - Session"] })
export class TokenController {
  constructor(private readonly service: TokenService) {}

  // No middleware in the chain: presence, signature, revocation and account
  // checks are the guards TokenService runs on the cookie value.
  @Post("/refresh")
  @OpenAPI({
    summary: "Refresh access token",
    description:
      "Issues new access and ID tokens from the refresh token in the HttpOnly cookie, which is read but not rotated. 401 `REFRESH_TOKEN_REQUIRED` without the cookie; 403 when it is invalid, expired or revoked, the account is inactive or gone, or the password changed since it was issued."
  })
  @ApiErrors(401, 403)
  @Respond({ message: "login:success.tokenRefreshed", type: AccessTokensDto })
  refreshToken(@Req() req: Request) {
    return this.service.refreshAccessToken(req.cookies?.refreshToken);
  }
}
