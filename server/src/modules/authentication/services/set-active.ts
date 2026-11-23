// types
import type { AuthenticationRepository } from "../repository/authentication.repository";
// others
import { Logger } from "@/libs/logger";

export const setActive = async (
  authRepo: AuthenticationRepository,
  authId: string,
  isActive: boolean
): Promise<void> => {
  try {
    await authRepo.setActive(authId, isActive);
    Logger.info("Account active flag updated", { authId, isActive });
  } catch (error) {
    Logger.error("Failed to update account active flag", {
      authId,
      isActive,
      error
    });
    throw error;
  }
};
