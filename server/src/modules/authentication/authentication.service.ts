// types
import type {
  AuthenticationDocument,
  AuthenticationRecord,
  CreateAuthenticationData
} from "@/modules/authentication/types";
import type { ClientSession } from "mongoose";
import type { AuthenticationRepository } from "./authentication.repository";
// validators
import { validateObjectId, validateRequiredString } from "@/validators/utils";
// others
import { Logger } from "@/libs/logger";

export class AuthenticationService {
  constructor(private readonly authRepo: AuthenticationRepository) {}

  async findById(authId: string): Promise<AuthenticationDocument | null> {
    validateObjectId(authId, "authId");

    try {
      return await this.authRepo.findById(authId);
    } catch (error) {
      Logger.error("Failed to find authentication by ID", { authId, error });
      throw error;
    }
  }

  async create(
    data: CreateAuthenticationData,
    session?: ClientSession
  ): Promise<AuthenticationRecord> {
    validateRequiredString(data.hashedPassword, "hashedPassword");

    try {
      const record = await this.authRepo.create(data, session);
      Logger.info("New authentication record created", {
        authId: record._id.toString()
      });
      return record;
    } catch (error) {
      Logger.error("Failed to create authentication record", { error });
      throw error;
    }
  }

  async updatePassword(
    authId: string,
    hashedPassword: string,
    session?: ClientSession
  ): Promise<number> {
    validateObjectId(authId, "authId");
    validateRequiredString(hashedPassword, "hashedPassword");

    try {
      const tokenVersion = await this.authRepo.updatePassword(
        authId,
        hashedPassword,
        session
      );
      Logger.info("Password updated", { authId, tokenVersion });
      return tokenVersion;
    } catch (error) {
      Logger.error("Failed to update password", { authId, error });
      throw error;
    }
  }

  async requirePasswordChange(authId: string): Promise<void> {
    validateObjectId(authId, "authId");

    try {
      await this.authRepo.requirePasswordChange(authId);
      Logger.info("Password change required", { authId });
    } catch (error) {
      Logger.error("Failed to require password change", { authId, error });
      throw error;
    }
  }

  async adminResetPassword(
    authId: string,
    hashedPassword: string
  ): Promise<void> {
    validateObjectId(authId, "authId");
    validateRequiredString(hashedPassword, "hashedPassword");

    try {
      await this.authRepo.adminResetPassword(authId, hashedPassword);
      Logger.info("Password reset by admin", { authId });
    } catch (error) {
      Logger.error("Failed to admin-reset password", { authId, error });
      throw error;
    }
  }

  async setActive(authId: string, isActive: boolean): Promise<void> {
    validateObjectId(authId, "authId");

    try {
      await this.authRepo.setActive(authId, isActive);
      Logger.info("Account active flag updated", { authId, isActive });
    } catch (error) {
      Logger.error("Failed to update account active flag", {
        authId,
        isActive,
        error
      });
      throw error;
    }
  }

  async countActiveAdmins(): Promise<number> {
    try {
      return await this.authRepo.countActiveAdmins();
    } catch (error) {
      Logger.error("Failed to count active admins", { error });
      throw error;
    }
  }
}
