// types
import type { FPResetPasswordRequest } from "../../types";
import type { ResetPasswordResponseDto } from "../../dtos";
import type { AuthenticationService } from "@/modules/authentication/services";
import type { ResetTokenRepository } from "../../repositories/reset-token.repository";
import type { AuthExistsGuard, ResetTokenValidGuard } from "../../guards";
import type { ForgotPasswordAuditService } from "../forgot-password-audit";
// dtos
import { toResetPasswordResponseDto } from "../../dtos";
// others
import { hashValue } from "@/utils/crypto/bcrypt";

export const resetPassword = async (
  deps: {
    authService: AuthenticationService;
    resetTokenRepo: ResetTokenRepository;
    authExistsGuard: AuthExistsGuard;
    resetTokenValidGuard: ResetTokenValidGuard;
    audit: ForgotPasswordAuditService;
  },
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
