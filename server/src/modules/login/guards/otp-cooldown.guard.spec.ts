// types
import type { OtpLoginRepository } from "../repositories/otp-login.repository";
// common
import { BadRequestError } from "@/exceptions";
// others
import { createOtpLoginRepoMock } from "@test/mocks/otp-login-repo.mock";
import { OtpCooldownGuard } from "./otp-cooldown.guard";
import { ERROR_CODES } from "@/constants/error-code";

const EMAIL = "user@example.com";

describe("OtpCooldownGuard", () => {
  let repo: jest.Mocked<OtpLoginRepository>;
  let guard: OtpCooldownGuard;

  beforeEach(() => {
    repo = createOtpLoginRepoMock();
    guard = new OtpCooldownGuard(repo);
  });

  it("returns silently when cooldown has expired", async () => {
    repo.getCooldownRemaining.mockResolvedValue(0);

    await expect(guard.assert(EMAIL)).resolves.toBeUndefined();
  });

  it("throws LOGIN_OTP_COOLDOWN with interpolated seconds when cooldown is active", async () => {
    repo.getCooldownRemaining.mockResolvedValue(42);

    const error = await guard.assert(EMAIL).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(BadRequestError);
    expect((error as BadRequestError).code).toBe(
      ERROR_CODES.LOGIN_OTP_COOLDOWN
    );
    expect((error as BadRequestError).key).toBe("login:errors.otpCooldown");
    expect((error as BadRequestError).params).toEqual({
      seconds: 42
    });
  });
});
