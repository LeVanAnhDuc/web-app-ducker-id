// types
import type { Response } from "express";
import type {
  FPOtpSendRequest,
  FPOtpVerifyRequest,
  FPMagicLinkSendRequest,
  FPMagicLinkVerifyRequest,
  FPResetPasswordRequest
} from "./types";
import type { ForgotPasswordService } from "./services";
// common
import { OkSuccess } from "@/common/responses";

export class ForgotPasswordController {
  constructor(private readonly service: ForgotPasswordService) {}

  sendOtp = async (req: FPOtpSendRequest, res: Response): Promise<void> => {
    const data = await this.service.sendOtp(req);
    new OkSuccess({ data, message: "forgotPassword:success.otpSent" }).send(
      req,
      res
    );
  };

  verifyOtp = async (req: FPOtpVerifyRequest, res: Response): Promise<void> => {
    const data = await this.service.verifyOtp(req);
    new OkSuccess({ data, message: "forgotPassword:success.otpVerified" }).send(
      req,
      res
    );
  };

  sendMagicLink = async (
    req: FPMagicLinkSendRequest,
    res: Response
  ): Promise<void> => {
    const data = await this.service.sendMagicLink(req);
    new OkSuccess({
      data,
      message: "forgotPassword:success.magicLinkSent"
    }).send(req, res);
  };

  verifyMagicLink = async (
    req: FPMagicLinkVerifyRequest,
    res: Response
  ): Promise<void> => {
    const data = await this.service.verifyMagicLink(req);
    new OkSuccess({
      data,
      message: "forgotPassword:success.magicLinkVerified"
    }).send(req, res);
  };

  resetPassword = async (
    req: FPResetPasswordRequest,
    res: Response
  ): Promise<void> => {
    const data = await this.service.resetPassword(req);
    new OkSuccess({
      data,
      message: "forgotPassword:success.passwordReset"
    }).send(req, res);
  };
}
