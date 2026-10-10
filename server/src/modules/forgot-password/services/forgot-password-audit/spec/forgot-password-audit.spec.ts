// others
import {
  LOGIN_METHODS,
  LOGIN_FAIL_REASONS
} from "@/modules/login-history/constants";
import { buildAuth } from "@test/factories/user-with-auth.factory";
import { createLoginHistoryServiceMock } from "@test/mocks/login-history-service.mock";
import { makeMockRequest } from "@test/helpers/request.helper";
import { ForgotPasswordAuditService } from "../";

const EMAIL = "user@example.com";
const AUTH_ID = "auth-id-123";

const setup = () => {
  const historyService = createLoginHistoryServiceMock();
  return {
    historyService,
    audit: new ForgotPasswordAuditService(historyService)
  };
};

const params = () => ({
  email: EMAIL,
  auth: buildAuth({ _id: AUTH_ID as never }),
  req: makeMockRequest()
});

describe("ForgotPasswordAuditService", () => {
  it("files a wrong OTP under the forgot-password method", () => {
    const { audit, historyService } = setup();

    audit.recordInvalidOtp({ ...params(), attempts: 2 });

    expect(historyService.recordFailedLogin).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: AUTH_ID,
        usernameAttempted: EMAIL,
        loginMethod: LOGIN_METHODS.FORGOT_PASSWORD,
        failReason: LOGIN_FAIL_REASONS.INVALID_OTP
      })
    );
  });

  it("files a bad magic link under the same method, different reason", () => {
    const { audit, historyService } = setup();

    audit.recordInvalidMagicLink(params());

    expect(historyService.recordFailedLogin).toHaveBeenCalledWith(
      expect.objectContaining({
        loginMethod: LOGIN_METHODS.FORGOT_PASSWORD,
        failReason: LOGIN_FAIL_REASONS.INVALID_MAGIC_LINK
      })
    );
  });

  it("records a completed reset as a successful login, not a failure", () => {
    const { audit, historyService } = setup();

    audit.recordPasswordReset(params());

    expect(historyService.recordSuccessfulLogin).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: AUTH_ID,
        usernameAttempted: EMAIL,
        loginMethod: LOGIN_METHODS.FORGOT_PASSWORD
      })
    );
    expect(historyService.recordFailedLogin).not.toHaveBeenCalled();
  });
});
