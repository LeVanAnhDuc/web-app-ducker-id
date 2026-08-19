// types
import type { Response } from "express";
import type { UnlockRequest, UnlockVerifyRequest } from "./types";
import type { UnlockAccountService } from "./unlock-account.service";
// common
import { OkSuccess } from "@/common/responses";
// modules
import { REFRESH_TOKEN_COOKIE_OPTIONS } from "@/modules/token/constants";
import { REFRESH_TOKEN } from "@/modules/token/constants";

export class UnlockAccountController {
  constructor(private readonly service: UnlockAccountService) {}

  unlockRequest = async (req: UnlockRequest, res: Response): Promise<void> => {
    const data = await this.service.unlockRequest(req.body, req);
    new OkSuccess({
      data,
      message: "unlockAccount:success.unlockEmailSent"
    }).send(req, res);
  };

  unlockVerify = async (
    req: UnlockVerifyRequest,
    res: Response
  ): Promise<void> => {
    const data = await this.service.unlockVerify(req.body, req);
    const { refreshToken, ...responseData } = data;

    if (refreshToken) {
      res.cookie(REFRESH_TOKEN, refreshToken, REFRESH_TOKEN_COOKIE_OPTIONS);
    }

    new OkSuccess({
      data: responseData,
      message: "unlockAccount:success.accountUnlocked"
    }).send(req, res);
  };
}
