// libs
import { JsonController, Post, Req, Res } from "routing-controllers";
import { OpenAPI } from "routing-controllers-openapi";
// types
import type { Request, Response } from "express";
import type { UnlockAccountService } from "./services";
// common
import { ApiErrors } from "@/common/openapi";
import { RateLimit, Respond, ValidBody } from "@/common/routing";
// modules
import { AccessTokensDto } from "@/modules/token/dtos";
import {
  REFRESH_TOKEN,
  REFRESH_TOKEN_COOKIE_OPTIONS
} from "@/modules/token/constants";
// others
import { UnlockRequestDto } from "./dtos";
import { UnlockRequestBodyDto, UnlockVerifyBodyDto } from "./dtos/requests";

@JsonController("/auth/unlock")
@OpenAPI({ tags: ["Auth - Unlock"] })
export class UnlockAccountController {
  constructor(private readonly service: UnlockAccountService) {}

  @Post("/request")
  @OpenAPI({
    summary: "Request a temporary password for a locked account",
    description:
      "Emails a temporary password to an account locked by failed sign-ins. Answers the same for an unknown email, without sending anything. 400 `UNLOCK_ACCOUNT_NOT_LOCKED` / `UNLOCK_ACCOUNT_DISABLED` / `UNLOCK_COOLDOWN`; 429 `UNLOCK_RATE_LIMIT` (a per-email limit kept by the service)."
  })
  @ApiErrors(429)
  @Respond({
    message: "unlockAccount:success.unlockEmailSent",
    type: UnlockRequestDto
  })
  unlockRequest(
    @ValidBody(UnlockRequestBodyDto) body: UnlockRequestBodyDto,
    @Req() req: Request
  ) {
    return this.service.unlockRequest(body, req);
  }

  @Post("/verify")
  @OpenAPI({
    summary: "Unlock and sign in with the temporary password",
    description:
      "Unlocks the account and signs in. Sets the refresh token as an HttpOnly cookie; the body carries only the access and ID tokens. The session is a temporary-password one: every route but change-password and logout answers 403 `AUTH_PASSWORD_CHANGE_REQUIRED` until the password is changed. 401 `UNLOCK_INVALID_TEMP_PASSWORD` / `UNLOCK_AUTH_NOT_FOUND`; 429 shares the sign-in per-IP limit."
  })
  @ApiErrors(401)
  @RateLimit("loginByIp")
  @Respond({
    message: "unlockAccount:success.accountUnlocked",
    type: AccessTokensDto
  })
  async unlockVerify(
    @ValidBody(UnlockVerifyBodyDto) body: UnlockVerifyBodyDto,
    @Req() req: Request,
    @Res() res: Response
  ) {
    const data = await this.service.unlockVerify(body, req);
    const { refreshToken, ...responseData } = data;

    if (refreshToken) {
      res.cookie(REFRESH_TOKEN, refreshToken, REFRESH_TOKEN_COOKIE_OPTIONS);
    }

    return responseData;
  }
}
