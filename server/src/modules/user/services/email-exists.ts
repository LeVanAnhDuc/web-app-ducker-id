// types
import type { UserRepository } from "../repository/user.repository";
// others
import { Logger } from "@/libs/logger";

export const emailExists = async (
  userRepo: UserRepository,
  email: string
): Promise<boolean> => {
  try {
    return await userRepo.emailExists(email);
  } catch (error) {
    Logger.error("Failed to check email existence", { email, error });
    throw error;
  }
};
