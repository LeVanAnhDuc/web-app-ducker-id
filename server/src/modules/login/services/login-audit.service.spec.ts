// types
import type { Request } from "express";
import type { LoginHistoryService } from "@/modules/login-history/login-history.service";
// modules
import {
  LOGIN_METHODS,
  LOGIN_FAIL_REASONS
} from "@/modules/login-history/constants";
// others
import { makeMockRequest } from "@test/helpers/request.helper";
import { createLoginHistoryServiceMock } from "@test/mocks/login-history-service.mock";
import { buildAuth, buildUser } from "@test/factories/user-with-auth.factory";
import { LoginAuditService } from "./login-audit.service";

const EMAIL = "user@example.com";

describe("LoginAuditService", () => {
  let req: Request;
  let historyService: jest.Mocked<LoginHistoryService>;
  let audit: LoginAuditService;

  beforeEach(() => {
    req = makeMockRequest();
    historyService = createLoginHistoryServiceMock();
    audit = new LoginAuditService(historyService);
  });

  describe("recordSuccess", () => {
    it("records successful login with user identity and method", () => {
      const auth = buildAuth();
      const user = buildUser();

      audit.recordSuccess({
        auth,
        user,
        method: LOGIN_METHODS.PASSWORD,
        req
      });

      expect(historyService.recordSuccessfulLogin).toHaveBeenCalledWith({
        userId: auth._id,
        usernameAttempted: user.email,
        loginMethod: LOGIN_METHODS.PASSWORD,
        req
      });
    });
  });

  describe("recordInvalidCredentials", () => {
    it("records failed login with userId=null and INVALID_CREDENTIALS reason", () => {
      audit.recordInvalidCredentials({ email: EMAIL, req });

      expect(historyService.recordFailedLogin).toHaveBeenCalledWith({
        userId: null,
        usernameAttempted: EMAIL,
        loginMethod: LOGIN_METHODS.PASSWORD,
        failReason: LOGIN_FAIL_REASONS.INVALID_CREDENTIALS,
        req
      });
    });
  });

  describe("recordInvalidPassword", () => {
    it("records failed login with auth._id and INVALID_PASSWORD reason", () => {
      const auth = buildAuth();

      audit.recordInvalidPassword({ auth, email: EMAIL, attemptCount: 3, req });

      expect(historyService.recordFailedLogin).toHaveBeenCalledWith({
        userId: auth._id,
        usernameAttempted: EMAIL,
        loginMethod: LOGIN_METHODS.PASSWORD,
        failReason: LOGIN_FAIL_REASONS.INVALID_PASSWORD,
        req
      });
    });
  });

  describe("recordInactiveAccount", () => {
    it("records failed login with ACCOUNT_INACTIVE reason and passed method", () => {
      const auth = buildAuth();

      audit.recordInactiveAccount({
        auth,
        email: EMAIL,
        method: LOGIN_METHODS.PASSWORD,
        req
      });

      expect(historyService.recordFailedLogin).toHaveBeenCalledWith({
        userId: auth._id,
        usernameAttempted: EMAIL,
        loginMethod: LOGIN_METHODS.PASSWORD,
        failReason: LOGIN_FAIL_REASONS.ACCOUNT_INACTIVE,
        req
      });
    });
  });

  describe("recordEmailNotVerified", () => {
    it("records failed login with EMAIL_NOT_VERIFIED reason", () => {
      const auth = buildAuth();

      audit.recordEmailNotVerified({
        auth,
        email: EMAIL,
        method: LOGIN_METHODS.PASSWORD,
        req
      });

      expect(historyService.recordFailedLogin).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: auth._id,
          failReason: LOGIN_FAIL_REASONS.EMAIL_NOT_VERIFIED
        })
      );
    });
  });

  describe("recordInvalidOtp", () => {
    it("records failed login with OTP method and INVALID_OTP reason", () => {
      const auth = buildAuth();

      audit.recordInvalidOtp({ auth, email: EMAIL, attempts: 2, req });

      expect(historyService.recordFailedLogin).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: auth._id,
          loginMethod: LOGIN_METHODS.OTP,
          failReason: LOGIN_FAIL_REASONS.INVALID_OTP
        })
      );
    });
  });

  describe("recordInvalidMagicLink", () => {
    it("records failed login with MAGIC_LINK method and INVALID_MAGIC_LINK reason", () => {
      const auth = buildAuth();

      audit.recordInvalidMagicLink({ auth, email: EMAIL, req });

      expect(historyService.recordFailedLogin).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: auth._id,
          loginMethod: LOGIN_METHODS.MAGIC_LINK,
          failReason: LOGIN_FAIL_REASONS.INVALID_MAGIC_LINK
        })
      );
    });
  });
});
