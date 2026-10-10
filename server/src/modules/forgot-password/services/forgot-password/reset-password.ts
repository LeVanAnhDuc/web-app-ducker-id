// types
import type { FPResetPasswordRequest } from "../../types";
import type { ResetPasswordResponseDto } from "../../dtos";
import type { ForgotPasswordServiceDeps } from "./deps";
// dtos
import { toResetPasswordResponseDto } from "../../dtos";
// others
import { hashValue } from "@/utils/crypto/bcrypt";

export const resetPassword = async (
  deps: ForgotPasswordServiceDeps,
  req: FPResetPasswordRequest
): Promise<ResetPasswordResponseDto> => {
  const { email, resetToken, newPassword } = req.body;

  await deps.resetTokenValidGuard.assert(email, resetToken);

  const { auth } = await deps.authExistsGuard.assert(email);

  const hashedPassword = hashValue(newPassword);
  await deps.authService.updatePassword(auth._id.toString(), hashedPassword);

  await deps.resetTokenRepo.clear(email);

  deps.audit.recordPasswordReset({ email, auth, req });

  return toResetPasswordResponseDto();
};
