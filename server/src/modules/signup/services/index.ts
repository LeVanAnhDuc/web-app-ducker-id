// types
import type { Request } from "express";
import type {
  CheckEmailParams,
  CompleteSignupBody,
  ResendOtpBody,
  SendOtpBody,
  VerifyOtpBody
} from "../types";
import type {
  CheckEmailDto,
  CompleteSignupDto,
  ResendOtpDto,
  SendOtpDto,
  VerifyOtpDto
} from "../dtos";
import type { SignupServiceDeps } from "./deps";
// others
import { LogMethod } from "@/libs/logger";
import { checkEmail } from "./check-email";
import { completeSignup } from "./complete-signup";
import { resendOtp } from "./resend-otp";
import { sendOtp } from "./send-otp";
import { verifyOtp } from "./verify-otp";

export class SignupService {
  constructor(private readonly deps: SignupServiceDeps) {}

  @LogMethod({ name: "SendOtp" })
  sendOtp(body: SendOtpBody, req: Request): Promise<SendOtpDto> {
    return sendOtp(this.deps, body, req);
  }

  @LogMethod({ name: "VerifyOtp" })
  verifyOtp(body: VerifyOtpBody): Promise<VerifyOtpDto> {
    return verifyOtp(this.deps, body);
  }

  @LogMethod({ name: "ResendOtp" })
  resendOtp(body: ResendOtpBody, req: Request): Promise<ResendOtpDto> {
    return resendOtp(this.deps, body, req);
  }

  @LogMethod({ name: "CompleteSignup" })
  completeSignup(body: CompleteSignupBody): Promise<CompleteSignupDto> {
    return completeSignup(this.deps, body);
  }

  @LogMethod({ name: "CheckEmail" })
  checkEmail(params: CheckEmailParams): Promise<CheckEmailDto> {
    return checkEmail(this.deps, params);
  }
}
