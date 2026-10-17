// types
import type { Response } from "express";
import type {
  SendOtpRequest,
  VerifyOtpRequest,
  ResendOtpRequest,
  CompleteSignupRequest,
  CheckEmailRequest
} from "./types";
import type { SignupService } from "./services";
// common
import { OkSuccess, CreatedSuccess } from "@/common/responses";
// modules
import {
  REFRESH_TOKEN,
  REFRESH_TOKEN_COOKIE_OPTIONS
} from "@/modules/token/constants";

export class SignupController {
  constructor(private readonly service: SignupService) {}

  sendOtp = async (req: SendOtpRequest, res: Response): Promise<void> => {
    const data = await this.service.sendOtp(req.body, req);
    new OkSuccess({ data, message: "signup:success.otpSent" }).send(req, res);
  };

  verifyOtp = async (req: VerifyOtpRequest, res: Response): Promise<void> => {
    const data = await this.service.verifyOtp(req.body);
    new OkSuccess({ data, message: "signup:success.otpVerified" }).send(
      req,
      res
    );
  };

  resendOtp = async (req: ResendOtpRequest, res: Response): Promise<void> => {
    const data = await this.service.resendOtp(req.body, req);
    new OkSuccess({ data, message: "signup:success.otpResent" }).send(req, res);
  };

  completeSignup = async (
    req: CompleteSignupRequest,
    res: Response
  ): Promise<void> => {
    const {
      tokens: { refreshToken, ...tokens },
      ...account
    } = await this.service.completeSignup(req.body);

    // Same as login: the refresh token goes only into the HttpOnly cookie, so
    // the new session survives a reload (BUG-AUTH-02) and page script never
    // sees it.
    res.cookie(REFRESH_TOKEN, refreshToken, REFRESH_TOKEN_COOKIE_OPTIONS);

    new CreatedSuccess({
      data: { ...account, tokens },
      message: "signup:success.signupCompleted"
    }).send(req, res);
  };

  checkEmail = async (req: CheckEmailRequest, res: Response): Promise<void> => {
    const data = await this.service.checkEmail(req.params);
    new OkSuccess({ data }).send(req, res);
  };
}
