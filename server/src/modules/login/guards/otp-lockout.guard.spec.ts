// types
import type { OtpLoginRepository } from "../repositories";
// common
import { TooManyRequestsError } from "@/common/exceptions";
// others
import { createOtpLoginRepoMock } from "@test/mocks/otp-login-repo.mock";
import { OtpLockoutGuard } from "./otp-lockout.guard";
import { ERROR_CODES } from "@/constants/error-code";
import { LOGIN_OTP_CONFIG } from "../constants";

const EMAIL = "user@example.com";

describe("OtpLockoutGuard", () => {
  let repo: jest.Mocked<OtpLoginRepository>;
  let guard: OtpLockoutGuard;

  beforeEach(() => {
    repo = createOtpLoginRepoMock();
    guard = new OtpLockoutGuard(repo);
  });

  it("returns silently when not locked", async () => {
    repo.isLocked.mockResolvedValue(false);

    await expect(guard.assert(EMAIL)).resolves.toBeUndefined();
    expect(repo.getFailedAttemptCount).not.toHaveBeenCalled();
  });

  it("throws LOGIN_OTP_LOCKED when locked", async () => {
    repo.isLocked.mockResolvedValue(true);
    repo.getFailedAttemptCount.mockResolvedValue(
      LOGIN_OTP_CONFIG.MAX_FAILED_ATTEMPTS
    );

    const promise = guard.assert(EMAIL);

    await expect(promise).rejects.toBeInstanceOf(TooManyRequestsError);
    await expect(promise).rejects.toMatchObject({
      code: ERROR_CODES.LOGIN_OTP_LOCKED
    });
  });
});
