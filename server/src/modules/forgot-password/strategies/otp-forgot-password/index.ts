// types
import type { FPOtpSendRequest, FPOtpVerifyRequest } from "../../types";
import type { SendOtpResponseDto, VerifyOtpResponseDto } from "../../dtos";
import type { OtpForgotPasswordStrategyDeps } from "./deps";
// others
import { LogMethod } from "@/libs/logger";
import { sendCode } from "./send-code";
import { verifyCode } from "./verify-code";

export class OtpForgotPasswordStrategy {
  constructor(private readonly deps: OtpForgotPasswordStrategyDeps) {}

  @LogMethod({ name: "Forgot password OTP send" })
  sendCode(req: FPOtpSendRequest): Promise<SendOtpResponseDto> {
    return sendCode(this.deps, req);
  }

  @LogMethod({ name: "Forgot password OTP verification" })
  verifyCode(req: FPOtpVerifyRequest): Promise<VerifyOtpResponseDto> {
    return verifyCode(this.deps, req);
  }
}
