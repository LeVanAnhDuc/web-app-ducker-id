// types
import type { EmailDispatcher } from "@/services/email/email.dispatcher";
import type { AuthenticationService } from "@/modules/authentication/authentication.service";
import type { LoginHistoryService } from "@/modules/login-history/login-history.service";
import type { LoginService } from "@/modules/login/services";
import type { Request } from "express";
import type { UnlockRequestBody, UnlockVerifyBody } from "./types";
import type { UnlockAccountRepository } from "./unlock-account.repository";
import type { UnlockRequestDto, UnlockVerifyDto } from "./dtos";
import type {
  CooldownGuard,
  RateLimitGuard,
  AuthExistsGuard,
  TempPasswordValidGuard
} from "./guards";
// common
import { BadRequestError } from "@/common/exceptions";
// modules
import { generateAuthTokensResponse } from "@/modules/authentication/helpers";
import { LOGIN_METHODS } from "@/modules/login-history/constants";
// dtos
import { toUnlockRequestDto, toUnlockVerifyDto } from "./dtos";
// others
import ENV from "@/constants/env";
import { generateTempPassword } from "@/utils/crypto/temp-password";
import { EmailType } from "@/types/services/email";
import { ERROR_CODES } from "@/constants/error-code";
import { Logger } from "@/libs/logger";
import { withRetry } from "@/utils/resilience/retry";

export class UnlockAccountService {
  constructor(
    private readonly authService: AuthenticationService,
    private readonly loginHistoryService: LoginHistoryService,
    private readonly loginService: LoginService,
    private readonly unlockAccountRepo: UnlockAccountRepository,
    private readonly emailDispatcher: EmailDispatcher,
    private readonly cooldownGuard: CooldownGuard,
    private readonly rateLimitGuard: RateLimitGuard,
    private readonly authExistsGuard: AuthExistsGuard,
    private readonly tempPasswordValidGuard: TempPasswordValidGuard
  ) {}

  async unlockRequest(
    body: UnlockRequestBody,
    req: Request
  ): Promise<UnlockRequestDto> {
    const { email } = body;
    const { language } = req;

    Logger.info("Processing unlock request", { email });

    await this.cooldownGuard.assert(email);
    await this.rateLimitGuard.assert(email);

    const result = await this.authExistsGuard.tryFind(email);

    if (!result) {
      Logger.warn("Unlock request for non-existent email", { email });
      await this.unlockAccountRepo.setCooldown(email);
      return toUnlockRequestDto();
    }

    const { auth } = result;

    if (!auth.isActive) {
      Logger.warn("Unlock request for disabled account", {
        email,
        authId: auth._id
      });
      throw new BadRequestError({
        i18nMessage: (t) => t("unlockAccount:errors.accountDisabled"),
        code: ERROR_CODES.UNLOCK_ACCOUNT_DISABLED
      });
    }

    const isLocked = await this.loginService.isEmailLocked(email);
    if (!isLocked) {
      Logger.info("Unlock request for non-locked account", {
        email,
        authId: auth._id
      });
      throw new BadRequestError({
        i18nMessage: (t) => t("unlockAccount:errors.accountNotLocked"),
        code: ERROR_CODES.UNLOCK_ACCOUNT_NOT_LOCKED
      });
    }

    const tempPassword = generateTempPassword();

    await this.unlockAccountRepo.storeTempPassword(email, tempPassword);

    Logger.info("Temporary password generated and saved", {
      email,
      authId: auth._id,
      expiresInSeconds: this.unlockAccountRepo.TEMP_PASSWORD_EXPIRY_SECONDS
    });

    this.emailDispatcher.send(EmailType.UNLOCK_TEMP_PASSWORD, {
      email,
      data: {
        tempPassword,
        loginUrl: ENV.CLIENT_URL || "http://localhost:3000/login"
      },
      locale: language as I18n.Locale
    });

    await this.unlockAccountRepo.setCooldown(email);

    Logger.info("Unlock email sent successfully", { email });

    return toUnlockRequestDto();
  }

  async unlockVerify(
    body: UnlockVerifyBody,
    req: Request
  ): Promise<UnlockVerifyDto> {
    const { email, tempPassword } = body;

    Logger.info("Processing unlock verify", { email });

    const { auth, user } = await this.authExistsGuard.assert(email);

    await this.tempPasswordValidGuard.assert(email, tempPassword);

    Logger.info("Temp password verified successfully", {
      email,
      authId: auth._id
    });

    withRetry(() => this.loginService.resetFailedAttempts(email), {
      operationName: "resetFailedAttemptsAfterUnlock",
      context: { email }
    });

    await this.authService.requirePasswordChange(auth._id.toString());

    Logger.info("Password change required after unlock", {
      email,
      authId: auth._id
    });

    this.loginHistoryService.recordSuccessfulLogin({
      userId: auth._id,
      usernameAttempted: email,
      loginMethod: LOGIN_METHODS.PASSWORD,
      req
    });

    Logger.info("Unlock successful - tokens generated", {
      email,
      authId: auth._id
    });

    return toUnlockVerifyDto(
      generateAuthTokensResponse({
        userId: user._id.toString(),
        authId: auth._id.toString(),
        email: user.email,
        roles: auth.roles,
        fullName: user.fullName,
        avatar: user.avatar ?? null,
        tokenVersion: auth.tokenVersion ?? 0,
        // `auth` được đọc trước khi requirePasswordChange() chạy nên cờ trong
        // doc đó đã cũ — mở khoá xong thì bắt buộc đổi mật khẩu, luôn là true.
        mustChangePassword: true
      })
    );
  }
}
