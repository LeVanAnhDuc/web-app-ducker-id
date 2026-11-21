// types
import type { CreateUserData, UserRecord } from "@/modules/user/types";
import type { ClientSession } from "mongoose";
import type { UserRepository } from "../repository/user.repository";

export const createProfile = async (
  userRepo: UserRepository,
  data: CreateUserData,
  session?: ClientSession
): Promise<UserRecord> => userRepo.createProfile(data, session);
