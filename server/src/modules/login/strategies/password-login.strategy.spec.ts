jest.mock("@/utils/crypto/bcrypt");
jest.mock("@/utils/resilience/retry");
// types
import type { Request } from "express";
import type { FailedAttemptsRepository } from "../repositories";
import type {
  AccountExistsGuard,
  AccountActiveGuard,
  EmailVerifiedGuard,
  PasswordLockoutGuard
} from "../guards";
import type { LoginAuditService } from "../services/login-audit.service";
import type { LoginCompletionService } from "../services/login-completion.service";
// common
import { TooManyRequestsError, UnauthorizedError } from "@/common/exceptions";
// modules
import { LOGIN_METHODS } from "@/modules/login-history/constants";
// others
import { makeMockRequest } from "@test/helpers/request.helper";
import { createFailedAttemptsRepoMock } from "@test/mocks/failed-attempts-repo.mock";
import {
  createAccountExistsGuardMock,
  createAccountActiveGuardMock,
  createEmailVerifiedGuardMock,
  createPasswordLockoutGuardMock
} from "@test/mocks/login-guards.mock";
import { createLoginAuditServiceMock } from "@test/mocks/login-audit-service.mock";
import { createLoginCompletionServiceMock } from "@test/mocks/login-completion-service.mock";
import { buildUserWithAuth } from "@test/factories/user-with-auth.factory";
import { PasswordLoginStrategy } from "./password-login.strategy";
import { ERROR_CODES } from "@/constants/error-code";
import { LOGIN_LOCKOUT } from "../constants";
import { isValidHashedValue } from "@/utils/crypto/bcrypt";
import { withRetry } from "@/utils/resilience/retry";

const mockedIsValidHashedValue = isValidHashedValue as jest.MockedFunction<
  typeof isValidHashedValue
>;
const mockedWithRetry = withRetry as jest.MockedFunction<typeof withRetry>;

const EMAIL = "user@example.com";
const PASSWORD = "correct-password";

describe("PasswordLoginStrategy", () => {
  let req: Request;
  let accountExists: jest.Mocked<AccountExistsGuard>;
  let accountActive: jest.Mocked<AccountActiveGuard>;
  let emailVerified: jest.Mocked<EmailVerifiedGuard>;
  let lockout: jest.Mocked<PasswordLockoutGuard>;
  let failedAttemptsRepo: jest.Mocked<FailedAttemptsRepository>;
  let audit: jest.Mocked<LoginAuditService>;
  let completion: jest.Mocked<LoginCompletionService>;
  let strategy: PasswordLoginStrategy;

  beforeEach(() => {
    req = makeMockRequest({ language: "en" });
    accountExists = createAccountExistsGuardMock();
    accountActive = createAccountActiveGuardMock();
    emailVerified = createEmailVerifiedGuardMock();
    lockout = createPasswordLockoutGuardMock();
    failedAttemptsRepo = createFailedAttemptsRepoMock();
    audit = createLoginAuditServiceMock();
    completion = createLoginCompletionServiceMock();

    strategy = new PasswordLoginStrategy(
      accountExists,
      accountActive,
      emailVerified,
      lockout,
      failedAttemptsRepo,
      audit,
      completion
    );

    mockedWithRetry.mockImplementation(() => Promise.resolve());
  });

  it("completes login when credentials valid", async () => {
    const fixture = buildUserWithAuth();
    accountExists.assertWithCredentialAudit.mockResolvedValue(fixture);
    mockedIsValidHashedValue.mockReturnValue(true);
    completion.complete.mockReturnValue({
      accessToken: "a",
      refreshToken: "r",
      idToken: "i",
      expiresIn: 3600
    });

    const result = await strategy.authenticate(
      { email: EMAIL, password: PASSWORD },
      req
    );

    expect(lockout.assert).toHaveBeenCalledWith(EMAIL);
    expect(accountExists.assertWithCredentialAudit).toHaveBeenCalledWith(
      EMAIL,
      req
    );
    expect(accountActive.assertWithAudit).toHaveBeenCalledWith(
      fixture.auth,
      EMAIL,
      LOGIN_METHODS.PASSWORD,
      req
    );
    expect(emailVerified.assertWithAudit).toHaveBeenCalledWith(
      fixture.auth,
      EMAIL,
      LOGIN_METHODS.PASSWORD,
      req
    );
    expect(failedAttemptsRepo.trackAttempt).not.toHaveBeenCalled();
    expect(completion.complete).toHaveBeenCalledWith({
      auth: fixture.auth,
      user: fixture.user,
      method: LOGIN_METHODS.PASSWORD,
      req
    });
    expect(result).toEqual({
      accessToken: "a",
      refreshToken: "r",
      idToken: "i",
      expiresIn: 3600
    });
  });

  it("tracks attempt and throws INVALID_CREDENTIALS below lockout threshold", async () => {
    const fixture = buildUserWithAuth();
    accountExists.assertWithCredentialAudit.mockResolvedValue(fixture);
    mockedIsValidHashedValue.mockReturnValue(false);
    failedAttemptsRepo.trackAttempt.mockResolvedValue({
      attemptCount: 3,
      lockoutSeconds: 0
    });

    const promise = strategy.authenticate(
      { email: EMAIL, password: "wrong" },
      req
    );

    await expect(promise).rejects.toBeInstanceOf(UnauthorizedError);
    await expect(promise).rejects.toMatchObject({
      code: ERROR_CODES.LOGIN_INVALID_CREDENTIALS
    });
    expect(failedAttemptsRepo.trackAttempt).toHaveBeenCalledWith(EMAIL);
    expect(audit.recordInvalidPassword).toHaveBeenCalledWith({
      auth: fixture.auth,
      email: EMAIL,
      attemptCount: 3,
      req
    });
    expect(completion.complete).not.toHaveBeenCalled();
  });

  it("throws ACCOUNT_LOCKED when attempts reach threshold", async () => {
    const fixture = buildUserWithAuth();
    accountExists.assertWithCredentialAudit.mockResolvedValue(fixture);
    mockedIsValidHashedValue.mockReturnValue(false);
    failedAttemptsRepo.trackAttempt.mockResolvedValue({
      attemptCount: LOGIN_LOCKOUT.MAX_ATTEMPTS,
      lockoutSeconds: LOGIN_LOCKOUT.LOCKOUT_SECONDS
    });

    const promise = strategy.authenticate(
      { email: EMAIL, password: "wrong" },
      req
    );

    await expect(promise).rejects.toBeInstanceOf(TooManyRequestsError);
    await expect(promise).rejects.toMatchObject({
      code: ERROR_CODES.LOGIN_ACCOUNT_LOCKED
    });
  });

  it("propagates guard errors from lockout check", async () => {
    lockout.assert.mockRejectedValue(
      new TooManyRequestsError({
        message: "locked",
        code: ERROR_CODES.LOGIN_ACCOUNT_LOCKED
      })
    );

    await expect(
      strategy.authenticate({ email: EMAIL, password: PASSWORD }, req)
    ).rejects.toMatchObject({ code: ERROR_CODES.LOGIN_ACCOUNT_LOCKED });
    expect(accountExists.assertWithCredentialAudit).not.toHaveBeenCalled();
  });

  it("short-circuits and skips token issuance when accountActive guard throws", async () => {
    const fixture = buildUserWithAuth();
    accountExists.assertWithCredentialAudit.mockResolvedValue(fixture);
    accountActive.assertWithAudit.mockImplementation(() => {
      throw new UnauthorizedError({
        message: "inactive",
        code: ERROR_CODES.LOGIN_ACCOUNT_INACTIVE
      });
    });

    await expect(
      strategy.authenticate({ email: EMAIL, password: PASSWORD }, req)
    ).rejects.toMatchObject({ code: ERROR_CODES.LOGIN_ACCOUNT_INACTIVE });

    expect(emailVerified.assertWithAudit).not.toHaveBeenCalled();
    expect(failedAttemptsRepo.trackAttempt).not.toHaveBeenCalled();
    expect(completion.complete).not.toHaveBeenCalled();
  });

  it("short-circuits when emailVerified guard throws", async () => {
    const fixture = buildUserWithAuth();
    accountExists.assertWithCredentialAudit.mockResolvedValue(fixture);
    emailVerified.assertWithAudit.mockImplementation(() => {
      throw new UnauthorizedError({
        message: "unverified",
        code: ERROR_CODES.LOGIN_EMAIL_NOT_VERIFIED
      });
    });

    await expect(
      strategy.authenticate({ email: EMAIL, password: PASSWORD }, req)
    ).rejects.toMatchObject({ code: ERROR_CODES.LOGIN_EMAIL_NOT_VERIFIED });

    expect(failedAttemptsRepo.trackAttempt).not.toHaveBeenCalled();
    expect(completion.complete).not.toHaveBeenCalled();
  });

  it("fires resetAll via withRetry on successful login", async () => {
    const fixture = buildUserWithAuth();
    accountExists.assertWithCredentialAudit.mockResolvedValue(fixture);
    mockedIsValidHashedValue.mockReturnValue(true);
    completion.complete.mockReturnValue({
      accessToken: "a",
      refreshToken: "r",
      idToken: "i",
      expiresIn: 3600
    });

    await strategy.authenticate({ email: EMAIL, password: PASSWORD }, req);

    expect(mockedWithRetry).toHaveBeenCalledWith(
      expect.any(Function),
      expect.objectContaining({
        operationName: "resetFailedLoginAttempts",
        context: { email: EMAIL }
      })
    );

    const [fn] = mockedWithRetry.mock.calls[0];
    (fn as () => Promise<void>)();
    expect(failedAttemptsRepo.resetAll).toHaveBeenCalledWith(EMAIL);
  });
});
