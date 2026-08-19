// types
import type { EmailDispatcher } from "@/services/email/email.dispatcher";
import type {
  FPMagicLinkSendRequest,
  FPMagicLinkVerifyRequest
} from "../types";
import type {
  MagicLinkForgotPasswordRepository,
  ResetTokenRepository
} from "../repositories";
import type {
  SendMagicLinkResponseDto,
  VerifyMagicLinkResponseDto
} from "../dtos";
import type {
  MagicLinkCooldownGuard,
  MagicLinkResendLimitGuard,
  AuthExistsGuard
} from "../guards";
import type { ForgotPasswordAuditService } from "../services/forgot-password-audit.service";
// common
import { UnauthorizedError } from "@/common/exceptions";
// dtos
import {
  toSendMagicLinkResponseDto,
  toVerifyMagicLinkResponseDto
} from "../dtos";
// others
import ENV from "@/constants/env";
import { EmailType } from "@/types/services/email";
import { ERROR_CODES } from "@/constants/error-code";
import { Logger, LogMethod } from "@/libs/logger";
import { withRetry } from "@/utils/resilience/retry";
import { FORGOT_PASSWORD_MAGIC_LINK_CONFIG } from "../constants";

export class MagicLinkForgotPasswordStrategy {
  constructor(
    private readonly magicLinkRepo: MagicLinkForgotPasswordRepository,
    private readonly resetTokenRepo: ResetTokenRepository,
    private readonly emailDispatcher: EmailDispatcher,
    private readonly cooldownGuard: MagicLinkCooldownGuard,
    private readonly resendLimitGuard: MagicLinkResendLimitGuard,
    private readonly authExistsGuard: AuthExistsGuard,
    private readonly audit: ForgotPasswordAuditService
  ) {}

  @LogMethod({ name: "Forgot password magic link send" })
  async sendLink(
    req: FPMagicLinkSendRequest
  ): Promise<SendMagicLinkResponseDto> {
    const { email } = req.body;
    const { language } = req;

    await this.cooldownGuard.assert(email);
    await this.resendLimitGuard.assert(email);

    const result = await this.authExistsGuard.tryFind(email);

    if (!result || !result.auth.isActive) {
      Logger.info(
        "Forgot password magic link - email not found or inactive (fake success)",
        { email }
      );
      return toSendMagicLinkResponseDto(
        this.magicLinkRepo.MAGIC_LINK_EXPIRY_SECONDS,
        this.magicLinkRepo.MAGIC_LINK_COOLDOWN_SECONDS
      );
    }

    const token = await this.magicLinkRepo.createAndStoreToken(email);

    withRetry(() => this.magicLinkRepo.setRateLimits(email), {
      operationName: "setForgotPasswordMagicLinkRateLimits",
      context: { email }
    });

    this.sendMagicLinkEmail(email, token, language);

    Logger.info("Forgot-password magic link sent", {
      email,
      expiresIn: this.magicLinkRepo.MAGIC_LINK_EXPIRY_SECONDS,
      cooldown: this.magicLinkRepo.MAGIC_LINK_COOLDOWN_SECONDS
    });

    return toSendMagicLinkResponseDto(
      this.magicLinkRepo.MAGIC_LINK_EXPIRY_SECONDS,
      this.magicLinkRepo.MAGIC_LINK_COOLDOWN_SECONDS
    );
  }

  @LogMethod({ name: "Forgot password magic link verification" })
  async verifyLink(
    req: FPMagicLinkVerifyRequest
  ): Promise<VerifyMagicLinkResponseDto> {
    const { email, token } = req.body;

    const { auth } = await this.authExistsGuard.assert(email);

    const isValid = await this.magicLinkRepo.verifyToken(email, token);
    if (!isValid) {
      this.audit.recordInvalidMagicLink({ email, auth, req });
      throw new UnauthorizedError({
        i18nMessage: (t) => t("forgotPassword:errors.invalidMagicLink"),
        code: ERROR_CODES.FORGOT_PASSWORD_MAGIC_LINK_INVALID
      });
    }

    const resetToken = await this.resetTokenRepo.createAndStore(email);

    withRetry(() => this.magicLinkRepo.cleanupAll(email), {
      operationName: "cleanupForgotPasswordMagicLinkData",
      context: { email }
    });

    Logger.info("Forgot-password magic link verified", { email });

    return toVerifyMagicLinkResponseDto(resetToken);
  }

  private sendMagicLinkEmail(
    email: string,
    token: string,
    language: string
  ): void {
    const magicLinkUrl = `${ENV.CLIENT_URL}/reset-password?email=${encodeURIComponent(email)}&token=${token}&method=magic-link`;
    this.emailDispatcher.send(EmailType.MAGIC_LINK, {
      email,
      data: {
        magicLinkUrl,
        expiryMinutes: FORGOT_PASSWORD_MAGIC_LINK_CONFIG.EXPIRY_MINUTES
      },
      locale: language as I18n.Locale
    });
  }
}
