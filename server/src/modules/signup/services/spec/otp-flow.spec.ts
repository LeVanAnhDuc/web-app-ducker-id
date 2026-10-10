// types
import type { EmailDispatcher } from "@/services/email/email.dispatcher";
import type { OtpSignupRepository } from "../../repositories/otp-signup.repository";
import type { SessionSignupRepository } from "../../repositories/session-signup.repository";
import type { SignupServiceDeps } from "../deps";
// common
import { BadRequestError, ConflictRequestError } from "@/common/exceptions";
// others
import { EmailType } from "@/types/services/email";
import { CooldownGuard, EmailAvailableGuard } from "../../guards";
import {
  MAX_FAILED_ATTEMPTS,
  MAX_RESEND_COUNT,
  OTP_COOLDOWN_SECONDS,
  OTP_EXPIRY_SECONDS,
  SESSION_EXPIRY_SECONDS
} from "../../constants";
import { createEmailDispatcherMock } from "@test/mocks/email-dispatcher.mock";
import { makeMockRequest } from "@test/helpers/request.helper";
import { SignupService } from "../";

const EMAIL = "new@example.com";

/**
 * The two guards are real: both are a single repository read plus a throw, so
 * stubbing them would leave the cooldown and duplicate-email branches untested.
 */
const setup = () => {
  const otpSignupRepo = {
    getCooldownRemaining: jest.fn().mockResolvedValue(0),
    createAndStoreOtp: jest.fn().mockResolvedValue("123456"),
    setCooldown: jest.fn().mockResolvedValue(undefined),
    isLocked: jest.fn().mockResolvedValue(false),
    verify: jest.fn().mockResolvedValue(true),
    incrementFailedAttempts: jest.fn().mockResolvedValue(1),
    hasExceededResendLimit: jest.fn().mockResolvedValue(false),
    incrementResendCount: jest.fn().mockResolvedValue(1),
    cleanupOtpData: jest.fn().mockResolvedValue(undefined)
  } as unknown as jest.Mocked<OtpSignupRepository>;

  const sessionSignupRepo = {
    createAndStore: jest.fn().mockResolvedValue("session-token"),
    clear: jest.fn().mockResolvedValue(undefined)
  } as unknown as jest.Mocked<SessionSignupRepository>;

  const userService = {
    emailExists: jest.fn().mockResolvedValue(false)
  };

  const emailDispatcher = createEmailDispatcherMock();

  const deps = {
    authService: {},
    userService,
    otpSignupRepo,
    sessionSignupRepo,
    emailDispatcher,
    emailAvailableGuard: new EmailAvailableGuard(userService as never),
    cooldownGuard: new CooldownGuard(otpSignupRepo)
  } as unknown as SignupServiceDeps;

  return {
    deps,
    otpSignupRepo,
    sessionSignupRepo,
    userService,
    emailDispatcher: emailDispatcher as jest.Mocked<EmailDispatcher>,
    service: new SignupService(deps)
  };
};

describe("SignupService.sendOtp", () => {
  it("stores an OTP, sets the cooldown and queues the email", async () => {
    const { service, otpSignupRepo, emailDispatcher } = setup();

    const result = await service.sendOtp({ email: EMAIL }, makeMockRequest());

    expect(otpSignupRepo.createAndStoreOtp).toHaveBeenCalledWith(
      EMAIL,
      OTP_EXPIRY_SECONDS
    );
    expect(otpSignupRepo.setCooldown).toHaveBeenCalledWith(
      EMAIL,
      OTP_COOLDOWN_SECONDS
    );
    expect(emailDispatcher.send).toHaveBeenCalledWith(
      EmailType.SIGNUP_OTP,
      expect.objectContaining({ email: EMAIL })
    );
    expect(result).toEqual({
      success: true,
      expiresIn: OTP_EXPIRY_SECONDS,
      cooldownSeconds: OTP_COOLDOWN_SECONDS
    });
  });

  it("sends the email in the language of the request", async () => {
    const { service, emailDispatcher } = setup();

    await service.sendOtp(
      { email: EMAIL },
      makeMockRequest({ language: "vi" })
    );

    expect(emailDispatcher.send).toHaveBeenCalledWith(
      EmailType.SIGNUP_OTP,
      expect.objectContaining({ locale: "vi" })
    );
  });

  it("refuses while the cooldown is still running", async () => {
    const { service, otpSignupRepo, emailDispatcher } = setup();
    otpSignupRepo.getCooldownRemaining.mockResolvedValue(42);

    await expect(
      service.sendOtp({ email: EMAIL }, makeMockRequest())
    ).rejects.toThrow(BadRequestError);
    expect(emailDispatcher.send).not.toHaveBeenCalled();
  });

  it("refuses an email that already has an account", async () => {
    const { service, userService, otpSignupRepo } = setup();
    userService.emailExists.mockResolvedValue(true);

    await expect(
      service.sendOtp({ email: EMAIL }, makeMockRequest())
    ).rejects.toThrow(ConflictRequestError);
    expect(otpSignupRepo.createAndStoreOtp).not.toHaveBeenCalled();
  });

  it("checks the cooldown before the email is even looked up", async () => {
    const { service, otpSignupRepo, userService } = setup();
    otpSignupRepo.getCooldownRemaining.mockResolvedValue(10);

    await expect(
      service.sendOtp({ email: EMAIL }, makeMockRequest())
    ).rejects.toThrow(BadRequestError);
    expect(userService.emailExists).not.toHaveBeenCalled();
  });
});

describe("SignupService.verifyOtp", () => {
  const body = { email: EMAIL, otp: "123456" };

  it("issues a signup session and clears the OTP data", async () => {
    const { service, otpSignupRepo, sessionSignupRepo } = setup();

    const result = await service.verifyOtp(body);

    expect(sessionSignupRepo.createAndStore).toHaveBeenCalledWith(
      EMAIL,
      SESSION_EXPIRY_SECONDS
    );
    expect(otpSignupRepo.cleanupOtpData).toHaveBeenCalledWith(EMAIL);
    expect(result).toEqual({
      success: true,
      sessionToken: "session-token",
      expiresIn: SESSION_EXPIRY_SECONDS
    });
  });

  it("refuses outright once the account is locked", async () => {
    const { service, otpSignupRepo } = setup();
    otpSignupRepo.isLocked.mockResolvedValue(true);

    await expect(service.verifyOtp(body)).rejects.toThrow(BadRequestError);
    expect(otpSignupRepo.verify).not.toHaveBeenCalled();
  });

  it("counts a wrong OTP and reports the attempts left", async () => {
    const { service, otpSignupRepo, sessionSignupRepo } = setup();
    otpSignupRepo.verify.mockResolvedValue(false);
    otpSignupRepo.incrementFailedAttempts.mockResolvedValue(2);

    await expect(service.verifyOtp(body)).rejects.toThrow(BadRequestError);
    expect(otpSignupRepo.incrementFailedAttempts).toHaveBeenCalled();
    expect(sessionSignupRepo.createAndStore).not.toHaveBeenCalled();
  });

  it("locks out on the attempt that exhausts the allowance", async () => {
    const { service, otpSignupRepo } = setup();
    otpSignupRepo.verify.mockResolvedValue(false);
    otpSignupRepo.incrementFailedAttempts.mockResolvedValue(
      MAX_FAILED_ATTEMPTS
    );

    await expect(service.verifyOtp(body)).rejects.toThrow(BadRequestError);
  });
});

describe("SignupService.resendOtp", () => {
  it("issues a new OTP and reports the resend budget", async () => {
    const { service, otpSignupRepo } = setup();
    otpSignupRepo.incrementResendCount.mockResolvedValue(2);

    const result = await service.resendOtp({ email: EMAIL }, makeMockRequest());

    expect(result).toEqual({
      success: true,
      expiresIn: OTP_EXPIRY_SECONDS,
      cooldownSeconds: OTP_COOLDOWN_SECONDS,
      resendCount: 2,
      maxResends: MAX_RESEND_COUNT,
      remainingResends: MAX_RESEND_COUNT - 2
    });
  });

  it("refuses once the hourly resend limit is spent", async () => {
    const { service, otpSignupRepo, emailDispatcher } = setup();
    otpSignupRepo.hasExceededResendLimit.mockResolvedValue(true);

    await expect(
      service.resendOtp({ email: EMAIL }, makeMockRequest())
    ).rejects.toThrow(BadRequestError);
    expect(emailDispatcher.send).not.toHaveBeenCalled();
  });

  it("re-checks that the email is still free before resending", async () => {
    const { service, userService, otpSignupRepo } = setup();
    userService.emailExists.mockResolvedValue(true);

    await expect(
      service.resendOtp({ email: EMAIL }, makeMockRequest())
    ).rejects.toThrow(ConflictRequestError);
    expect(otpSignupRepo.createAndStoreOtp).not.toHaveBeenCalled();
  });
});

describe("SignupService.checkEmail", () => {
  it("reports an unused email as available", async () => {
    const { service } = setup();

    await expect(service.checkEmail({ email: EMAIL })).resolves.toEqual({
      available: true
    });
  });

  it("reports a taken email as unavailable", async () => {
    const { service, userService } = setup();
    userService.emailExists.mockResolvedValue(true);

    await expect(service.checkEmail({ email: EMAIL })).resolves.toEqual({
      available: false
    });
  });
});
