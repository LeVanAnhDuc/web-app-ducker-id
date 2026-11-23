// types
import type {
  AuthenticationDocument,
  AuthenticationRecord,
  CreateAuthenticationData
} from "@/modules/authentication/types";
import type { AuthenticationRepository } from "./repository/authentication.repository";
// others
import { Logger } from "@/libs/logger";

export class AuthenticationService {
  constructor(private readonly authRepo: AuthenticationRepository) {}

  async findById(authId: string): Promise<AuthenticationDocument | null> {
    try {
      return await this.authRepo.findById(authId);
    } catch (error) {
      Logger.error("Failed to find authentication by ID", { authId, error });
      throw error;
    }
  }

  async create(data: CreateAuthenticationData): Promise<AuthenticationRecord> {
    try {
      const record = await this.authRepo.create(data);
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
    hashedPassword: string
  ): Promise<number> {
    try {
      const tokenVersion = await this.authRepo.updatePassword(
        authId,
        hashedPassword
      );
      Logger.info("Password updated", { authId, tokenVersion });
      return tokenVersion;
    } catch (error) {
      Logger.error("Failed to update password", { authId, error });
      throw error;
    }
  }

  async requirePasswordChange(authId: string): Promise<void> {
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
    try {
      await this.authRepo.adminResetPassword(authId, hashedPassword);
      Logger.info("Password reset by admin", { authId });
    } catch (error) {
      Logger.error("Failed to admin-reset password", { authId, error });
      throw error;
    }
  }

  async setActive(authId: string, isActive: boolean): Promise<void> {
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
