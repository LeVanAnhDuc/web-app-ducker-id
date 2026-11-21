// libs
import { JsonController, Patch, Req, Res } from "routing-controllers";
import { OpenAPI } from "routing-controllers-openapi";
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
import { AccessTokensDto } from "@/modules/token/dtos";
import {
  REFRESH_TOKEN,
  REFRESH_TOKEN_COOKIE_OPTIONS
} from "@/modules/token/constants";
// others
import { ChangePasswordBodyDto } from "./dtos/requests";

@JsonController("/auth")
@OpenAPI({ tags: ["Auth - Change Password"] })
export class ChangePasswordController {
  constructor(private readonly service: ChangePasswordService) {}

  // The one way out of a temporary-password session — it must accept one.
  // The service takes the whole request and reads the validated body from it.
  @Patch("/change-password")
  @OpenAPI({
    summary: "Change password (authenticated user)",
    description:
      'Verifies the current password and refuses a new one equal to it (400). Also accepted in a temporary-password session, which it ends. Sets a new refresh token as an HttpOnly cookie and returns fresh access and ID tokens, so this device stays signed in; other devices are refused on their next token refresh. A "password changed" email is queued.'
  })
  @PasswordChangeAuth()
  @RateLimit("changePasswordByIpAndUser")
  @Respond({
    message: "changePassword:success.passwordChanged",
    type: AccessTokensDto
  })
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
