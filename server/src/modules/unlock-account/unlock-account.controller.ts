// types
import type { Response } from "express";
import type { UnlockRequest, UnlockVerifyRequest } from "./types";
import type { UnlockAccountService } from "./services";
// modules
import { REFRESH_TOKEN_COOKIE_OPTIONS } from "@/modules/token/constants";
import { REFRESH_TOKEN } from "@/modules/token/constants";

export class UnlockAccountController {
  constructor(private readonly service: UnlockAccountService) {}

  unlockRequest = async (req: UnlockRequest) =>
    this.service.unlockRequest(req.body, req);

  unlockVerify = async (req: UnlockVerifyRequest, res: Response) => {
    const data = await this.service.unlockVerify(req.body, req);
    const { refreshToken, ...responseData } = data;

    if (refreshToken) {
      res.cookie(REFRESH_TOKEN, refreshToken, REFRESH_TOKEN_COOKIE_OPTIONS);
    }

    return responseData;
  };
}
