// types
import type { EmailDispatcher } from "@/services/email/email.dispatcher";
import type { Request } from "express";
import type { MagicLinkSendBody, MagicLinkVerifyBody } from "../types";
import type { MagicLinkLoginRepository } from "../repositories";
import type { LoginResponseDto, MagicLinkSendDto } from "../dtos";
import type {
  AccountExistsGuard,
  AccountActiveGuard,
  EmailVerifiedGuard,
  MagicLinkCooldownGuard
} from "../guards";
import type { LoginAuditService } from "../services/login-audit.service";
import type { LoginCompletionService } from "../services/login-completion.service";
// common
import { UnauthorizedError } from "@/common/exceptions";
// modules
import { LOGIN_METHODS } from "@/modules/login-history/constants";
// dtos
import { toMagicLinkSendDto } from "../dtos";
// others
import ENV from "@/constants/env";
import { EmailType } from "@/types/services/email";
import { ERROR_CODES } from "@/constants/error-code";
import { Logger, LogMethod } from "@/libs/logger";
import { withRetry } from "@/utils/resilience/retry";
import { MAGIC_LINK_CONFIG } from "../constants";

export class MagicLinkLoginStrategy {
  constructor(
    private readonly accountExistsGuard: AccountExistsGuard,
    private readonly accountActiveGuard: AccountActiveGuard,
    private readonly emailVerifiedGuard: EmailVerifiedGuard,
    private readonly magicLinkCooldownGuard: MagicLinkCooldownGuard,
    private readonly magicLinkLoginRepo: MagicLinkLoginRepository,
    private readonly emailDispatcher: EmailDispatcher,
    private readonly audit: LoginAuditService,
    private readonly completion: LoginCompletionService
  ) {}

  @LogMethod({ name: "Magic link send" })
  async sendLink(
    body: MagicLinkSendBody,
    req: Request
  ): Promise<MagicLinkSendDto> {
    const { email } = body;
    const { language } = req;

    await this.magicLinkCooldownGuard.assert(email);

    const result = await this.accountExistsGuard.tryFind(email);
    const isEligible = this.accountExistsGuard.isLoginEligible(result);

    if (!isEligible) {
      Logger.debug("Magic link send skipped — account not eligible", {
        email
      });
      withRetry(() => this.magicLinkLoginRepo.setCooldownAfterSend(email), {
        operationName: "setMagicLinkCooldown",
        context: { email }
      });
      return toMagicLinkSendDto(
        this.magicLinkLoginRepo.MAGIC_LINK_EXPIRY_SECONDS,
        this.magicLinkLoginRepo.MAGIC_LINK_COOLDOWN_SECONDS
      );
    }

    const token = await this.magicLinkLoginRepo.createAndStoreToken(email);

    withRetry(() => this.magicLinkLoginRepo.setCooldownAfterSend(email), {
      operationName: "setMagicLinkCooldown",
      context: { email }
    });

    const magicLinkUrl = `${ENV.CLIENT_URL}/login/verify-magic-link?token=${token}&email=${encodeURIComponent(email)}`;
    this.emailDispatcher.send(EmailType.MAGIC_LINK, {
      email,
      data: { magicLinkUrl, expiryMinutes: MAGIC_LINK_CONFIG.EXPIRY_MINUTES },
      locale: language as I18n.Locale
    });

    Logger.info("Magic link sent", {
      email,
      expiresIn: this.magicLinkLoginRepo.MAGIC_LINK_EXPIRY_SECONDS,
      cooldown: this.magicLinkLoginRepo.MAGIC_LINK_COOLDOWN_SECONDS
    });

    return toMagicLinkSendDto(
      this.magicLinkLoginRepo.MAGIC_LINK_EXPIRY_SECONDS,
      this.magicLinkLoginRepo.MAGIC_LINK_COOLDOWN_SECONDS
    );
  }

  @LogMethod({ name: "Magic link verification" })
  async verifyLink(
    body: MagicLinkVerifyBody,
    req: Request
  ): Promise<LoginResponseDto> {
    const { email, token } = body;

    const { auth, user } = await this.accountExistsGuard.assert(email);

    this.accountActiveGuard.assertWithAudit(
      auth,
      email,
      LOGIN_METHODS.MAGIC_LINK,
      req
    );
    this.emailVerifiedGuard.assertWithAudit(
      auth,
      email,
      LOGIN_METHODS.MAGIC_LINK,
      req
    );

    const isValid = await this.magicLinkLoginRepo.verifyToken(email, token);
    if (!isValid) {
      this.audit.recordInvalidMagicLink({ auth, email, req });
      throw new UnauthorizedError({
        i18nMessage: (t) => t("login:errors.invalidMagicLink"),
        code: ERROR_CODES.LOGIN_MAGIC_LINK_INVALID
      });
    }

    withRetry(() => this.magicLinkLoginRepo.cleanupAll(email), {
      operationName: "cleanupMagicLinkData",
      context: { email }
    });

    Logger.info("Magic link verified", { email });

    return this.completion.complete({
      auth,
      user,
      method: LOGIN_METHODS.MAGIC_LINK,
      req
    });
  }
}
