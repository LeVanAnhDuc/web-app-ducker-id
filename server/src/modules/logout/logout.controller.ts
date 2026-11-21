// libs
import { StatusCodes } from "http-status-codes";
import { JsonController, Post, Req, Res } from "routing-controllers";
import { OpenAPI } from "routing-controllers-openapi";
// types
import type { Request, Response } from "express";
import type { LogoutService } from "./services";
// common
import { PasswordChangeAuth, Respond } from "@/common/routing";
// modules
import {
  SESSION_CLEAR_COOKIE_OPTIONS,
  SESSION_COOKIE
} from "@/modules/session/constants";
import { readSid } from "@/modules/session/helpers";
import {
  REFRESH_TOKEN,
  REFRESH_TOKEN_CLEAR_COOKIE_OPTIONS
} from "@/modules/token/constants";

@JsonController("/auth/logout")
@OpenAPI({ tags: ["Auth - Session"] })
export class LogoutController {
  constructor(private readonly service: LogoutService) {}

  // A temporary-password session may still sign out.
  @Post("/")
  @OpenAPI({
    summary: "Logout user",
    description:
      "Revokes the request's refresh token, ends the IdP session and clears the refresh-token cookie. Also accepted in a temporary-password session. The client should drop its access token from memory; it stays valid until it expires."
  })
  @PasswordChangeAuth()
  @Respond({ status: StatusCodes.NO_CONTENT })
  async logout(@Req() req: Request, @Res() res: Response): Promise<void> {
    const cookies = req.cookies as Record<string, string> | undefined;

    await this.service.logout(cookies?.[REFRESH_TOKEN], readSid(req));

    res.clearCookie(REFRESH_TOKEN, REFRESH_TOKEN_CLEAR_COOKIE_OPTIONS);
    res.clearCookie(SESSION_COOKIE, SESSION_CLEAR_COOKIE_OPTIONS);
  }
}
