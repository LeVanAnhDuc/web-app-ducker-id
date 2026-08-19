// types
import type { Response } from "express";
import type { ChangePasswordRequest } from "./types";
import type { ChangePasswordService } from "./change-password.service";
// common
import { OkSuccess } from "@/common/responses";
// modules
import {
  REFRESH_TOKEN,
  REFRESH_TOKEN_COOKIE_OPTIONS
} from "@/modules/token/constants";

export class ChangePasswordController {
  constructor(private readonly service: ChangePasswordService) {}

  changePassword = async (
    req: ChangePasswordRequest,
    res: Response
  ): Promise<void> => {
    const data = await this.service.changePassword(req);
    const { refreshToken, ...responseData } = data;

    res.cookie(REFRESH_TOKEN, refreshToken, REFRESH_TOKEN_COOKIE_OPTIONS);

    new OkSuccess({
      data: responseData,
      message: "changePassword:success.passwordChanged"
    }).send(req, res);
  };
}
