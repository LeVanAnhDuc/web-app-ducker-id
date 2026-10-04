// types
import type { UserWithAuth } from "@/modules/user/types";
import type { UserServiceDeps } from "./deps";
// validators
import { validateEmail } from "@/validators/utils";
// others
import { Logger } from "@/libs/logger";

export const findByEmailWithAuth = async (
  deps: UserServiceDeps,
  email: string
): Promise<UserWithAuth | null> => {
  validateEmail(email);

  try {
    return await deps.userRepo.findByEmailWithAuth(email);
  } catch (error) {
    Logger.error("Failed to find auth by email", { email, error });
    throw error;
  }
};
