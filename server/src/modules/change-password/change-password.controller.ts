// types
import type { Response } from "express";
import type { ChangePasswordRequest } from "./types";
import type { ChangePasswordService } from "./services";
// modules
import {
  REFRESH_TOKEN,
  REFRESH_TOKEN_COOKIE_OPTIONS
} from "@/modules/token/constants";

export class ChangePasswordController {
  constructor(private readonly service: ChangePasswordService) {}

  changePassword = async (req: ChangePasswordRequest, res: Response) => {
    const data = await this.service.changePassword(req);
    const { refreshToken, ...responseData } = data;

    res.cookie(REFRESH_TOKEN, refreshToken, REFRESH_TOKEN_COOKIE_OPTIONS);

    return responseData;
  };
}
