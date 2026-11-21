// types
import type { Response } from "express";
import type { LogoutRequest } from "./types";
import type { LogoutService } from "./services";
// modules
import {
  REFRESH_TOKEN,
  REFRESH_TOKEN_CLEAR_COOKIE_OPTIONS
} from "@/modules/token/constants";

export class LogoutController {
  constructor(private readonly service: LogoutService) {}

  logout = async (req: LogoutRequest, res: Response) => {
    await this.service.logout(req, res);

    res.clearCookie(REFRESH_TOKEN, REFRESH_TOKEN_CLEAR_COOKIE_OPTIONS);
  };
}
