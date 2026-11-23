// types
import type { AuthenticationRepository } from "../repository/authentication.repository";
// others
import { Logger } from "@/libs/logger";

export const updatePassword = async (
  authRepo: AuthenticationRepository,
  authId: string,
  hashedPassword: string
): Promise<number> => {
  try {
    const tokenVersion = await authRepo.updatePassword(authId, hashedPassword);
    Logger.info("Password updated", { authId, tokenVersion });
    return tokenVersion;
  } catch (error) {
    Logger.error("Failed to update password", { authId, error });
    throw error;
  }
};
