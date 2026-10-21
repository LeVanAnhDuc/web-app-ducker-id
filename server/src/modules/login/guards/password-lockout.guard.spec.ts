// types
import type { FailedAttemptsRepository } from "../repositories/failed-attempts.repository";
// common
import { TooManyRequestsError } from "@/exceptions";
// others
import { createFailedAttemptsRepoMock } from "@test/mocks/failed-attempts-repo.mock";
import { PasswordLockoutGuard } from "./password-lockout.guard";
import { ERROR_CODES } from "@/constants/error-code";
import { LOGIN_LOCKOUT } from "../constants";

const EMAIL = "user@example.com";

describe("PasswordLockoutGuard", () => {
  let repo: jest.Mocked<FailedAttemptsRepository>;
  let guard: PasswordLockoutGuard;

  beforeEach(() => {
    repo = createFailedAttemptsRepoMock();
    guard = new PasswordLockoutGuard(repo);
  });

  it("returns silently when not locked", async () => {
    repo.checkLockout.mockResolvedValue({
      isLocked: false,
      remainingSeconds: 0
    });

    await expect(guard.assert(EMAIL)).resolves.toBeUndefined();
    expect(repo.getCount).not.toHaveBeenCalled();
  });

  it("throws LOGIN_ACCOUNT_LOCKED with interpolated attempts+seconds when locked", async () => {
    repo.checkLockout.mockResolvedValue({
      isLocked: true,
      remainingSeconds: 1800
    });
    repo.getCount.mockResolvedValue(LOGIN_LOCKOUT.MAX_ATTEMPTS);

    const error = await guard.assert(EMAIL).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(TooManyRequestsError);
    expect((error as TooManyRequestsError).code).toBe(
      ERROR_CODES.LOGIN_ACCOUNT_LOCKED
    );
    expect((error as TooManyRequestsError).key).toBe(
      "login:errors.accountLocked"
    );
    expect((error as TooManyRequestsError).params).toEqual({
      attempts: LOGIN_LOCKOUT.MAX_ATTEMPTS,
      seconds: 1800
    });
  });
});
