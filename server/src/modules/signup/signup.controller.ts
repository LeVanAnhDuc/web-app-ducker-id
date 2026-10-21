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
// modules
import {
  REFRESH_TOKEN,
  REFRESH_TOKEN_COOKIE_OPTIONS
} from "@/modules/token/constants";

export class SignupController {
  constructor(private readonly service: SignupService) {}

  sendOtp = async (req: SendOtpRequest) => this.service.sendOtp(req.body, req);

  verifyOtp = async (req: VerifyOtpRequest) => this.service.verifyOtp(req.body);

  resendOtp = async (req: ResendOtpRequest) =>
    this.service.resendOtp(req.body, req);

  completeSignup = async (req: CompleteSignupRequest, res: Response) => {
    const {
      tokens: { refreshToken, ...tokens },
      ...account
    } = await this.service.completeSignup(req.body);

    // Same as login: the refresh token goes only into the HttpOnly cookie, so
    // the new session survives a reload (BUG-AUTH-02) and page script never
    // sees it.
    res.cookie(REFRESH_TOKEN, refreshToken, REFRESH_TOKEN_COOKIE_OPTIONS);

    return { ...account, tokens };
  };

  checkEmail = async (req: CheckEmailRequest) =>
    this.service.checkEmail(req.params);
}
