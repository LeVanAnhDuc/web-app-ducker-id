// libs
import { StatusCodes } from "http-status-codes";
import { JsonController, Post, Req, Res } from "routing-controllers";
// types
import type { Request, Response } from "express";
import type { LogoutService } from "./services";
// common
import { PasswordChangeAuth, Respond } from "@/common/routing";
// modules
import {
  REFRESH_TOKEN,
  REFRESH_TOKEN_CLEAR_COOKIE_OPTIONS
} from "@/modules/token/constants";

@JsonController("/auth/logout")
export class LogoutController {
  constructor(private readonly service: LogoutService) {}

  // A temporary-password session may still sign out.
  @Post("/")
  @PasswordChangeAuth()
  @Respond({ status: StatusCodes.NO_CONTENT })
  async logout(@Req() req: Request, @Res() res: Response): Promise<void> {
    await this.service.logout(req, res);

    res.clearCookie(REFRESH_TOKEN, REFRESH_TOKEN_CLEAR_COOKIE_OPTIONS);
  }
}
