// types
import type { AuthenticationRepository } from "../repository/authentication.repository";
// others
import { Logger } from "@/libs/logger";

export const requirePasswordChange = async (
  authRepo: AuthenticationRepository,
  authId: string
): Promise<void> => {
  try {
    await authRepo.requirePasswordChange(authId);
    Logger.info("Password change required", { authId });
  } catch (error) {
    Logger.error("Failed to require password change", { authId, error });
    throw error;
  }
};
