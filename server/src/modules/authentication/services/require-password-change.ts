// types
import type { AuthenticationRepository } from "../repository/authentication.repository";
// validators
import { validateObjectId } from "@/validators/utils";
// others
import { Logger } from "@/libs/logger";

export const requirePasswordChange = async (
  authRepo: AuthenticationRepository,
  authId: string
): Promise<void> => {
  validateObjectId(authId, "authId");

  try {
    await authRepo.requirePasswordChange(authId);
    Logger.info("Password change required", { authId });
  } catch (error) {
    Logger.error("Failed to require password change", { authId, error });
    throw error;
  }
};
