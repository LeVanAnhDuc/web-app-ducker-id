// types
import type {
  AuthenticationRecord,
  CreateAuthenticationData
} from "@/modules/authentication/types";
import type { AuthenticationRepository } from "../repository/authentication.repository";
// others
import { Logger } from "@/libs/logger";

export const create = async (
  authRepo: AuthenticationRepository,
  data: CreateAuthenticationData
): Promise<AuthenticationRecord> => {
  try {
    const record = await authRepo.create(data);
    Logger.info("New authentication record created", {
      authId: record._id.toString()
    });
    return record;
  } catch (error) {
    Logger.error("Failed to create authentication record", { error });
    throw error;
  }
};
