// types
import type { Response } from "express";
import type { LogoutRequest } from "./types";
import type { LogoutService } from "./logout.service";
// common
import { NoContentSuccess } from "@/common/responses";
// modules
import { REFRESH_TOKEN_COOKIE_OPTIONS } from "@/modules/token/constants";
import { REFRESH_TOKEN } from "@/modules/token/constants";

export class LogoutController {
  constructor(private readonly service: LogoutService) {}

  logout = async (req: LogoutRequest, res: Response): Promise<void> => {
    await this.service.logout();

    res.clearCookie(REFRESH_TOKEN, REFRESH_TOKEN_COOKIE_OPTIONS);

    new NoContentSuccess().send(req, res);
  };
}
