// types
import type { Request } from "express";
import type {
  PasswordLoginBody,
  OtpSendBody,
  OtpVerifyBody,
  MagicLinkSendBody,
  MagicLinkVerifyBody
} from "../types";
import type { FailedAttemptsRepository } from "../repositories";
import type { LoginResponseDto, OtpSendDto, MagicLinkSendDto } from "../dtos";
import type {
  PasswordLoginStrategy,
  OtpLoginStrategy,
  MagicLinkLoginStrategy
} from "../strategies";

export class LoginService {
  constructor(
    private readonly passwordStrategy: PasswordLoginStrategy,
    private readonly otpStrategy: OtpLoginStrategy,
    private readonly magicLinkStrategy: MagicLinkLoginStrategy,
    private readonly failedAttemptsRepo: FailedAttemptsRepository
  ) {}

  passwordLogin(
    body: PasswordLoginBody,
    req: Request
  ): Promise<LoginResponseDto> {
    return this.passwordStrategy.authenticate(body, req);
  }

  sendOtp(body: OtpSendBody, req: Request): Promise<OtpSendDto> {
    return this.otpStrategy.sendCode(body, req);
  }

  verifyOtp(body: OtpVerifyBody, req: Request): Promise<LoginResponseDto> {
    return this.otpStrategy.verifyCode(body, req);
  }

  sendMagicLink(
    body: MagicLinkSendBody,
    req: Request
  ): Promise<MagicLinkSendDto> {
    return this.magicLinkStrategy.sendLink(body, req);
  }

  verifyMagicLink(
    body: MagicLinkVerifyBody,
    req: Request
  ): Promise<LoginResponseDto> {
    return this.magicLinkStrategy.verifyLink(body, req);
  }

  // ──────────────────────────────────────────────
  // Public lockout operations (used by unlock-account module)
  // ──────────────────────────────────────────────

  async isEmailLocked(email: string): Promise<boolean> {
    const { isLocked } = await this.failedAttemptsRepo.checkLockout(email);
    return isLocked;
  }

  resetFailedAttempts(email: string): Promise<void> {
    return this.failedAttemptsRepo.resetAll(email);
  }
}
