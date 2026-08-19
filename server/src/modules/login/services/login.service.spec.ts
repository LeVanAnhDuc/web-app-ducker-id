// types
import type { Request } from "express";
import type { FailedAttemptsRepository } from "../repositories";
import type {
  PasswordLoginStrategy,
  OtpLoginStrategy,
  MagicLinkLoginStrategy
} from "../strategies";
import type { LoginResponseDto, OtpSendDto, MagicLinkSendDto } from "../dtos";
// others
import { makeMockRequest } from "@test/helpers/request.helper";
import { createFailedAttemptsRepoMock } from "@test/mocks/failed-attempts-repo.mock";
import { LoginService } from "./login.service";

const EMAIL = "user@example.com";

const TOKENS: LoginResponseDto = {
  accessToken: "access-x",
  refreshToken: "refresh-x",
  idToken: "id-x",
  expiresIn: 3600
};

function createPasswordStrategyMock(): jest.Mocked<PasswordLoginStrategy> {
  return {
    authenticate: jest.fn()
  } as unknown as jest.Mocked<PasswordLoginStrategy>;
}

function createOtpStrategyMock(): jest.Mocked<OtpLoginStrategy> {
  return {
    sendCode: jest.fn(),
    verifyCode: jest.fn()
  } as unknown as jest.Mocked<OtpLoginStrategy>;
}

function createMagicLinkStrategyMock(): jest.Mocked<MagicLinkLoginStrategy> {
  return {
    sendLink: jest.fn(),
    verifyLink: jest.fn()
  } as unknown as jest.Mocked<MagicLinkLoginStrategy>;
}

describe("LoginService", () => {
  let req: Request;
  let passwordStrategy: jest.Mocked<PasswordLoginStrategy>;
  let otpStrategy: jest.Mocked<OtpLoginStrategy>;
  let magicLinkStrategy: jest.Mocked<MagicLinkLoginStrategy>;
  let failedAttemptsRepo: jest.Mocked<FailedAttemptsRepository>;
  let service: LoginService;

  beforeEach(() => {
    req = makeMockRequest();
    passwordStrategy = createPasswordStrategyMock();
    otpStrategy = createOtpStrategyMock();
    magicLinkStrategy = createMagicLinkStrategyMock();
    failedAttemptsRepo = createFailedAttemptsRepoMock();

    service = new LoginService(
      passwordStrategy,
      otpStrategy,
      magicLinkStrategy,
      failedAttemptsRepo
    );
  });

  describe("passwordLogin", () => {
    it("delegates to passwordStrategy.authenticate and returns its result", async () => {
      passwordStrategy.authenticate.mockResolvedValue(TOKENS);
      const body = { email: EMAIL, password: "pw" };

      const result = await service.passwordLogin(body, req);

      expect(passwordStrategy.authenticate).toHaveBeenCalledWith(body, req);
      expect(result).toBe(TOKENS);
    });

    it("propagates errors from the strategy unchanged", async () => {
      const err = new Error("boom");
      passwordStrategy.authenticate.mockRejectedValue(err);

      await expect(
        service.passwordLogin({ email: EMAIL, password: "pw" }, req)
      ).rejects.toBe(err);
    });
  });

  describe("sendOtp", () => {
    it("delegates to otpStrategy.sendCode", async () => {
      const dto: OtpSendDto = { success: true, expiresIn: 300, cooldown: 60 };
      otpStrategy.sendCode.mockResolvedValue(dto);
      const body = { email: EMAIL };

      const result = await service.sendOtp(body, req);

      expect(otpStrategy.sendCode).toHaveBeenCalledWith(body, req);
      expect(result).toBe(dto);
    });
  });

  describe("verifyOtp", () => {
    it("delegates to otpStrategy.verifyCode", async () => {
      otpStrategy.verifyCode.mockResolvedValue(TOKENS);
      const body = { email: EMAIL, otp: "123456" };

      const result = await service.verifyOtp(body, req);

      expect(otpStrategy.verifyCode).toHaveBeenCalledWith(body, req);
      expect(result).toBe(TOKENS);
    });
  });

  describe("sendMagicLink", () => {
    it("delegates to magicLinkStrategy.sendLink", async () => {
      const dto: MagicLinkSendDto = {
        success: true,
        expiresIn: 900,
        cooldown: 60
      };
      magicLinkStrategy.sendLink.mockResolvedValue(dto);
      const body = { email: EMAIL };

      const result = await service.sendMagicLink(body, req);

      expect(magicLinkStrategy.sendLink).toHaveBeenCalledWith(body, req);
      expect(result).toBe(dto);
    });
  });

  describe("verifyMagicLink", () => {
    it("delegates to magicLinkStrategy.verifyLink", async () => {
      magicLinkStrategy.verifyLink.mockResolvedValue(TOKENS);
      const body = { email: EMAIL, token: "tok" };

      const result = await service.verifyMagicLink(body, req);

      expect(magicLinkStrategy.verifyLink).toHaveBeenCalledWith(body, req);
      expect(result).toBe(TOKENS);
    });
  });

  describe("isEmailLocked", () => {
    it("returns true when checkLockout reports isLocked", async () => {
      failedAttemptsRepo.checkLockout.mockResolvedValue({
        isLocked: true,
        remainingSeconds: 600
      });

      await expect(service.isEmailLocked(EMAIL)).resolves.toBe(true);
      expect(failedAttemptsRepo.checkLockout).toHaveBeenCalledWith(EMAIL);
    });

    it("returns false when checkLockout reports not locked", async () => {
      failedAttemptsRepo.checkLockout.mockResolvedValue({
        isLocked: false,
        remainingSeconds: 0
      });

      await expect(service.isEmailLocked(EMAIL)).resolves.toBe(false);
    });
  });

  describe("resetFailedAttempts", () => {
    it("delegates to failedAttemptsRepo.resetAll", async () => {
      failedAttemptsRepo.resetAll.mockResolvedValue();

      await service.resetFailedAttempts(EMAIL);

      expect(failedAttemptsRepo.resetAll).toHaveBeenCalledWith(EMAIL);
    });
  });
});
