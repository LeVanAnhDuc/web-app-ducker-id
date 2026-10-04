// types
import type { FPOtpSendRequest, FPOtpVerifyRequest } from "../../../types";
import type { OtpForgotPasswordRepository } from "../../../repositories/otp-forgot-password.repository";
import type { ResetTokenRepository } from "../../../repositories/reset-token.repository";
import type { OtpForgotPasswordStrategyDeps } from "../deps";
// common
import { BadRequestError, UnauthorizedError } from "@/common/exceptions";
// others
import { EmailType } from "@/types/services/email";
import {
  AuthExistsGuard,
  OtpCooldownGuard,
  OtpLockoutGuard,
  OtpResendLimitGuard
} from "../../../guards";
import { ForgotPasswordAuditService } from "../../../services/forgot-password-audit";
import { FORGOT_PASSWORD_OTP_CONFIG } from "../../../constants";
import { buildUserWithAuth } from "@test/factories/user-with-auth.factory";
import { createEmailDispatcherMock } from "@test/mocks/email-dispatcher.mock";
import { createLoginHistoryServiceMock } from "@test/mocks/login-history-service.mock";
import { makeMockRequest } from "@test/helpers/request.helper";
import { OtpForgotPasswordStrategy } from "../";

const EMAIL = "user@example.com";
const EXPIRY = 300;
const COOLDOWN = 60;

const sendReq = () =>
  makeMockRequest({ body: { email: EMAIL } }) as unknown as FPOtpSendRequest;

const verifyReq = () =>
  makeMockRequest({
    body: { email: EMAIL, otp: "123456" }
  }) as unknown as FPOtpVerifyRequest;

const setup = () => {
  const otpRepo = {
    OTP_EXPIRY_SECONDS: EXPIRY,
    OTP_COOLDOWN_SECONDS: COOLDOWN,
    getCooldownRemaining: jest.fn().mockResolvedValue(0),
    hasExceededResendLimit: jest.fn().mockResolvedValue(false),
    isLocked: jest.fn().mockResolvedValue(false),
    getFailedAttemptCount: jest.fn().mockResolvedValue(0),
    createAndStoreOtp: jest.fn().mockResolvedValue("123456"),
    setRateLimits: jest.fn().mockResolvedValue(undefined),
    verify: jest.fn().mockResolvedValue(true),
    incrementFailedAttempts: jest.fn().mockResolvedValue(1),
    cleanupAll: jest.fn().mockResolvedValue(undefined)
  } as unknown as jest.Mocked<OtpForgotPasswordRepository>;

  const resetTokenRepo = {
    createAndStore: jest.fn().mockResolvedValue("reset-token")
  } as unknown as jest.Mocked<ResetTokenRepository>;

  const userService = {
    findByEmailWithAuth: jest
      .fn()
      .mockResolvedValue(buildUserWithAuth({ user: { email: EMAIL } }))
  };

  const emailDispatcher = createEmailDispatcherMock();
  const historyService = createLoginHistoryServiceMock();

  const deps = {
    otpRepo,
    resetTokenRepo,
    emailDispatcher,
    cooldownGuard: new OtpCooldownGuard(otpRepo),
    resendLimitGuard: new OtpResendLimitGuard(otpRepo),
    lockoutGuard: new OtpLockoutGuard(otpRepo),
    authExistsGuard: new AuthExistsGuard(userService as never),
    audit: new ForgotPasswordAuditService(historyService)
  } as unknown as OtpForgotPasswordStrategyDeps;

  return {
    otpRepo,
    resetTokenRepo,
    userService,
    emailDispatcher,
    historyService,
    strategy: new OtpForgotPasswordStrategy(deps)
  };
};

describe("OtpForgotPasswordStrategy.sendCode", () => {
  it("sends an OTP for a real, active account", async () => {
    const { strategy, otpRepo, emailDispatcher } = setup();

    const result = await strategy.sendCode(sendReq());

    expect(otpRepo.createAndStoreOtp).toHaveBeenCalledWith(EMAIL);
    expect(emailDispatcher.send).toHaveBeenCalledWith(
      EmailType.FORGOT_PASSWORD_OTP,
      expect.objectContaining({ email: EMAIL })
    );
    expect(result).toEqual({
      success: true,
      expiresIn: EXPIRY,
      cooldown: COOLDOWN
    });
  });

  it("reports the same success for an unknown email, and sends nothing", async () => {
    const { strategy, userService, otpRepo, emailDispatcher } = setup();
    userService.findByEmailWithAuth.mockResolvedValue(null);

    const result = await strategy.sendCode(sendReq());

    expect(result).toEqual({
      success: true,
      expiresIn: EXPIRY,
      cooldown: COOLDOWN
    });
    expect(otpRepo.createAndStoreOtp).not.toHaveBeenCalled();
    expect(emailDispatcher.send).not.toHaveBeenCalled();
  });

  it("treats a disabled account the same way, so it cannot be probed", async () => {
    const { strategy, userService, emailDispatcher } = setup();
    userService.findByEmailWithAuth.mockResolvedValue(
      buildUserWithAuth({ auth: { isActive: false }, user: { email: EMAIL } })
    );

    const result = await strategy.sendCode(sendReq());

    expect(result.success).toBe(true);
    expect(emailDispatcher.send).not.toHaveBeenCalled();
  });

  it("refuses while the cooldown is running", async () => {
    const { strategy, otpRepo } = setup();
    otpRepo.getCooldownRemaining.mockResolvedValue(30);

    await expect(strategy.sendCode(sendReq())).rejects.toThrow(BadRequestError);
  });

  it("refuses once the resend limit is spent", async () => {
    const { strategy, otpRepo } = setup();
    otpRepo.hasExceededResendLimit.mockResolvedValue(true);

    await expect(strategy.sendCode(sendReq())).rejects.toThrow(BadRequestError);
  });
});

describe("OtpForgotPasswordStrategy.verifyCode", () => {
  it("returns a reset token and clears the OTP data", async () => {
    const { strategy, otpRepo, resetTokenRepo } = setup();

    const result = await strategy.verifyCode(verifyReq());

    expect(resetTokenRepo.createAndStore).toHaveBeenCalledWith(EMAIL);
    expect(otpRepo.cleanupAll).toHaveBeenCalledWith(EMAIL);
    expect(result).toEqual({ success: true, resetToken: "reset-token" });
  });

  it("refuses an unknown email outright, unlike sendCode", async () => {
    const { strategy, userService } = setup();
    userService.findByEmailWithAuth.mockResolvedValue(null);

    await expect(strategy.verifyCode(verifyReq())).rejects.toThrow(
      UnauthorizedError
    );
  });

  it("records a wrong OTP and issues no reset token", async () => {
    const { strategy, otpRepo, resetTokenRepo, historyService } = setup();
    otpRepo.verify.mockResolvedValue(false);
    otpRepo.incrementFailedAttempts.mockResolvedValue(1);

    await expect(strategy.verifyCode(verifyReq())).rejects.toThrow(
      UnauthorizedError
    );
    expect(historyService.recordFailedLogin).toHaveBeenCalled();
    expect(resetTokenRepo.createAndStore).not.toHaveBeenCalled();
  });

  it("switches to a lockout error on the attempt that exhausts the allowance", async () => {
    const { strategy, otpRepo } = setup();
    otpRepo.verify.mockResolvedValue(false);
    otpRepo.incrementFailedAttempts.mockResolvedValue(
      FORGOT_PASSWORD_OTP_CONFIG.MAX_FAILED_ATTEMPTS
    );

    await expect(strategy.verifyCode(verifyReq())).rejects.toThrow(
      BadRequestError
    );
  });

  it("refuses before verifying once the account is locked", async () => {
    const { strategy, otpRepo } = setup();
    otpRepo.isLocked.mockResolvedValue(true);

    await expect(strategy.verifyCode(verifyReq())).rejects.toThrow(
      BadRequestError
    );
    expect(otpRepo.verify).not.toHaveBeenCalled();
  });
});
