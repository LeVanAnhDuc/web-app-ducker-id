jest.mock("@/utils/resilience/retry");
jest.mock("@/constants/env", () => ({
  __esModule: true,
  default: { CLIENT_URL: "https://app.test" }
}));
// types
import type { Request } from "express";
import type { MagicLinkLoginRepository } from "../repositories";
import type {
  AccountExistsGuard,
  AccountActiveGuard,
  EmailVerifiedGuard,
  MagicLinkCooldownGuard
} from "../guards";
import type { LoginAuditService } from "../services/login-audit.service";
import type { LoginCompletionService } from "../services/login-completion.service";
import type { EmailDispatcher } from "@/services/email/email.dispatcher";
// common
import { UnauthorizedError } from "@/common/exceptions";
// modules
import { LOGIN_METHODS } from "@/modules/login-history/constants";
// others
import { makeMockRequest } from "@test/helpers/request.helper";
import { createMagicLinkLoginRepoMock } from "@test/mocks/magic-link-login-repo.mock";
import { createEmailDispatcherMock } from "@test/mocks/email-dispatcher.mock";
import {
  createAccountExistsGuardMock,
  createAccountActiveGuardMock,
  createEmailVerifiedGuardMock,
  createMagicLinkCooldownGuardMock
} from "@test/mocks/login-guards.mock";
import { createLoginAuditServiceMock } from "@test/mocks/login-audit-service.mock";
import { createLoginCompletionServiceMock } from "@test/mocks/login-completion-service.mock";
import { buildUserWithAuth } from "@test/factories/user-with-auth.factory";
import { MagicLinkLoginStrategy } from "./magic-link-login.strategy";
import { EmailType } from "@/types/services/email";
import { ERROR_CODES } from "@/constants/error-code";
import { withRetry } from "@/utils/resilience/retry";

const mockedWithRetry = withRetry as jest.MockedFunction<typeof withRetry>;

const EMAIL = "user@example.com";
const TOKEN = "secure-token-xyz";

describe("MagicLinkLoginStrategy", () => {
  let req: Request;
  let accountExists: jest.Mocked<AccountExistsGuard>;
  let accountActive: jest.Mocked<AccountActiveGuard>;
  let emailVerified: jest.Mocked<EmailVerifiedGuard>;
  let cooldown: jest.Mocked<MagicLinkCooldownGuard>;
  let magicLinkRepo: jest.Mocked<MagicLinkLoginRepository>;
  let emailDispatcher: jest.Mocked<EmailDispatcher>;
  let audit: jest.Mocked<LoginAuditService>;
  let completion: jest.Mocked<LoginCompletionService>;
  let strategy: MagicLinkLoginStrategy;

  beforeEach(() => {
    req = makeMockRequest({ language: "en" });
    accountExists = createAccountExistsGuardMock();
    accountActive = createAccountActiveGuardMock();
    emailVerified = createEmailVerifiedGuardMock();
    cooldown = createMagicLinkCooldownGuardMock();
    magicLinkRepo = createMagicLinkLoginRepoMock();
    emailDispatcher = createEmailDispatcherMock();
    audit = createLoginAuditServiceMock();
    completion = createLoginCompletionServiceMock();

    strategy = new MagicLinkLoginStrategy(
      accountExists,
      accountActive,
      emailVerified,
      cooldown,
      magicLinkRepo,
      emailDispatcher,
      audit,
      completion
    );

    mockedWithRetry.mockImplementation(() => Promise.resolve());
  });

  describe("sendLink", () => {
    it("stores token, dispatches email, returns dto for eligible account", async () => {
      const fixture = buildUserWithAuth();
      accountExists.tryFind.mockResolvedValue(fixture);
      accountExists.isLoginEligible.mockReturnValue(true);
      magicLinkRepo.createAndStoreToken.mockResolvedValue(TOKEN);

      const result = await strategy.sendLink({ email: EMAIL }, req);

      expect(cooldown.assert).toHaveBeenCalledWith(EMAIL);
      expect(accountExists.tryFind).toHaveBeenCalledWith(EMAIL);
      expect(magicLinkRepo.createAndStoreToken).toHaveBeenCalledWith(EMAIL);
      expect(emailDispatcher.send).toHaveBeenCalledWith(
        EmailType.MAGIC_LINK,
        expect.objectContaining({
          email: EMAIL,
          data: expect.objectContaining({
            magicLinkUrl: expect.stringContaining(
              `token=${TOKEN}&email=${encodeURIComponent(EMAIL)}`
            )
          })
        })
      );
      expect(result).toEqual({
        success: true,
        expiresIn: magicLinkRepo.MAGIC_LINK_EXPIRY_SECONDS,
        cooldown: magicLinkRepo.MAGIC_LINK_COOLDOWN_SECONDS
      });
    });

    it("returns fake success (no token stored) when account not found + applies cooldown", async () => {
      accountExists.tryFind.mockResolvedValue(null);
      accountExists.isLoginEligible.mockReturnValue(false);

      const result = await strategy.sendLink({ email: EMAIL }, req);

      expect(magicLinkRepo.createAndStoreToken).not.toHaveBeenCalled();
      expect(emailDispatcher.send).not.toHaveBeenCalled();
      expect(mockedWithRetry).toHaveBeenCalledWith(
        expect.any(Function),
        expect.objectContaining({
          operationName: "setMagicLinkCooldown",
          context: { email: EMAIL }
        })
      );
      const [fn] = mockedWithRetry.mock.calls[0];
      (fn as () => Promise<void>)();
      expect(magicLinkRepo.setCooldownAfterSend).toHaveBeenCalledWith(EMAIL);
      expect(result).toEqual({
        success: true,
        expiresIn: magicLinkRepo.MAGIC_LINK_EXPIRY_SECONDS,
        cooldown: magicLinkRepo.MAGIC_LINK_COOLDOWN_SECONDS
      });
    });

    it("returns fake success when account inactive (no enumeration leak)", async () => {
      accountExists.tryFind.mockResolvedValue(
        buildUserWithAuth({ auth: { isActive: false } })
      );

      const result = await strategy.sendLink({ email: EMAIL }, req);

      expect(magicLinkRepo.createAndStoreToken).not.toHaveBeenCalled();
      expect(emailDispatcher.send).not.toHaveBeenCalled();
      expect(result).toEqual({
        success: true,
        expiresIn: magicLinkRepo.MAGIC_LINK_EXPIRY_SECONDS,
        cooldown: magicLinkRepo.MAGIC_LINK_COOLDOWN_SECONDS
      });
    });

    it("returns fake success when email not verified (no enumeration leak)", async () => {
      accountExists.tryFind.mockResolvedValue(
        buildUserWithAuth({ auth: { verifiedEmail: false } })
      );

      const result = await strategy.sendLink({ email: EMAIL }, req);

      expect(magicLinkRepo.createAndStoreToken).not.toHaveBeenCalled();
      expect(emailDispatcher.send).not.toHaveBeenCalled();
      expect(result).toEqual({
        success: true,
        expiresIn: magicLinkRepo.MAGIC_LINK_EXPIRY_SECONDS,
        cooldown: magicLinkRepo.MAGIC_LINK_COOLDOWN_SECONDS
      });
    });
  });

  describe("verifyLink", () => {
    it("completes login when token valid and account eligible", async () => {
      const fixture = buildUserWithAuth();
      accountExists.assert.mockResolvedValue(fixture);
      magicLinkRepo.verifyToken.mockResolvedValue(true);
      completion.complete.mockReturnValue({
        accessToken: "a",
        refreshToken: "r",
        idToken: "i",
        expiresIn: 3600
      });

      const result = await strategy.verifyLink(
        { email: EMAIL, token: TOKEN },
        req
      );

      expect(accountActive.assertWithAudit).toHaveBeenCalledWith(
        fixture.auth,
        EMAIL,
        LOGIN_METHODS.MAGIC_LINK,
        req
      );
      expect(emailVerified.assertWithAudit).toHaveBeenCalledWith(
        fixture.auth,
        EMAIL,
        LOGIN_METHODS.MAGIC_LINK,
        req
      );
      expect(magicLinkRepo.verifyToken).toHaveBeenCalledWith(EMAIL, TOKEN);
      expect(completion.complete).toHaveBeenCalledWith({
        auth: fixture.auth,
        user: fixture.user,
        method: LOGIN_METHODS.MAGIC_LINK,
        req
      });
      expect(result).toEqual({
        accessToken: "a",
        refreshToken: "r",
        idToken: "i",
        expiresIn: 3600
      });
    });

    it("short-circuits when emailVerified fails (user unverified between send and verify)", async () => {
      const fixture = buildUserWithAuth({ auth: { verifiedEmail: false } });
      accountExists.assert.mockResolvedValue(fixture);
      emailVerified.assertWithAudit.mockImplementation(() => {
        throw new UnauthorizedError({
          message: "unverified",
          code: ERROR_CODES.LOGIN_EMAIL_NOT_VERIFIED
        });
      });

      await expect(
        strategy.verifyLink({ email: EMAIL, token: TOKEN }, req)
      ).rejects.toMatchObject({
        code: ERROR_CODES.LOGIN_EMAIL_NOT_VERIFIED
      });
      expect(magicLinkRepo.verifyToken).not.toHaveBeenCalled();
      expect(completion.complete).not.toHaveBeenCalled();
    });

    it("audits and throws MAGIC_LINK_INVALID when token invalid", async () => {
      const fixture = buildUserWithAuth();
      accountExists.assert.mockResolvedValue(fixture);
      magicLinkRepo.verifyToken.mockResolvedValue(false);

      const promise = strategy.verifyLink({ email: EMAIL, token: "bad" }, req);

      await expect(promise).rejects.toBeInstanceOf(UnauthorizedError);
      await expect(promise).rejects.toMatchObject({
        code: ERROR_CODES.LOGIN_MAGIC_LINK_INVALID
      });
      expect(audit.recordInvalidMagicLink).toHaveBeenCalledWith({
        auth: fixture.auth,
        email: EMAIL,
        req
      });
      expect(completion.complete).not.toHaveBeenCalled();
    });
  });
});
