// types
import type { AuthenticationDocument } from "@/modules/authentication/types";
import type { AuthenticationRepository } from "../repository/authentication.repository";
// others
import { Logger } from "@/libs/logger";

export const findById = async (
  authRepo: AuthenticationRepository,
  authId: string
): Promise<AuthenticationDocument | null> => {
  try {
    return await authRepo.findById(authId);
  } catch (error) {
    Logger.error("Failed to find authentication by ID", { authId, error });
    throw error;
  }
};
