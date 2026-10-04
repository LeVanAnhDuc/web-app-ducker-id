// types
import type { AdminResetPasswordResult } from "@/modules/user/types";
import type { UserServiceDeps } from "./deps";
// common
import { ForbiddenError, NotFoundError } from "@/common/exceptions";
// validators
import { validateObjectId } from "@/validators/utils";
// others
import ENV from "@/constants/env";
import { ERROR_CODES } from "@/constants/error-code";
import { EmailType } from "@/types/services/email";
import { Logger } from "@/libs/logger";
import { RequestContext } from "@/utils/request-context";
import { hashValue } from "@/utils/crypto/bcrypt";
import { generateTempPassword } from "@/utils/crypto/temp-password";

export const adminResetPassword = async (
  deps: UserServiceDeps,
  id: string
): Promise<AdminResetPasswordResult> => {
  validateObjectId(id, "id");

  const target = await deps.userRepo.findAuthIdById(id);
  if (!target) {
    throw new NotFoundError({
      i18nMessage: (t) => t("user:errors.notFound"),
      code: ERROR_CODES.USER_NOT_FOUND
    });
  }

  if (target.authId === RequestContext.requireAuthId()) {
    throw new ForbiddenError({
      i18nMessage: (t) => t("user:errors.cannotResetSelf"),
      code: ERROR_CODES.ADMIN_CANNOT_RESET_SELF
    });
  }

  const tempPassword = generateTempPassword();
  const hashed = await hashValue(tempPassword);

  await deps.authService.adminResetPassword(target.authId, hashed);

  deps.emailDispatcher.send(EmailType.ADMIN_RESET_PASSWORD, {
    email: target.email,
    data: {
      tempPassword,
      loginUrl: ENV.CLIENT_URL || "http://localhost:3000/login"
    }
  });

  Logger.info("Password reset by admin", {
    userId: id,
    authId: target.authId
  });

  return { _id: id, email: target.email };
};
