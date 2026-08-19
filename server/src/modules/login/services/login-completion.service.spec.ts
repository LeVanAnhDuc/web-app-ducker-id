jest.mock("@/modules/authentication/helpers");
// types
import type { Request } from "express";
import type { LoginAuditService } from "./login-audit.service";
// modules
import { LOGIN_METHODS } from "@/modules/login-history/constants";
import { generateAuthTokensResponse } from "@/modules/authentication/helpers";
// others
import { makeMockRequest } from "@test/helpers/request.helper";
import { createLoginAuditServiceMock } from "@test/mocks/login-audit-service.mock";
import { buildAuth, buildUser } from "@test/factories/user-with-auth.factory";
import { LoginCompletionService } from "./login-completion.service";

const mockedGenerateAuthTokensResponse =
  generateAuthTokensResponse as jest.MockedFunction<
    typeof generateAuthTokensResponse
  >;

describe("LoginCompletionService", () => {
  let req: Request;
  let audit: jest.Mocked<LoginAuditService>;
  let completion: LoginCompletionService;

  beforeEach(() => {
    req = makeMockRequest();
    audit = createLoginAuditServiceMock();
    completion = new LoginCompletionService(audit);

    mockedGenerateAuthTokensResponse.mockReturnValue({
      accessToken: "a",
      refreshToken: "r",
      idToken: "i",
      expiresIn: 3600
    });
  });

  it("records audit success, issues tokens, returns LoginResponseDto (no avatar)", () => {
    const auth = buildAuth();
    const user = buildUser();

    const result = completion.complete({
      auth,
      user,
      method: LOGIN_METHODS.PASSWORD,
      req
    });

    expect(audit.recordSuccess).toHaveBeenCalledWith({
      auth,
      user,
      method: LOGIN_METHODS.PASSWORD,
      req
    });
    expect(mockedGenerateAuthTokensResponse).toHaveBeenCalledWith({
      userId: user._id.toString(),
      authId: auth._id.toString(),
      email: user.email,
      roles: auth.roles,
      fullName: user.fullName,
      avatar: null,
      tokenVersion: auth.tokenVersion,
      mustChangePassword: auth.mustChangePassword
    });
    expect(result).toEqual({
      accessToken: "a",
      refreshToken: "r",
      idToken: "i",
      expiresIn: 3600
    });
  });

  it("forwards avatar when user has one", () => {
    const auth = buildAuth();
    const user = buildUser({ avatar: "https://cdn/a.png" });

    completion.complete({
      auth,
      user,
      method: LOGIN_METHODS.OTP,
      req
    });

    expect(mockedGenerateAuthTokensResponse).toHaveBeenCalledWith(
      expect.objectContaining({ avatar: "https://cdn/a.png" })
    );
  });
});
