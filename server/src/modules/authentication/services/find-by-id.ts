// types
import type { AuthenticationDocument } from "@/modules/authentication/types";
import type { AuthenticationRepository } from "../repository/authentication.repository";
// validators
import { validateObjectId } from "@/validators/utils";
// others
import { Logger } from "@/libs/logger";

export const findById = async (
  authRepo: AuthenticationRepository,
  authId: string
): Promise<AuthenticationDocument | null> => {
  validateObjectId(authId, "authId");

  try {
    return await authRepo.findById(authId);
  } catch (error) {
    Logger.error("Failed to find authentication by ID", { authId, error });
    throw error;
  }
};
