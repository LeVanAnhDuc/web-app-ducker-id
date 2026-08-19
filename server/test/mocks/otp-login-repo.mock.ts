// types
import type { OtpLoginRepository } from "@/modules/login/repositories";
// modules
import { LOGIN_OTP_CONFIG } from "@/modules/login/constants";
// others
import { SECONDS_PER_MINUTE } from "@/constants/time";

export function createOtpLoginRepoMock(): jest.Mocked<OtpLoginRepository> {
  return {
    OTP_EXPIRY_SECONDS: LOGIN_OTP_CONFIG.EXPIRY_MINUTES * SECONDS_PER_MINUTE,
    OTP_COOLDOWN_SECONDS: LOGIN_OTP_CONFIG.COOLDOWN_SECONDS,
    createOtp: jest.fn(),
    storeHashed: jest.fn(),
    clearOtp: jest.fn(),
    verify: jest.fn(),
    getCooldownRemaining: jest.fn(),
    setCooldown: jest.fn(),
    clearCooldown: jest.fn(),
    incrementFailedAttempts: jest.fn(),
    getFailedAttemptCount: jest.fn(),
    clearFailedAttempts: jest.fn(),
    isLocked: jest.fn(),
    incrementResendCount: jest.fn(),
    getResendAttemptCount: jest.fn(),
    clearResendCount: jest.fn(),
    hasExceededResendLimit: jest.fn(),
    createAndStoreOtp: jest.fn(),
    setRateLimits: jest.fn(),
    cleanupAll: jest.fn()
  } as unknown as jest.Mocked<OtpLoginRepository>;
}
