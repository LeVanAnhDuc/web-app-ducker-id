// types
import type { ClientSession } from "mongoose";
import type { AuthenticationRepository } from "../repository/authentication.repository";
// validators
import { validateObjectId, validateRequiredString } from "@/validators/utils";
// others
import { Logger } from "@/libs/logger";

export const updatePassword = async (
  authRepo: AuthenticationRepository,
  authId: string,
  hashedPassword: string,
  session?: ClientSession
): Promise<number> => {
  validateObjectId(authId, "authId");
  validateRequiredString(hashedPassword, "hashedPassword");

  try {
    const tokenVersion = await authRepo.updatePassword(
      authId,
      hashedPassword,
      session
    );
    Logger.info("Password updated", { authId, tokenVersion });
    return tokenVersion;
  } catch (error) {
    Logger.error("Failed to update password", { authId, error });
    throw error;
  }
};
