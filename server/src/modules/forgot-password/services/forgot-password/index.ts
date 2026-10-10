// types
import type {
  FPOtpSendRequest,
  FPOtpVerifyRequest,
  FPMagicLinkSendRequest,
  FPMagicLinkVerifyRequest,
  FPResetPasswordRequest
} from "../../types";
import type {
  SendOtpResponseDto,
  VerifyOtpResponseDto,
  SendMagicLinkResponseDto,
  VerifyMagicLinkResponseDto,
  ResetPasswordResponseDto
} from "../../dtos";
import type { ForgotPasswordServiceDeps } from "./deps";
// others
import { LogMethod } from "@/libs/logger";
import { resetPassword } from "./reset-password";

/**
 * Bốn method đầu chỉ dispatch sang strategy — strategy mới là nơi giữ logic
 * của từng use case nên không tách thêm file method cho chúng. Chỉ
 * `resetPassword` có logic riêng và được tách ra file.
 */
export class ForgotPasswordService {
  constructor(private readonly deps: ForgotPasswordServiceDeps) {}

  sendOtp(req: FPOtpSendRequest): Promise<SendOtpResponseDto> {
    return this.deps.otpStrategy.sendCode(req);
  }

  verifyOtp(req: FPOtpVerifyRequest): Promise<VerifyOtpResponseDto> {
    return this.deps.otpStrategy.verifyCode(req);
  }

  sendMagicLink(
    req: FPMagicLinkSendRequest
  ): Promise<SendMagicLinkResponseDto> {
    return this.deps.magicLinkStrategy.sendLink(req);
  }

  verifyMagicLink(
    req: FPMagicLinkVerifyRequest
  ): Promise<VerifyMagicLinkResponseDto> {
    return this.deps.magicLinkStrategy.verifyLink(req);
  }

  @LogMethod({ name: "Forgot password reset" })
  resetPassword(
    req: FPResetPasswordRequest
  ): Promise<ResetPasswordResponseDto> {
    return resetPassword(this.deps, req);
  }
}
