// types
import type { Response } from "express";
import type {
  SendOtpRequest,
  VerifyOtpRequest,
  ResendOtpRequest,
  CompleteSignupRequest,
  CheckEmailRequest
} from "./types";
import type { SignupService } from "./signup.service";
// common
import { OkSuccess, CreatedSuccess } from "@/common/responses";

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
    const data = await this.service.completeSignup(req.body);
    new CreatedSuccess({
      data,
      message: "signup:success.signupCompleted"
    }).send(req, res);
  };

  checkEmail = async (req: CheckEmailRequest, res: Response): Promise<void> => {
    const data = await this.service.checkEmail(req.params);
    new OkSuccess({ data }).send(req, res);
  };
}
