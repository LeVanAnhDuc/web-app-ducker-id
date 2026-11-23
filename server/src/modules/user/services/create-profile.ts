// types
import type { CreateUserData, UserRecord } from "@/modules/user/types";
import type { UserRepository } from "../repository/user.repository";

export const createProfile = async (
  userRepo: UserRepository,
  data: CreateUserData
): Promise<UserRecord> => userRepo.createProfile(data);
