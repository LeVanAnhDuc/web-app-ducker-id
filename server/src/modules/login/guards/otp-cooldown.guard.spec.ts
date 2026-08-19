// types
import type { Request } from "express";
import type { OtpLoginRepository } from "../repositories";
// common
import { BadRequestError } from "@/common/exceptions";
// others
import { makeMockRequest } from "@test/helpers/request.helper";
import { createOtpLoginRepoMock } from "@test/mocks/otp-login-repo.mock";
import { OtpCooldownGuard } from "./otp-cooldown.guard";
import { ERROR_CODES } from "@/constants/error-code";

const EMAIL = "user@example.com";

describe("OtpCooldownGuard", () => {
  let req: Request;
  let tSpy: jest.Mock;
  let repo: jest.Mocked<OtpLoginRepository>;
  let guard: OtpCooldownGuard;

  beforeEach(() => {
    req = makeMockRequest();
    tSpy = req.t as unknown as jest.Mock;
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
    (error as BadRequestError).i18nMessage?.(req.t);
    expect(tSpy).toHaveBeenCalledWith("login:errors.otpCooldown", {
      seconds: 42
    });
  });
});
