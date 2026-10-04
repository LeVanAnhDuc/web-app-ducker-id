jest.mock("@/utils/crypto/bcrypt");

// types
import type { AuthenticationService } from "@/modules/authentication/services";
import type { FPResetPasswordRequest } from "../../../types";
import type { ResetTokenRepository } from "../../../repositories/reset-token.repository";
import type { ForgotPasswordServiceDeps } from "../deps";
// common
import { UnauthorizedError } from "@/common/exceptions";
// others
import { hashValue } from "@/utils/crypto/bcrypt";
import { AuthExistsGuard, ResetTokenValidGuard } from "../../../guards";
import { ForgotPasswordAuditService } from "../../forgot-password-audit";
import { buildUserWithAuth } from "@test/factories/user-with-auth.factory";
import { createLoginHistoryServiceMock } from "@test/mocks/login-history-service.mock";
import { makeMockRequest } from "@test/helpers/request.helper";
import { ForgotPasswordService } from "../";

const mockedHash = hashValue as jest.MockedFunction<typeof hashValue>;

const EMAIL = "user@example.com";
const AUTH_ID = "auth-id-123";

const req = (over: Partial<FPResetPasswordRequest["body"]> = {}) =>
  makeMockRequest({
    body: {
      email: EMAIL,
      resetToken: "a-reset-token",
      newPassword: "Str0ng@New",
      ...over
    }
  }) as unknown as FPResetPasswordRequest;

const setup = () => {
  const authService = {
    updatePassword: jest.fn().mockResolvedValue(1)
  } as unknown as jest.Mocked<AuthenticationService>;

  const resetTokenRepo = {
    verify: jest.fn().mockResolvedValue(true),
    clear: jest.fn().mockResolvedValue(undefined)
  } as unknown as jest.Mocked<ResetTokenRepository>;

  const userService = {
    findByEmailWithAuth: jest.fn().mockResolvedValue(
      buildUserWithAuth({
        auth: { _id: AUTH_ID as never },
        user: { email: EMAIL }
      })
    )
  };

  const historyService = createLoginHistoryServiceMock();

  const deps = {
    authService,
    resetTokenRepo,
    otpStrategy: {},
    magicLinkStrategy: {},
    authExistsGuard: new AuthExistsGuard(userService as never),
    resetTokenValidGuard: new ResetTokenValidGuard(resetTokenRepo),
    audit: new ForgotPasswordAuditService(historyService)
  } as unknown as ForgotPasswordServiceDeps;

  return {
    authService,
    resetTokenRepo,
    userService,
    historyService,
    service: new ForgotPasswordService(deps)
  };
};

describe("ForgotPasswordService.resetPassword", () => {
  beforeEach(() => mockedHash.mockReturnValue("hashed-new-password"));

  it("stores the hashed password against the right auth record", async () => {
    const { service, authService } = setup();

    const result = await service.resetPassword(req());

    expect(mockedHash).toHaveBeenCalledWith("Str0ng@New");
    expect(authService.updatePassword).toHaveBeenCalledWith(
      AUTH_ID,
      "hashed-new-password"
    );
    expect(result).toEqual({ success: true });
  });

  it("burns the reset token so it cannot be replayed", async () => {
    const { service, resetTokenRepo } = setup();

    await service.resetPassword(req());

    expect(resetTokenRepo.clear).toHaveBeenCalledWith(EMAIL);
  });

  it("records the reset in login history", async () => {
    const { service, historyService } = setup();

    await service.resetPassword(req());

    expect(historyService.recordSuccessfulLogin).toHaveBeenCalledWith(
      expect.objectContaining({ usernameAttempted: EMAIL })
    );
  });

  it("rejects an invalid or expired reset token without touching the password", async () => {
    const { service, resetTokenRepo, authService } = setup();
    resetTokenRepo.verify.mockResolvedValue(false);

    await expect(service.resetPassword(req())).rejects.toThrow(
      UnauthorizedError
    );
    expect(authService.updatePassword).not.toHaveBeenCalled();
    expect(resetTokenRepo.clear).not.toHaveBeenCalled();
  });

  it("checks the token before the account is looked up", async () => {
    const { service, resetTokenRepo, userService } = setup();
    resetTokenRepo.verify.mockResolvedValue(false);

    await expect(service.resetPassword(req())).rejects.toThrow(
      UnauthorizedError
    );
    expect(userService.findByEmailWithAuth).not.toHaveBeenCalled();
  });

  it("rejects when the account behind a valid token is gone", async () => {
    const { service, userService, authService } = setup();
    userService.findByEmailWithAuth.mockResolvedValue(null);

    await expect(service.resetPassword(req())).rejects.toThrow(
      UnauthorizedError
    );
    expect(authService.updatePassword).not.toHaveBeenCalled();
  });
});
