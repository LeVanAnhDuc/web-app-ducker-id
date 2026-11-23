// types
import type { UserWithAuth } from "@/modules/user/types";
import type { UserRepository } from "../repository/user.repository";
// others
import { Logger } from "@/libs/logger";

export const findByEmailWithAuth = async (
  userRepo: UserRepository,
  email: string
): Promise<UserWithAuth | null> => {
  try {
    return await userRepo.findByEmailWithAuth(email);
  } catch (error) {
    Logger.error("Failed to find auth by email", { email, error });
    throw error;
  }
};
