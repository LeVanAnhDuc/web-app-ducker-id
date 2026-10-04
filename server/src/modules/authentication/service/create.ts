// types
import type {
  AuthenticationRecord,
  CreateAuthenticationData
} from "@/modules/authentication/types";
import type { ClientSession } from "mongoose";
import type { AuthenticationRepository } from "../repository/authentication.repository";
// validators
import { validateRequiredString } from "@/validators/utils";
// others
import { Logger } from "@/libs/logger";

export const create = async (
  authRepo: AuthenticationRepository,
  data: CreateAuthenticationData,
  session?: ClientSession
): Promise<AuthenticationRecord> => {
  validateRequiredString(data.hashedPassword, "hashedPassword");

  try {
    const record = await authRepo.create(data, session);
    Logger.info("New authentication record created", {
      authId: record._id.toString()
    });
    return record;
  } catch (error) {
    Logger.error("Failed to create authentication record", { error });
    throw error;
  }
};
