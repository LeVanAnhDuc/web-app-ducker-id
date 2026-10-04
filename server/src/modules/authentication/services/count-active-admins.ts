// types
import type { AuthenticationRepository } from "../repository/authentication.repository";
// others
import { Logger } from "@/libs/logger";

export const countActiveAdmins = async (
  authRepo: AuthenticationRepository
): Promise<number> => {
  try {
    return await authRepo.countActiveAdmins();
  } catch (error) {
    Logger.error("Failed to count active admins", { error });
    throw error;
  }
};
