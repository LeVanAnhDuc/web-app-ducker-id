// types
import type { UserRepository } from "../repository/user.repository";
// validators
import { validateEmail } from "@/validators/utils";
// others
import { Logger } from "@/libs/logger";

export const emailExists = async (
  userRepo: UserRepository,
  email: string
): Promise<boolean> => {
  validateEmail(email);

  try {
    return await userRepo.emailExists(email);
  } catch (error) {
    Logger.error("Failed to check email existence", { email, error });
    throw error;
  }
};
