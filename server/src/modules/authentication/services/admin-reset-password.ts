// types
import type { AuthenticationRepository } from "../repository/authentication.repository";
// others
import { Logger } from "@/libs/logger";

export const adminResetPassword = async (
  authRepo: AuthenticationRepository,
  authId: string,
  hashedPassword: string
): Promise<void> => {
  try {
    await authRepo.adminResetPassword(authId, hashedPassword);
    Logger.info("Password reset by admin", { authId });
  } catch (error) {
    Logger.error("Failed to admin-reset password", { authId, error });
    throw error;
  }
};
