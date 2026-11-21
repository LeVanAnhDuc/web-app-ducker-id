// libs
import { JsonController, Patch, Req, Res } from "routing-controllers";
// types
import type { Response } from "express";
import type { ChangePasswordRequest } from "./types";
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
  // The service takes the whole request and reads the validated body from it.
  @Patch("/change-password")
  @PasswordChangeAuth()
  @RateLimit("changePasswordByIpAndUser")
  @Respond({ message: "changePassword:success.passwordChanged" })
  async changePassword(
    // Declared only to register the body pipe; the service reads req.body.
    @ValidBody(ChangePasswordBodyDto) _body: ChangePasswordBodyDto,
    @Req() req: ChangePasswordRequest,
    @Res() res: Response
  ) {
    const data = await this.service.changePassword(req);
    const { refreshToken, ...responseData } = data;

    res.cookie(REFRESH_TOKEN, refreshToken, REFRESH_TOKEN_COOKIE_OPTIONS);

    return responseData;
  }
}
