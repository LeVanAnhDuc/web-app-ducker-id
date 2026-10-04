// types
import type { UserServiceDeps } from "./deps";
// validators
import { validateEmail } from "@/validators/utils";
// others
import { Logger } from "@/libs/logger";

export const emailExists = async (
  deps: UserServiceDeps,
  email: string
): Promise<boolean> => {
  validateEmail(email);

  try {
    return await deps.userRepo.emailExists(email);
  } catch (error) {
    Logger.error("Failed to check email existence", { email, error });
    throw error;
  }
};
