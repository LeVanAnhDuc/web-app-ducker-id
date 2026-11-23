// types
import type {
  ForgotPasswordMagicLinkSendBodyDto,
  ForgotPasswordMagicLinkVerifyBodyDto,
  ForgotPasswordOtpSendBodyDto,
  ForgotPasswordOtpVerifyBodyDto,
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
// dtos
import { toResetPasswordResponseDto } from "../../dtos";
// others
import { LogMethod } from "@/libs/logger";
import { hashValue } from "@/utils/crypto/bcrypt";

/**
 * Bốn method đầu chỉ dispatch sang strategy — strategy mới là nơi giữ logic
 * của từng use case. `resetPassword` là method duy nhất có logic riêng.
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

  sendOtp(body: ForgotPasswordOtpSendBodyDto): Promise<SendOtpResponseDto> {
    return this.otpStrategy.sendCode(body);
  }

  verifyOtp(
    body: ForgotPasswordOtpVerifyBodyDto
  ): Promise<VerifyOtpResponseDto> {
    return this.otpStrategy.verifyCode(body);
  }

  sendMagicLink(
    body: ForgotPasswordMagicLinkSendBodyDto
  ): Promise<SendMagicLinkResponseDto> {
    return this.magicLinkStrategy.sendLink(body);
  }

  verifyMagicLink(
    body: ForgotPasswordMagicLinkVerifyBodyDto
  ): Promise<VerifyMagicLinkResponseDto> {
    return this.magicLinkStrategy.verifyLink(body);
  }

  @LogMethod({ name: "Forgot password reset" })
  async resetPassword(
    body: ResetPasswordBodyDto
  ): Promise<ResetPasswordResponseDto> {
    const { email, resetToken, newPassword } = body;

    await this.resetTokenValidGuard.assert(email, resetToken);

    const { auth } = await this.authExistsGuard.assert(email);

    const hashedPassword = hashValue(newPassword);
    await this.authService.updatePassword(auth._id.toString(), hashedPassword);

    await this.resetTokenRepo.clear(email);

    this.audit.recordPasswordReset({ email, auth });

    return toResetPasswordResponseDto();
  }
}
