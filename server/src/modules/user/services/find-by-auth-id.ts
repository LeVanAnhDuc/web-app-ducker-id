// types
import type { UserDocument } from "@/modules/user/types";
import type { UserRepository } from "../repository/user.repository";
// others
import { Logger } from "@/libs/logger";

export const findByAuthId = async (
  userRepo: UserRepository,
  authId: string
): Promise<{
  _id: UserDocument["_id"];
  email: string;
  fullName: string;
  avatar?: string | null;
} | null> => {
  try {
    return await userRepo.findByAuthId(authId);
  } catch (error) {
    Logger.error("Failed to find user by auth ID", { authId, error });
    throw error;
  }
};
