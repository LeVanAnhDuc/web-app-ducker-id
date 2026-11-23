// types
import type { Schema } from "mongoose";
import type { Gender } from "@/modules/user/types";
import type { CompleteSignupBodyDto } from "../dtos/requests";
import type { CompleteSignupDto } from "../dtos";
import type { AuthenticationService } from "@/modules/authentication/authentication.service";
import type { UserService } from "@/modules/user/services";
import type { OtpSignupRepository } from "../repositories/otp-signup.repository";
import type { SessionSignupRepository } from "../repositories/session-signup.repository";
import type { EmailAvailableGuard } from "../guards";
// common
import { BadRequestError, ConflictRequestError } from "@/exceptions";
// modules
import { generateAuthTokensResponse } from "@/modules/authentication/helpers";
import { AUTHENTICATION_ROLES } from "@/modules/authentication/constants";
// dtos
import { toCompleteSignupDto } from "../dtos";
// others
import { ERROR_CODES } from "@/constants/error-code";
import { Logger } from "@/libs/logger";
import { hashValue } from "@/utils/crypto/bcrypt";
import { isDuplicateKeyError, getDuplicatedField } from "@/utils/mongo-errors";

export interface NewAccount {
  email: string;
  password: string;
  fullName: string;
  gender: Gender;
  dateOfBirth: Date;
}

export interface CreatedAccount {
  authId: Schema.Types.ObjectId;
  userId: Schema.Types.ObjectId;
  email: string;
  fullName: string;
}

/**
 * The auth record and the profile are written together or not at all:
 * `SignupService.createUserAccount` runs this under `@Transactional()`. Only
 * these two writes belong in the transaction — `withTransaction` may re-run
 * the callback, and the Redis cleanup in `completeSignup` must not repeat.
 */
export const createUserAccount = async (
  deps: {
    authService: AuthenticationService;
    userService: UserService;
  },
  { email, password, fullName, gender, dateOfBirth }: NewAccount
): Promise<CreatedAccount> => {
  try {
    const hashedPassword = hashValue(password);

    const auth = await deps.authService.create({ hashedPassword });

    Logger.debug("Auth record created", {
      email,
      authId: auth._id.toString()
    });

    const user = await deps.userService.createProfile({
      authId: auth._id,
      email,
      fullName,
      gender,
      dateOfBirth
    });

    Logger.info("User profile created", {
      userId: user._id.toString(),
      authId: auth._id.toString()
    });

    return { authId: auth._id, userId: user._id, email, fullName };
  } catch (err) {
    if (isDuplicateKeyError(err) && getDuplicatedField(err) === "email") {
      Logger.warn("Signup email duplicate key (race condition)", { email });
      throw new ConflictRequestError({
        key: "signup:errors.emailAlreadyExists",
        code: ERROR_CODES.SIGNUP_EMAIL_EXISTS
      });
    }
    throw err;
  }
};

export const completeSignup = async (
  deps: {
    createUserAccount: (account: NewAccount) => Promise<CreatedAccount>;
    otpSignupRepo: OtpSignupRepository;
    sessionSignupRepo: SessionSignupRepository;
    emailAvailableGuard: EmailAvailableGuard;
  },
  body: CompleteSignupBodyDto
): Promise<CompleteSignupDto> => {
  const { email, password, fullName, gender, dateOfBirth, sessionToken } = body;

  const isValid = await deps.sessionSignupRepo.verify(email, sessionToken);

  if (!isValid) {
    Logger.warn("Invalid or expired signup session", { email });
    throw new BadRequestError({
      key: "signup:errors.invalidSession",
      code: ERROR_CODES.SIGNUP_SESSION_INVALID
    });
  }

  await deps.emailAvailableGuard.assert(email);

  const account = await deps.createUserAccount({
    email,
    password,
    fullName,
    gender,
    dateOfBirth
  });

  const tokens = generateAuthTokensResponse({
    userId: account.userId.toString(),
    authId: account.authId.toString(),
    email: account.email,
    roles: AUTHENTICATION_ROLES.USER,
    fullName: account.fullName,
    avatar: null,
    // Freshly-created auth → schema defaults: tokenVersion 0, mustChangePassword false.
    tokenVersion: 0,
    mustChangePassword: false
  });

  await Promise.all([
    deps.otpSignupRepo.cleanupOtpData(email),
    deps.sessionSignupRepo.clear(email)
  ]);

  Logger.debug("Signup data cleaned up", { email });

  Logger.info("New user registered", {
    email,
    userId: account.userId.toString()
  });

  return toCompleteSignupDto(account, tokens);
};
