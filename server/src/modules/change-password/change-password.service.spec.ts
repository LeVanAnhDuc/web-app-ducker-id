jest.mock("@/modules/authentication/helpers");
jest.mock("@/utils/crypto/bcrypt");
jest.mock("@/utils/request-context", () => ({
  RequestContext: { requireAuthId: jest.fn() }
}));

// types
import type { ChangePasswordRequest } from "./types";
import type { AuthenticationService } from "@/modules/authentication/authentication.service";
import type { UserService } from "@/modules/user/user.service";
import type { EmailDispatcher } from "@/services/email/email.dispatcher";
// common
import { BadRequestError, UnauthorizedError } from "@/common/exceptions";
// modules
import { generateAuthTokensResponse } from "@/modules/authentication/helpers";
import { EmailType } from "@/types/services/email";
// others
import { hashValue, isValidHashedValue } from "@/utils/crypto/bcrypt";
import { RequestContext } from "@/utils/request-context";
import { WrongCurrentPasswordGuard, SamePasswordGuard } from "./guards";
import { ChangePasswordService } from "./change-password.service";

const mockedGenTokens = generateAuthTokensResponse as jest.MockedFunction<
  typeof generateAuthTokensResponse
>;
const mockedHash = hashValue as jest.MockedFunction<typeof hashValue>;
const mockedIsValid = isValidHashedValue as jest.MockedFunction<
  typeof isValidHashedValue
>;
const mockedRequireAuthId = RequestContext.requireAuthId as jest.MockedFunction<
  typeof RequestContext.requireAuthId
>;

const buildReq = () =>
  ({
    body: {
      currentPassword: "OldPass1!",
      newPassword: "NewPass1!",
      confirmPassword: "NewPass1!"
    },
    ip: "1.2.3.4",
    headers: { "user-agent": "jest" }
  }) as unknown as ChangePasswordRequest;

const AUTH = {
  _id: { toString: () => "auth1" },
  password: "storedHash",
  roles: "user"
};
const USER = {
  _id: { toString: () => "user1" },
  email: "u@e.vn",
  fullName: "U",
  avatar: null
};

const makeService = () => {
  const authService = {
    findById: jest.fn(),
    updatePassword: jest.fn()
  } as unknown as jest.Mocked<AuthenticationService>;
  const userService = {
    findByAuthId: jest.fn()
  } as unknown as jest.Mocked<UserService>;
  const emailDispatcher = {
    send: jest.fn()
  } as unknown as jest.Mocked<EmailDispatcher>;
  const service = new ChangePasswordService(
    authService,
    userService,
    emailDispatcher,
    new WrongCurrentPasswordGuard(),
    new SamePasswordGuard()
  );
  return { service, authService, userService, emailDispatcher };
};

describe("ChangePasswordService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedRequireAuthId.mockReturnValue("auth1");
    mockedHash.mockReturnValue("newHash");
    mockedGenTokens.mockReturnValue({
      accessToken: "a",
      refreshToken: "r",
      idToken: "i",
      expiresIn: 3600
    });
  });

  it("throws UnauthorizedError when the auth record is not found", async () => {
    const { service, authService } = makeService();
    authService.findById.mockResolvedValue(null as never);

    await expect(service.changePassword(buildReq())).rejects.toThrow(
      UnauthorizedError
    );
    expect(authService.updatePassword).not.toHaveBeenCalled();
  });

  it("throws UnauthorizedError when the user is not found after the password update", async () => {
    const { service, authService, userService, emailDispatcher } =
      makeService();
    mockedIsValid.mockReturnValue(true);
    authService.findById.mockResolvedValue(AUTH as never);
    userService.findByAuthId.mockResolvedValue(null as never);

    await expect(service.changePassword(buildReq())).rejects.toThrow(
      UnauthorizedError
    );
    expect(authService.updatePassword).toHaveBeenCalledWith("auth1", "newHash");
    expect(mockedGenTokens).not.toHaveBeenCalled();
    expect(emailDispatcher.send).not.toHaveBeenCalled();
  });

  it("throws when current password is wrong", async () => {
    const { service, authService } = makeService();
    mockedIsValid.mockReturnValue(false);
    authService.findById.mockResolvedValue(AUTH as never);

    await expect(service.changePassword(buildReq())).rejects.toThrow(
      BadRequestError
    );
    expect(authService.updatePassword).not.toHaveBeenCalled();
  });

  it("updates password, issues new tokens after update, sends alert", async () => {
    const { service, authService, userService, emailDispatcher } =
      makeService();
    mockedIsValid.mockReturnValue(true);
    authService.findById.mockResolvedValue(AUTH as never);
    userService.findByAuthId.mockResolvedValue(USER as never);

    const result = await service.changePassword(buildReq());

    expect(authService.updatePassword).toHaveBeenCalledWith("auth1", "newHash");
    expect(mockedGenTokens).toHaveBeenCalledWith({
      userId: "user1",
      authId: "auth1",
      email: "u@e.vn",
      roles: "user",
      fullName: "U",
      avatar: null,
      mustChangePassword: false
    });
    expect(emailDispatcher.send).toHaveBeenCalledWith(
      EmailType.PASSWORD_CHANGED,
      expect.objectContaining({ email: "u@e.vn" })
    );
    expect(result).toEqual({
      accessToken: "a",
      refreshToken: "r",
      idToken: "i",
      expiresIn: 3600
    });
  });
});
