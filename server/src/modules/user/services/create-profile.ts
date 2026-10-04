// types
import type { CreateUserData, UserRecord } from "@/modules/user/types";
import type { ClientSession } from "mongoose";
import type { UserServiceDeps } from "./deps";

export const createProfile = async (
  deps: UserServiceDeps,
  data: CreateUserData,
  session?: ClientSession
): Promise<UserRecord> => deps.userRepo.createProfile(data, session);
