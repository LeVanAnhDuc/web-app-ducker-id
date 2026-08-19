// libs
import mongoose from "mongoose";
// types
import type { EmailDispatcher } from "@/services/email/email.dispatcher";
import type { Gender } from "@/modules/user/types";
import type { AuthenticationService } from "@/modules/authentication/authentication.service";
import type { UserService } from "@/modules/user/user.service";
import type {
  SendOtpBody,
  VerifyOtpBody,
  ResendOtpBody,
  CompleteSignupBody,
  CheckEmailParams
} from "./types";
import type { Schema } from "mongoose";
import type { Request } from "express";
import type {
  OtpSignupRepository,
  SessionSignupRepository
} from "./repositories";
import type {
  SendOtpDto,
  VerifyOtpDto,
  ResendOtpDto,
  CompleteSignupDto,
  CheckEmailDto
} from "./dtos";
import type { EmailAvailableGuard, CooldownGuard } from "./guards";
// common
import {
  BadRequestError,
  ConflictRequestError,
  InternalServerError
} from "@/common/exceptions";
// modules
import { generateAuthTokensResponse } from "@/modules/authentication/helpers";
import { AUTHENTICATION_ROLES } from "@/modules/authentication/constants";
// dtos
import {
  toSendOtpDto,
  toVerifyOtpDto,
  toResendOtpDto,
  toCompleteSignupDto,
  toCheckEmailDto
} from "./dtos";
// others
import { EmailType } from "@/types/services/email";
import { ERROR_CODES } from "@/constants/error-code";
import { Logger, LogMethod } from "@/libs/logger";
import { hashValue } from "@/utils/crypto/bcrypt";
import { isDuplicateKeyError, getDuplicatedField } from "@/utils/mongo-errors";
import { OTP_CONFIG, SESSION_CONFIG } from "./constants";
import { SECONDS_PER_MINUTE, MINUTES_PER_HOUR } from "@/constants/time";

const OTP_EXPIRY_SECONDS = OTP_CONFIG.EXPIRY_MINUTES * SECONDS_PER_MINUTE;
const OTP_COOLDOWN_SECONDS = OTP_CONFIG.RESEND_COOLDOWN_SECONDS;
const RESEND_WINDOW_SECONDS = MINUTES_PER_HOUR * SECONDS_PER_MINUTE;
const MAX_RESEND_COUNT = OTP_CONFIG.MAX_RESEND_COUNT;
const MAX_FAILED_ATTEMPTS = OTP_CONFIG.MAX_FAILED_ATTEMPTS;
const LOCKOUT_DURATION_MINUTES = OTP_CONFIG.LOCKOUT_DURATION_MINUTES;
const SESSION_EXPIRY_SECONDS =
  SESSION_CONFIG.EXPIRY_MINUTES * SECONDS_PER_MINUTE;

export class SignupService {
  constructor(
    private readonly authService: AuthenticationService,
    private readonly userService: UserService,
    private readonly otpSignupRepo: OtpSignupRepository,
    private readonly sessionSignupRepo: SessionSignupRepository,
    private readonly emailDispatcher: EmailDispatcher,
    private readonly emailAvailableGuard: EmailAvailableGuard,
    private readonly cooldownGuard: CooldownGuard
  ) {}

  @LogMethod({ name: "SendOtp" })
  async sendOtp(body: SendOtpBody, req: Request): Promise<SendOtpDto> {
    const { email } = body;
    const { language } = req;

    await this.cooldownGuard.assert(email);
    await this.emailAvailableGuard.assert(email);

    const otp = await this.otpSignupRepo.createAndStoreOtp(
      email,
      OTP_EXPIRY_SECONDS
    );

    await this.otpSignupRepo.setCooldown(email, OTP_COOLDOWN_SECONDS);

    this.emailDispatcher.send(EmailType.SIGNUP_OTP, {
      email,
      data: { otp, expiryMinutes: OTP_CONFIG.EXPIRY_MINUTES },
      locale: language as I18n.Locale
    });

    Logger.info("Signup OTP sent", {
      email,
      expiresIn: OTP_EXPIRY_SECONDS,
      cooldownSeconds: OTP_COOLDOWN_SECONDS
    });

    return toSendOtpDto(OTP_EXPIRY_SECONDS, OTP_COOLDOWN_SECONDS);
  }

  @LogMethod({ name: "VerifyOtp" })
  async verifyOtp(body: VerifyOtpBody): Promise<VerifyOtpDto> {
    const { email, otp } = body;

    const isLocked = await this.otpSignupRepo.isLocked(
      email,
      MAX_FAILED_ATTEMPTS
    );

    if (isLocked) {
      Logger.warn("OTP account locked", {
        email,
        maxAttempts: MAX_FAILED_ATTEMPTS
      });
      throw new BadRequestError({
        i18nMessage: (t) => t("signup:errors.otpAttemptsExceeded"),
        code: ERROR_CODES.SIGNUP_OTP_LOCKED
      });
    }

    await this.verifyOtpOrFail(email, otp);

    const sessionToken = await this.sessionSignupRepo.createAndStore(
      email,
      SESSION_EXPIRY_SECONDS
    );

    await this.otpSignupRepo.cleanupOtpData(email);

    Logger.info("Signup session issued", {
      email,
      sessionExpiresIn: SESSION_EXPIRY_SECONDS
    });

    return toVerifyOtpDto(sessionToken, SESSION_EXPIRY_SECONDS);
  }

  @LogMethod({ name: "ResendOtp" })
  async resendOtp(body: ResendOtpBody, req: Request): Promise<ResendOtpDto> {
    const { email } = body;
    const { language } = req;

    await this.cooldownGuard.assert(email);

    const exceeded = await this.otpSignupRepo.hasExceededResendLimit(
      email,
      MAX_RESEND_COUNT
    );

    if (exceeded) {
      Logger.warn("Resend OTP limit exceeded", {
        email,
        maxResends: MAX_RESEND_COUNT
      });
      throw new BadRequestError({
        i18nMessage: (t) => t("signup:errors.resendLimitExceeded"),
        code: ERROR_CODES.SIGNUP_RESEND_LIMIT
      });
    }

    await this.emailAvailableGuard.assert(email);

    const otp = await this.otpSignupRepo.createAndStoreOtp(
      email,
      OTP_EXPIRY_SECONDS
    );

    await this.otpSignupRepo.setCooldown(email, OTP_COOLDOWN_SECONDS);

    const currentResendCount = await this.otpSignupRepo.incrementResendCount(
      email,
      RESEND_WINDOW_SECONDS
    );

    Logger.debug("Resend attempt tracked", {
      email,
      currentCount: currentResendCount,
      maxResends: MAX_RESEND_COUNT,
      windowSeconds: RESEND_WINDOW_SECONDS
    });

    this.emailDispatcher.send(EmailType.SIGNUP_OTP, {
      email,
      data: { otp, expiryMinutes: OTP_CONFIG.EXPIRY_MINUTES },
      locale: language as I18n.Locale
    });

    Logger.info("Signup OTP resent", {
      email,
      resendCount: currentResendCount,
      maxResends: MAX_RESEND_COUNT
    });

    return toResendOtpDto(
      OTP_EXPIRY_SECONDS,
      OTP_COOLDOWN_SECONDS,
      currentResendCount,
      MAX_RESEND_COUNT
    );
  }

  @LogMethod({ name: "CompleteSignup" })
  async completeSignup(body: CompleteSignupBody): Promise<CompleteSignupDto> {
    const { email, password, fullName, gender, dateOfBirth, sessionToken } =
      body;

    const isValid = await this.sessionSignupRepo.verify(email, sessionToken);

    if (!isValid) {
      Logger.warn("Invalid or expired signup session", { email });
      throw new BadRequestError({
        i18nMessage: (t) => t("signup:errors.invalidSession"),
        code: ERROR_CODES.SIGNUP_SESSION_INVALID
      });
    }

    await this.emailAvailableGuard.assert(email);

    const account = await this.createUserAccount(
      email,
      password,
      fullName,
      gender,
      dateOfBirth
    );

    const tokens = generateAuthTokensResponse({
      userId: account.userId.toString(),
      authId: account.authId.toString(),
      email: account.email,
      roles: AUTHENTICATION_ROLES.USER,
      fullName: account.fullName,
      avatar: null,
      // Freshly-created auth → schema defaults: tokenVersion 0, mustChangePassword false.
      tokenVersion: 0,
      mustChangePassword: false
    });

    await Promise.all([
      this.otpSignupRepo.cleanupOtpData(email),
      this.sessionSignupRepo.clear(email)
    ]);

    Logger.debug("Signup data cleaned up", { email });

    Logger.info("New user registered", {
      email,
      userId: account.userId.toString()
    });

    return toCompleteSignupDto(account, tokens);
  }

  @LogMethod({ name: "CheckEmail" })
  async checkEmail(params: CheckEmailParams): Promise<CheckEmailDto> {
    const { email } = params;

    const exists = await this.userService.emailExists(email);

    return toCheckEmailDto(!exists);
  }

  private async verifyOtpOrFail(email: string, otp: string): Promise<void> {
    const isValid = await this.otpSignupRepo.verify(email, otp);

    if (isValid) return;

    const failedCount = await this.otpSignupRepo.incrementFailedAttempts(
      email,
      LOCKOUT_DURATION_MINUTES
    );

    Logger.warn("Invalid OTP attempt", {
      email,
      failedCount,
      lockoutDurationMinutes: LOCKOUT_DURATION_MINUTES
    });

    const remaining = MAX_FAILED_ATTEMPTS - failedCount;

    if (remaining > 0) {
      throw new BadRequestError({
        i18nMessage: (t) =>
          t("signup:errors.invalidOtpWithRemaining", { remaining }),
        code: ERROR_CODES.SIGNUP_OTP_INVALID
      });
    }

    throw new BadRequestError({
      i18nMessage: (t) => t("signup:errors.otpAttemptsExceeded"),
      code: ERROR_CODES.SIGNUP_OTP_LOCKED
    });
  }

  private async createUserAccount(
    email: string,
    password: string,
    fullName: string,
    gender: Gender,
    dateOfBirth: string
  ): Promise<{
    authId: Schema.Types.ObjectId;
    userId: Schema.Types.ObjectId;
    email: string;
    fullName: string;
  }> {
    const session = await mongoose.startSession();

    try {
      const result = await session.withTransaction(async () => {
        const hashedPassword = hashValue(password);

        const auth = await this.authService.create({ hashedPassword }, session);

        Logger.debug("Auth record created", {
          email,
          authId: auth._id.toString()
        });

        const user = await this.userService.createProfile(
          {
            authId: auth._id,
            email,
            fullName,
            gender,
            dateOfBirth: new Date(dateOfBirth)
          },
          session
        );

        Logger.info("User profile created", {
          userId: user._id.toString(),
          authId: auth._id.toString()
        });

        return { authId: auth._id, userId: user._id, email, fullName };
      });

      if (!result) {
        throw new InternalServerError({
          message: "Signup transaction was aborted"
        });
      }

      return result;
    } catch (err) {
      if (isDuplicateKeyError(err) && getDuplicatedField(err) === "email") {
        Logger.warn("Signup email duplicate key (race condition)", { email });
        throw new ConflictRequestError({
          i18nMessage: (t) => t("signup:errors.emailAlreadyExists"),
          code: ERROR_CODES.SIGNUP_EMAIL_EXISTS
        });
      }
      throw err;
    } finally {
      await session.endSession();
    }
  }
}
