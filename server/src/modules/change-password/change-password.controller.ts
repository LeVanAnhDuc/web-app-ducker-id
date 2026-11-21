// libs
import { JsonController, Patch, Res } from "routing-controllers";
// types
import type { Response } from "express";
import type { ChangePasswordService } from "./services";
// common
import {
  PasswordChangeAuth,
  RateLimit,
  Respond,
  ValidBody
} from "@/common/routing";
// modules
import {
  REFRESH_TOKEN,
  REFRESH_TOKEN_COOKIE_OPTIONS
} from "@/modules/token/constants";
// others
import { ChangePasswordBodyDto } from "./dtos/requests";

@JsonController("/auth")
export class ChangePasswordController {
  constructor(private readonly service: ChangePasswordService) {}

  // The one way out of a temporary-password session — it must accept one.
  @Patch("/change-password")
  @PasswordChangeAuth()
  @RateLimit("changePasswordByIpAndUser")
  @Respond({ message: "changePassword:success.passwordChanged" })
  async changePassword(
    @ValidBody(ChangePasswordBodyDto) body: ChangePasswordBodyDto,
    @Res() res: Response
  ) {
    const data = await this.service.changePassword(body);
    const { refreshToken, ...responseData } = data;

    res.cookie(REFRESH_TOKEN, refreshToken, REFRESH_TOKEN_COOKIE_OPTIONS);

    return responseData;
  }
}
