// libs
import { JsonController, Post, Res } from "routing-controllers";
// types
import type { Response } from "express";
import type { UnlockAccountService } from "./services";
// common
import { RateLimit, Respond, ValidBody } from "@/common/routing";
// modules
import {
  REFRESH_TOKEN,
  REFRESH_TOKEN_COOKIE_OPTIONS
} from "@/modules/token/constants";
// others
import { UnlockRequestBodyDto, UnlockVerifyBodyDto } from "./dtos/requests";

@JsonController("/auth/unlock")
export class UnlockAccountController {
  constructor(private readonly service: UnlockAccountService) {}

  @Post("/request")
  @Respond({ message: "unlockAccount:success.unlockEmailSent" })
  unlockRequest(@ValidBody(UnlockRequestBodyDto) body: UnlockRequestBodyDto) {
    return this.service.unlockRequest(body);
  }

  @Post("/verify")
  @RateLimit("loginByIp")
  @Respond({ message: "unlockAccount:success.accountUnlocked" })
  async unlockVerify(
    @ValidBody(UnlockVerifyBodyDto) body: UnlockVerifyBodyDto,
    @Res() res: Response
  ) {
    const data = await this.service.unlockVerify(body);
    const { refreshToken, ...responseData } = data;

    if (refreshToken) {
      res.cookie(REFRESH_TOKEN, refreshToken, REFRESH_TOKEN_COOKIE_OPTIONS);
    }

    return responseData;
  }
}
