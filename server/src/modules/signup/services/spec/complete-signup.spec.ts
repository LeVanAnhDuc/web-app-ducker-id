jest.mock("@/modules/authentication/helpers");
jest.mock("@/utils/crypto/bcrypt");

// types
import type { AuthenticationService } from "@/modules/authentication/services";
import type { UserService } from "@/modules/user/services";
import type { OtpSignupRepository } from "../../repositories/otp-signup.repository";
import type { SessionSignupRepository } from "../../repositories/session-signup.repository";
// common
import { BadRequestError, ConflictRequestError } from "@/exceptions";
// modules
import { generateAuthTokensResponse } from "@/modules/authentication/helpers";
import { AUTHENTICATION_ROLES } from "@/modules/authentication/constants";
// others
import { hashValue } from "@/utils/crypto/bcrypt";
import { EmailAvailableGuard } from "../../guards";
import { SignupService } from "../";
import {
  inTransaction,
  mockTransactions
} from "@test/helpers/transaction.helper";

const mockedGenTokens = generateAuthTokensResponse as jest.MockedFunction<
  typeof generateAuthTokensResponse
>;
const mockedHash = hashValue as jest.MockedFunction<typeof hashValue>;

const EMAIL = "new@example.com";
const AUTH_ID = "auth-1";
const USER_ID = "user-1";

const TOKENS = {
  accessToken: "access",
  refreshToken: "refresh",
  idToken: "id",
  expiresIn: 900
};

const body = {
  email: EMAIL,
  password: "Str0ng@Pass",
  fullName: "Test User",
  gender: "male",
  dateOfBirth: new Date("1998-04-21"),
  sessionToken: "session-token",
  confirmPassword: "Str0ng@Pass",
  acceptTerms: true
} as Parameters<SignupService["completeSignup"]>[0];

const setup = () => {
  const authService = {
    create: jest.fn().mockResolvedValue({ _id: { toString: () => AUTH_ID } })
  } as unknown as jest.Mocked<AuthenticationService>;

  const userService = {
    emailExists: jest.fn().mockResolvedValue(false),
    createProfile: jest
      .fn()
      .mockResolvedValue({ _id: { toString: () => USER_ID } })
  } as unknown as jest.Mocked<UserService>;

  const otpSignupRepo = {
    cleanupOtpData: jest.fn().mockResolvedValue(undefined)
  } as unknown as jest.Mocked<OtpSignupRepository>;

  const sessionSignupRepo = {
    verify: jest.fn().mockResolvedValue(true),
    clear: jest.fn().mockResolvedValue(undefined)
  } as unknown as jest.Mocked<SessionSignupRepository>;

  const service = new SignupService(
    authService,
    userService,
    otpSignupRepo,
    sessionSignupRepo,
    { send: jest.fn() } as never,
    new EmailAvailableGuard(userService),
    {} as never
  );

  return {
    authService,
    userService,
    otpSignupRepo,
    sessionSignupRepo,
    service
  };
};

describe("SignupService.completeSignup", () => {
  let transaction: jest.SpyInstance;

  // `resetMocks: true` wipes implementations between tests, including the ones
  // a jest.mock factory set up — so they are rebuilt here.
  beforeEach(() => {
    mockedGenTokens.mockReturnValue(TOKENS);
    mockedHash.mockReturnValue("hashed-password");
    ({ transaction } = mockTransactions());
  });

  afterEach(() => {
    transaction.mockRestore();
  });

  it("creates the account and returns tokens plus the new profile", async () => {
    const { service } = setup();

    const result = await service.completeSignup(body);

    expect(result).toEqual({
      success: true,
      user: { id: USER_ID, email: EMAIL, fullName: "Test User" },
      tokens: TOKENS
    });
  });

  it("writes auth and profile inside one transaction", async () => {
    const { service, authService, userService } = setup();
    const seen: boolean[] = [];
    authService.create.mockImplementation(async () => {
      seen.push(inTransaction());
      return { _id: { toString: () => AUTH_ID } } as never;
    });
    userService.createProfile.mockImplementation(async () => {
      seen.push(inTransaction());
      return { _id: { toString: () => USER_ID } } as never;
    });

    await service.completeSignup(body);

    expect(transaction).toHaveBeenCalledTimes(1);
    expect(seen).toEqual([true, true]);
  });

  it("keeps the session check and the Redis cleanup outside the transaction", async () => {
    const { service, otpSignupRepo, sessionSignupRepo } = setup();
    const seen: boolean[] = [];
    const record = async () => {
      seen.push(inTransaction());
    };
    sessionSignupRepo.verify.mockImplementation(async () => {
      await record();
      return true;
    });
    otpSignupRepo.cleanupOtpData.mockImplementation(record);
    sessionSignupRepo.clear.mockImplementation(record);

    await service.completeSignup(body);

    expect(seen).toEqual([false, false, false]);
  });

  it("hashes the password and never passes the plaintext on", async () => {
    const { service, authService } = setup();

    await service.completeSignup(body);

    expect(mockedHash).toHaveBeenCalledWith("Str0ng@Pass");
    expect(authService.create).toHaveBeenCalledWith({
      hashedPassword: "hashed-password"
    });
  });

  it("stamps a brand-new account as role user, version 0, no forced change", async () => {
    const { service } = setup();

    await service.completeSignup(body);

    expect(mockedGenTokens).toHaveBeenCalledWith(
      expect.objectContaining({
        roles: AUTHENTICATION_ROLES.USER,
        tokenVersion: 0,
        mustChangePassword: false
      })
    );
  });

  it("clears both the OTP data and the signup session afterwards", async () => {
    const { service, otpSignupRepo, sessionSignupRepo } = setup();

    await service.completeSignup(body);

    expect(otpSignupRepo.cleanupOtpData).toHaveBeenCalledWith(EMAIL);
    expect(sessionSignupRepo.clear).toHaveBeenCalledWith(EMAIL);
  });

  it("rejects an expired or forged session token before creating anything", async () => {
    const { service, sessionSignupRepo, authService } = setup();
    sessionSignupRepo.verify.mockResolvedValue(false);

    await expect(service.completeSignup(body)).rejects.toThrow(BadRequestError);
    expect(authService.create).not.toHaveBeenCalled();
  });

  it("rejects when the email was taken between verify and complete", async () => {
    const { service, userService, authService } = setup();
    userService.emailExists.mockResolvedValue(true);

    await expect(service.completeSignup(body)).rejects.toThrow(
      ConflictRequestError
    );
    expect(authService.create).not.toHaveBeenCalled();
  });

  it("turns a duplicate-email race inside the transaction into a 409", async () => {
    const { service, authService } = setup();
    authService.create.mockRejectedValue(
      Object.assign(new Error("E11000"), {
        code: 11000,
        keyPattern: { email: 1 }
      })
    );

    await expect(service.completeSignup(body)).rejects.toThrow(
      ConflictRequestError
    );
  });

  it("keeps the signup data when the write fails, so the user can retry", async () => {
    const { service, authService, otpSignupRepo, sessionSignupRepo } = setup();
    authService.create.mockRejectedValue(new Error("mongo down"));

    await expect(service.completeSignup(body)).rejects.toThrow("mongo down");
    expect(otpSignupRepo.cleanupOtpData).not.toHaveBeenCalled();
    expect(sessionSignupRepo.clear).not.toHaveBeenCalled();
  });
});
