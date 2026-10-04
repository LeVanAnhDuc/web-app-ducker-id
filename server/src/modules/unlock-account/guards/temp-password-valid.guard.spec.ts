// types
import type { Request } from "express";
import type { UnlockAccountRepository } from "../unlock-account.repository";
// common
import { UnauthorizedError } from "@/common/exceptions";
// others
import { makeMockRequest } from "@test/helpers/request.helper";
import { createUnlockAccountRepoMock } from "@test/mocks/unlock-account-repo.mock";
import { TempPasswordValidGuard } from "./temp-password-valid.guard";
import { ERROR_CODES } from "@/constants/error-code";

const EMAIL = "user@example.com";
const TEMP_PASSWORD = "Aa1!bcdefghijklm";

describe("TempPasswordValidGuard", () => {
  let req: Request;
  let tSpy: jest.Mock;
  let repo: jest.Mocked<UnlockAccountRepository>;
  let guard: TempPasswordValidGuard;

  beforeEach(() => {
    req = makeMockRequest();
    tSpy = req.t as unknown as jest.Mock;
    repo = createUnlockAccountRepoMock();
    guard = new TempPasswordValidGuard(repo);
  });

  it("returns silently when the repository consumed the temp password", async () => {
    repo.consumeTempPassword.mockResolvedValue(true);

    await expect(guard.assert(EMAIL, TEMP_PASSWORD)).resolves.toBeUndefined();
    expect(repo.consumeTempPassword).toHaveBeenCalledWith(EMAIL, TEMP_PASSWORD);
  });

  it("throws UNLOCK_INVALID_TEMP_PASSWORD when the temp password is wrong or expired", async () => {
    repo.consumeTempPassword.mockResolvedValue(false);

    const error = await guard
      .assert(EMAIL, TEMP_PASSWORD)
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(UnauthorizedError);
    expect((error as UnauthorizedError).code).toBe(
      ERROR_CODES.UNLOCK_INVALID_TEMP_PASSWORD
    );
    (error as UnauthorizedError).i18nMessage?.(req.t);
    expect(tSpy).toHaveBeenCalledWith(
      "unlockAccount:errors.invalidTempPassword"
    );
  });
});
