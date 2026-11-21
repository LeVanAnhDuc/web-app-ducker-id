// types
import type {
  LoginBodyDto,
  OtpSendBodyDto,
  OtpVerifyBodyDto,
  MagicLinkSendBodyDto,
  MagicLinkVerifyBodyDto
} from "../../dtos/requests";
import type { FailedAttemptsRepository } from "../../repositories/failed-attempts.repository";
import type {
  LoginResponseDto,
  OtpSendDto,
  MagicLinkSendDto
} from "../../dtos";
import type { PasswordLoginStrategy } from "../../strategies/password-login";
import type { OtpLoginStrategy } from "../../strategies/otp-login";
import type { MagicLinkLoginStrategy } from "../../strategies/magic-link-login";

/**
 * Façade. Mỗi method là một dòng dispatch sang strategy — strategy chính là
 * nơi giữ logic của từng use case, nên ở đây KHÔNG tách thêm file method nữa.
 */
export class LoginService {
  constructor(
    private readonly passwordStrategy: PasswordLoginStrategy,
    private readonly otpStrategy: OtpLoginStrategy,
    private readonly magicLinkStrategy: MagicLinkLoginStrategy,
    private readonly failedAttemptsRepo: FailedAttemptsRepository
  ) {}

  passwordLogin(body: LoginBodyDto): Promise<LoginResponseDto> {
    return this.passwordStrategy.authenticate(body);
  }

  sendOtp(body: OtpSendBodyDto): Promise<OtpSendDto> {
    return this.otpStrategy.sendCode(body);
  }

  verifyOtp(body: OtpVerifyBodyDto): Promise<LoginResponseDto> {
    return this.otpStrategy.verifyCode(body);
  }

  sendMagicLink(body: MagicLinkSendBodyDto): Promise<MagicLinkSendDto> {
    return this.magicLinkStrategy.sendLink(body);
  }

  verifyMagicLink(body: MagicLinkVerifyBodyDto): Promise<LoginResponseDto> {
    return this.magicLinkStrategy.verifyLink(body);
  }

  async isEmailLocked(email: string): Promise<boolean> {
    const { isLocked } = await this.failedAttemptsRepo.checkLockout(email);
    return isLocked;
  }

  resetFailedAttempts(email: string): Promise<void> {
    return this.failedAttemptsRepo.resetAll(email);
  }
}
