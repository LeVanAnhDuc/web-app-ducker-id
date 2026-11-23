// types
import type {
  MagicLinkSendBodyDto,
  MagicLinkVerifyBodyDto,
  OtpSendBodyDto,
  OtpVerifyBodyDto,
  ResetPasswordBodyDto
} from "../../dtos/requests";
import type {
  SendOtpResponseDto,
  VerifyOtpResponseDto,
  SendMagicLinkResponseDto,
  VerifyMagicLinkResponseDto,
  ResetPasswordResponseDto
} from "../../dtos";
import type { AuthenticationService } from "@/modules/authentication/authentication.service";
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

  sendOtp(body: OtpSendBodyDto): Promise<SendOtpResponseDto> {
    return this.otpStrategy.sendCode(body);
  }

  verifyOtp(body: OtpVerifyBodyDto): Promise<VerifyOtpResponseDto> {
    return this.otpStrategy.verifyCode(body);
  }

  sendMagicLink(body: MagicLinkSendBodyDto): Promise<SendMagicLinkResponseDto> {
    return this.magicLinkStrategy.sendLink(body);
  }

  verifyMagicLink(
    body: MagicLinkVerifyBodyDto
  ): Promise<VerifyMagicLinkResponseDto> {
    return this.magicLinkStrategy.verifyLink(body);
  }

  @LogMethod({ name: "Forgot password reset" })
  resetPassword(body: ResetPasswordBodyDto): Promise<ResetPasswordResponseDto> {
    return resetPassword(
      {
        authService: this.authService,
        resetTokenRepo: this.resetTokenRepo,
        authExistsGuard: this.authExistsGuard,
        resetTokenValidGuard: this.resetTokenValidGuard,
        audit: this.audit
      },
      body
    );
  }
}
