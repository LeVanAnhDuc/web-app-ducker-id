// types
import type { UserService } from "@/modules/user/user.service";
import type { Request } from "express";
import type { LoginAuditService } from "../services/login-audit.service";
// common
import { UnauthorizedError } from "@/common/exceptions";
// others
import { makeMockRequest } from "@test/helpers/request.helper";
import { createUserServiceMock } from "@test/mocks/user-service.mock";
import { createLoginAuditServiceMock } from "@test/mocks/login-audit-service.mock";
import { buildUserWithAuth } from "@test/factories/user-with-auth.factory";
import { AccountExistsGuard } from "./account-exists.guard";
import { ERROR_CODES } from "@/constants/error-code";

const EMAIL = "user@example.com";

describe("AccountExistsGuard", () => {
  let req: Request;
  let userService: jest.Mocked<UserService>;
  let audit: jest.Mocked<LoginAuditService>;
  let guard: AccountExistsGuard;

  beforeEach(() => {
    req = makeMockRequest();
    userService = createUserServiceMock();
    audit = createLoginAuditServiceMock();
    guard = new AccountExistsGuard(userService, audit);
  });

  describe("tryFind", () => {
    it("returns UserWithAuth when found, no throw", async () => {
      const fixture = buildUserWithAuth();
      userService.findByEmailWithAuth.mockResolvedValue(fixture);

      await expect(guard.tryFind(EMAIL)).resolves.toEqual(fixture);
    });

    it("returns null when not found, no throw, no audit", async () => {
      userService.findByEmailWithAuth.mockResolvedValue(null);

      await expect(guard.tryFind(EMAIL)).resolves.toBeNull();
      expect(audit.recordInvalidCredentials).not.toHaveBeenCalled();
    });
  });

  describe("assert", () => {
    it("returns UserWithAuth when found", async () => {
      const fixture = buildUserWithAuth();
      userService.findByEmailWithAuth.mockResolvedValue(fixture);

      await expect(guard.assert(EMAIL)).resolves.toEqual(fixture);
    });

    it("throws UnauthorizedError with LOGIN_INVALID_EMAIL when not found", async () => {
      userService.findByEmailWithAuth.mockResolvedValue(null);

      const promise = guard.assert(EMAIL);

      await expect(promise).rejects.toBeInstanceOf(UnauthorizedError);
      await expect(promise).rejects.toMatchObject({
        code: ERROR_CODES.LOGIN_INVALID_EMAIL
      });
      expect(audit.recordInvalidCredentials).not.toHaveBeenCalled();
    });
  });

  describe("assertWithCredentialAudit", () => {
    it("returns UserWithAuth when found, no audit", async () => {
      const fixture = buildUserWithAuth();
      userService.findByEmailWithAuth.mockResolvedValue(fixture);

      await expect(
        guard.assertWithCredentialAudit(EMAIL, req)
      ).resolves.toEqual(fixture);
      expect(audit.recordInvalidCredentials).not.toHaveBeenCalled();
    });

    it("records audit and throws UnauthorizedError with LOGIN_INVALID_CREDENTIALS when not found", async () => {
      userService.findByEmailWithAuth.mockResolvedValue(null);

      const promise = guard.assertWithCredentialAudit(EMAIL, req);

      await expect(promise).rejects.toBeInstanceOf(UnauthorizedError);
      await expect(promise).rejects.toMatchObject({
        code: ERROR_CODES.LOGIN_INVALID_CREDENTIALS
      });
      expect(audit.recordInvalidCredentials).toHaveBeenCalledWith({
        email: EMAIL,
        req
      });
    });
  });
});
