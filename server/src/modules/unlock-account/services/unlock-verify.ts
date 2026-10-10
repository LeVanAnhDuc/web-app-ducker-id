// types
import type { Request } from "express";
import type { UnlockVerifyBody } from "../types";
import type { UnlockVerifyDto } from "../dtos";
import type { UnlockAccountServiceDeps } from "./deps";
// modules
import { generateAuthTokensResponse } from "@/modules/authentication/helpers";
import { LOGIN_METHODS } from "@/modules/login-history/constants";
// dtos
import { toUnlockVerifyDto } from "../dtos";
// others
import { Logger } from "@/libs/logger";
import { withRetry } from "@/utils/resilience/retry";

export const unlockVerify = async (
  deps: UnlockAccountServiceDeps,
  body: UnlockVerifyBody,
  req: Request
): Promise<UnlockVerifyDto> => {
  const { email, tempPassword } = body;

  Logger.info("Processing unlock verify", { email });

  const { auth, user } = await deps.authExistsGuard.assert(email);

  await deps.tempPasswordValidGuard.assert(email, tempPassword);

  Logger.info("Temp password verified successfully", {
    email,
    authId: auth._id
  });

  withRetry(() => deps.loginService.resetFailedAttempts(email), {
    operationName: "resetFailedAttemptsAfterUnlock",
    context: { email }
  });

  await deps.authService.requirePasswordChange(auth._id.toString());

  Logger.info("Password change required after unlock", {
    email,
    authId: auth._id
  });

  deps.loginHistoryService.recordSuccessfulLogin({
    userId: auth._id,
    usernameAttempted: email,
    loginMethod: LOGIN_METHODS.PASSWORD,
    req
  });

  Logger.info("Unlock successful - tokens generated", {
    email,
    authId: auth._id
  });

  return toUnlockVerifyDto(
    generateAuthTokensResponse({
      userId: user._id.toString(),
      authId: auth._id.toString(),
      email: user.email,
      roles: auth.roles,
      fullName: user.fullName,
      avatar: user.avatar ?? null,
      tokenVersion: auth.tokenVersion ?? 0,
      // `auth` được đọc trước khi requirePasswordChange() chạy nên cờ trong
      // doc đó đã cũ — mở khoá xong thì bắt buộc đổi mật khẩu, luôn là true.
      mustChangePassword: true
    })
  );
};
