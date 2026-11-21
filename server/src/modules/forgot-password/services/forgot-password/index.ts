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
import type { AuthenticationService } from "@/modules/authentication/services";
import type { ResetTokenRepository } from "../../repositories/reset-token.repository";
import type { OtpForgotPasswordStrategy } from "../../strategies/otp-forgot-password";
import type { MagicLinkForgotPasswordStrategy } from "../../strategies/magic-link-forgot-password";
import type { AuthExistsGuard, ResetTokenValidGuard } from "../../guards";
import type { ForgotPasswordAuditService } from "../forgot-password-audit";
// others
import { LogMethod } from "@/libs/logger";
import { resetPassword } from "./reset-password";

/**
 * Bốn method đầu chỉ dispatch sang strategy — strategy mới là nơi giữ logic
 * của từng use case nên không tách thêm file method cho chúng. Chỉ
 * `resetPassword` có logic riêng và được tách ra file.
 */
export class ForgotPasswordService {
  constructor(
    private readonly authService: AuthenticationService,
    private readonly resetTokenRepo: ResetTokenRepository,
    private readonly otpStrategy: OtpForgotPasswordStrategy,
    private readonly magicLinkStrategy: MagicLinkForgotPasswordStrategy,
    private readonly authExistsGuard: AuthExistsGuard,
    private readonly resetTokenValidGuard: ResetTokenValidGuard,
    private readonly audit: ForgotPasswordAuditService
  ) {}

  sendOtp(req: FPOtpSendRequest): Promise<SendOtpResponseDto> {
    return this.otpStrategy.sendCode(req);
  }

  verifyOtp(req: FPOtpVerifyRequest): Promise<VerifyOtpResponseDto> {
    return this.otpStrategy.verifyCode(req);
  }

  sendMagicLink(
    req: FPMagicLinkSendRequest
  ): Promise<SendMagicLinkResponseDto> {
    return this.magicLinkStrategy.sendLink(req);
  }

  verifyMagicLink(
    req: FPMagicLinkVerifyRequest
  ): Promise<VerifyMagicLinkResponseDto> {
    return this.magicLinkStrategy.verifyLink(req);
  }

  @LogMethod({ name: "Forgot password reset" })
  resetPassword(
    req: FPResetPasswordRequest
  ): Promise<ResetPasswordResponseDto> {
    return resetPassword(
      {
        authService: this.authService,
        resetTokenRepo: this.resetTokenRepo,
        authExistsGuard: this.authExistsGuard,
        resetTokenValidGuard: this.resetTokenValidGuard,
        audit: this.audit
      },
      req
    );
  }
}
