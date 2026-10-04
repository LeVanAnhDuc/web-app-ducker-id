// types
import type {
  FPMagicLinkSendRequest,
  FPMagicLinkVerifyRequest
} from "../../../types";
import type { MagicLinkForgotPasswordRepository } from "../../../repositories/magic-link-forgot-password.repository";
import type { ResetTokenRepository } from "../../../repositories/reset-token.repository";
import type { MagicLinkForgotPasswordStrategyDeps } from "../deps";
// common
import { BadRequestError, UnauthorizedError } from "@/common/exceptions";
// others
import { EmailType } from "@/types/services/email";
import {
  AuthExistsGuard,
  MagicLinkCooldownGuard,
  MagicLinkResendLimitGuard
} from "../../../guards";
import { ForgotPasswordAuditService } from "../../../services/forgot-password-audit";
import { buildUserWithAuth } from "@test/factories/user-with-auth.factory";
import { createEmailDispatcherMock } from "@test/mocks/email-dispatcher.mock";
import { createLoginHistoryServiceMock } from "@test/mocks/login-history-service.mock";
import { makeMockRequest } from "@test/helpers/request.helper";
import { MagicLinkForgotPasswordStrategy } from "../";

const EMAIL = "user@example.com";
const EXPIRY = 900;
const COOLDOWN = 60;

const sendReq = () =>
  makeMockRequest({
    body: { email: EMAIL }
  }) as unknown as FPMagicLinkSendRequest;

const verifyReq = () =>
  makeMockRequest({
    body: { email: EMAIL, token: "a-token" }
  }) as unknown as FPMagicLinkVerifyRequest;

const setup = () => {
  const magicLinkRepo = {
    MAGIC_LINK_EXPIRY_SECONDS: EXPIRY,
    MAGIC_LINK_COOLDOWN_SECONDS: COOLDOWN,
    getCooldownRemaining: jest.fn().mockResolvedValue(0),
    hasExceededResendLimit: jest.fn().mockResolvedValue(false),
    createAndStoreToken: jest.fn().mockResolvedValue("a-token"),
    setRateLimits: jest.fn().mockResolvedValue(undefined),
    verifyToken: jest.fn().mockResolvedValue(true),
    cleanupAll: jest.fn().mockResolvedValue(undefined)
  } as unknown as jest.Mocked<MagicLinkForgotPasswordRepository>;

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
    magicLinkRepo,
    resetTokenRepo,
    emailDispatcher,
    cooldownGuard: new MagicLinkCooldownGuard(magicLinkRepo),
    resendLimitGuard: new MagicLinkResendLimitGuard(magicLinkRepo),
    authExistsGuard: new AuthExistsGuard(userService as never),
    audit: new ForgotPasswordAuditService(historyService)
  } as unknown as MagicLinkForgotPasswordStrategyDeps;

  return {
    magicLinkRepo,
    resetTokenRepo,
    userService,
    emailDispatcher,
    historyService,
    strategy: new MagicLinkForgotPasswordStrategy(deps)
  };
};

describe("MagicLinkForgotPasswordStrategy.sendLink", () => {
  it("emails a reset link carrying the token and the email", async () => {
    const { strategy, emailDispatcher } = setup();

    const result = await strategy.sendLink(sendReq());

    const [type, payload] = emailDispatcher.send.mock.calls[0] as [
      string,
      { data: { magicLinkUrl: string } }
    ];
    expect(type).toBe(EmailType.MAGIC_LINK);
    expect(payload.data.magicLinkUrl).toContain("token=a-token");
    expect(payload.data.magicLinkUrl).toContain(encodeURIComponent(EMAIL));
    expect(payload.data.magicLinkUrl).toContain("method=magic-link");
    expect(result).toEqual({
      success: true,
      expiresIn: EXPIRY,
      cooldown: COOLDOWN
    });
  });

  it("reports the same success for an unknown email, and sends nothing", async () => {
    const { strategy, userService, magicLinkRepo, emailDispatcher } = setup();
    userService.findByEmailWithAuth.mockResolvedValue(null);

    const result = await strategy.sendLink(sendReq());

    expect(result.success).toBe(true);
    expect(magicLinkRepo.createAndStoreToken).not.toHaveBeenCalled();
    expect(emailDispatcher.send).not.toHaveBeenCalled();
  });

  it("treats a disabled account the same way", async () => {
    const { strategy, userService, emailDispatcher } = setup();
    userService.findByEmailWithAuth.mockResolvedValue(
      buildUserWithAuth({ auth: { isActive: false }, user: { email: EMAIL } })
    );

    await strategy.sendLink(sendReq());

    expect(emailDispatcher.send).not.toHaveBeenCalled();
  });

  it("refuses while the cooldown is running", async () => {
    const { strategy, magicLinkRepo } = setup();
    magicLinkRepo.getCooldownRemaining.mockResolvedValue(30);

    await expect(strategy.sendLink(sendReq())).rejects.toThrow(BadRequestError);
  });

  it("refuses once the resend limit is spent", async () => {
    const { strategy, magicLinkRepo } = setup();
    magicLinkRepo.hasExceededResendLimit.mockResolvedValue(true);

    await expect(strategy.sendLink(sendReq())).rejects.toThrow(BadRequestError);
  });
});

describe("MagicLinkForgotPasswordStrategy.verifyLink", () => {
  it("returns a reset token and clears the magic-link data", async () => {
    const { strategy, magicLinkRepo, resetTokenRepo } = setup();

    const result = await strategy.verifyLink(verifyReq());

    expect(magicLinkRepo.verifyToken).toHaveBeenCalledWith(EMAIL, "a-token");
    expect(resetTokenRepo.createAndStore).toHaveBeenCalledWith(EMAIL);
    expect(magicLinkRepo.cleanupAll).toHaveBeenCalledWith(EMAIL);
    expect(result).toEqual({ success: true, resetToken: "reset-token" });
  });

  it("records and rejects an invalid token", async () => {
    const { strategy, magicLinkRepo, resetTokenRepo, historyService } = setup();
    magicLinkRepo.verifyToken.mockResolvedValue(false);

    await expect(strategy.verifyLink(verifyReq())).rejects.toThrow(
      UnauthorizedError
    );
    expect(historyService.recordFailedLogin).toHaveBeenCalled();
    expect(resetTokenRepo.createAndStore).not.toHaveBeenCalled();
  });

  it("refuses an unknown email outright, unlike sendLink", async () => {
    const { strategy, userService } = setup();
    userService.findByEmailWithAuth.mockResolvedValue(null);

    await expect(strategy.verifyLink(verifyReq())).rejects.toThrow(
      UnauthorizedError
    );
  });
});
