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
import { EmailVerifiedGuard } from "./email-verified.guard";
import { ERROR_CODES } from "@/constants/error-code";

const EMAIL = "user@example.com";

describe("EmailVerifiedGuard", () => {
  let req: Request;
  let audit: jest.Mocked<LoginAuditService>;
  let guard: EmailVerifiedGuard;

  beforeEach(() => {
    req = makeMockRequest();
    audit = createLoginAuditServiceMock();
    guard = new EmailVerifiedGuard(audit);
  });

  describe("assert", () => {
    it("returns silently when email verified", () => {
      expect(() => guard.assert(buildAuth())).not.toThrow();
    });

    it("throws LOGIN_EMAIL_NOT_VERIFIED when not verified, without audit", () => {
      const auth = buildAuth({ verifiedEmail: false });
      try {
        guard.assert(auth);
        throw new Error("expected throw");
      } catch (err) {
        expect(err).toBeInstanceOf(UnauthorizedError);
        expect((err as UnauthorizedError).code).toBe(
          ERROR_CODES.LOGIN_EMAIL_NOT_VERIFIED
        );
      }
      expect(audit.recordEmailNotVerified).not.toHaveBeenCalled();
    });
  });

  describe("assertWithAudit", () => {
    it("returns silently when verified, no audit", () => {
      expect(() =>
        guard.assertWithAudit(buildAuth(), EMAIL, LOGIN_METHODS.PASSWORD, req)
      ).not.toThrow();
      expect(audit.recordEmailNotVerified).not.toHaveBeenCalled();
    });

    it("records audit and throws LOGIN_EMAIL_NOT_VERIFIED when not verified", () => {
      const auth = buildAuth({ verifiedEmail: false });

      expect(() =>
        guard.assertWithAudit(auth, EMAIL, LOGIN_METHODS.PASSWORD, req)
      ).toThrow(UnauthorizedError);

      expect(audit.recordEmailNotVerified).toHaveBeenCalledWith({
        auth,
        email: EMAIL,
        method: LOGIN_METHODS.PASSWORD,
        req
      });
    });
  });
});
