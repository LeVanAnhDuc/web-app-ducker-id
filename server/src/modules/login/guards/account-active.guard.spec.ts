// types
import type { Request } from "express";
import type { LoginAuditService } from "../services/login-audit.service";
// common
import { UnauthorizedError } from "@/common/exceptions";
// modules
import { LOGIN_METHODS } from "@/modules/login-history/constants";
// others
import { makeMockRequest } from "@test/helpers/request.helper";
import { createLoginAuditServiceMock } from "@test/mocks/login-audit-service.mock";
import { buildAuth } from "@test/factories/user-with-auth.factory";
import { AccountActiveGuard } from "./account-active.guard";
import { ERROR_CODES } from "@/constants/error-code";

const EMAIL = "user@example.com";

describe("AccountActiveGuard", () => {
  let req: Request;
  let audit: jest.Mocked<LoginAuditService>;
  let guard: AccountActiveGuard;

  beforeEach(() => {
    req = makeMockRequest();
    audit = createLoginAuditServiceMock();
    guard = new AccountActiveGuard(audit);
  });

  describe("assert", () => {
    it("returns silently when active", () => {
      expect(() => guard.assert(buildAuth())).not.toThrow();
    });

    it("throws LOGIN_ACCOUNT_INACTIVE when inactive, without audit", () => {
      const auth = buildAuth({ isActive: false });
      try {
        guard.assert(auth);
        throw new Error("expected throw");
      } catch (err) {
        expect(err).toBeInstanceOf(UnauthorizedError);
        expect((err as UnauthorizedError).code).toBe(
          ERROR_CODES.LOGIN_ACCOUNT_INACTIVE
        );
      }
      expect(audit.recordInactiveAccount).not.toHaveBeenCalled();
    });
  });

  describe("assertWithAudit", () => {
    it("returns silently when active, no audit", () => {
      expect(() =>
        guard.assertWithAudit(buildAuth(), EMAIL, LOGIN_METHODS.PASSWORD, req)
      ).not.toThrow();
      expect(audit.recordInactiveAccount).not.toHaveBeenCalled();
    });

    it("records audit and throws LOGIN_ACCOUNT_INACTIVE when inactive", () => {
      const auth = buildAuth({ isActive: false });

      expect(() =>
        guard.assertWithAudit(auth, EMAIL, LOGIN_METHODS.PASSWORD, req)
      ).toThrow(UnauthorizedError);

      expect(audit.recordInactiveAccount).toHaveBeenCalledWith({
        auth,
        email: EMAIL,
        method: LOGIN_METHODS.PASSWORD,
        req
      });
    });
  });
});
