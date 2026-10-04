// libs
import mongoose from "mongoose";
// types
import type { Schema } from "mongoose";
import type { Gender } from "@/modules/user/types";
import type { CompleteSignupBody } from "../types";
import type { CompleteSignupDto } from "../dtos";
import type { SignupServiceDeps } from "./deps";
// common
import {
  BadRequestError,
  ConflictRequestError,
  InternalServerError
} from "@/common/exceptions";
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

/**
 * Không phải helper: hàm này mở transaction Mongo. Nó sống ở đây vì chỉ
 * `completeSignup` dùng tới — trước kia là private method của `SignupService`.
 */
const createUserAccount = async (
  deps: SignupServiceDeps,
  email: string,
  password: string,
  fullName: string,
  gender: Gender,
  dateOfBirth: string
): Promise<{
  authId: Schema.Types.ObjectId;
  userId: Schema.Types.ObjectId;
  email: string;
  fullName: string;
}> => {
  const session = await mongoose.startSession();

  try {
    const result = await session.withTransaction(async () => {
      const hashedPassword = hashValue(password);

      const auth = await deps.authService.create({ hashedPassword }, session);

      Logger.debug("Auth record created", {
        email,
        authId: auth._id.toString()
      });

      const user = await deps.userService.createProfile(
        {
          authId: auth._id,
          email,
          fullName,
          gender,
          dateOfBirth: new Date(dateOfBirth)
        },
        session
      );

      Logger.info("User profile created", {
        userId: user._id.toString(),
        authId: auth._id.toString()
      });

      return { authId: auth._id, userId: user._id, email, fullName };
    });

    if (!result) {
      throw new InternalServerError({
        message: "Signup transaction was aborted"
      });
    }

    return result;
  } catch (err) {
    if (isDuplicateKeyError(err) && getDuplicatedField(err) === "email") {
      Logger.warn("Signup email duplicate key (race condition)", { email });
      throw new ConflictRequestError({
        i18nMessage: (t) => t("signup:errors.emailAlreadyExists"),
        code: ERROR_CODES.SIGNUP_EMAIL_EXISTS
      });
    }
    throw err;
  } finally {
    await session.endSession();
  }
};

export const completeSignup = async (
  deps: SignupServiceDeps,
  body: CompleteSignupBody
): Promise<CompleteSignupDto> => {
  const { email, password, fullName, gender, dateOfBirth, sessionToken } = body;

  const isValid = await deps.sessionSignupRepo.verify(email, sessionToken);

  if (!isValid) {
    Logger.warn("Invalid or expired signup session", { email });
    throw new BadRequestError({
      i18nMessage: (t) => t("signup:errors.invalidSession"),
      code: ERROR_CODES.SIGNUP_SESSION_INVALID
    });
  }

  await deps.emailAvailableGuard.assert(email);

  const account = await createUserAccount(
    deps,
    email,
    password,
    fullName,
    gender,
    dateOfBirth
  );

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
