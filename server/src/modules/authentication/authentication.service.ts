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
    return await this.authRepo.findById(authId);
  }

  async create(data: CreateAuthenticationData): Promise<AuthenticationRecord> {
    const record = await this.authRepo.create(data);
    Logger.info("New authentication record created", {
      authId: record._id.toString()
    });
    return record;
  }

  async updatePassword(
    authId: string,
    hashedPassword: string
  ): Promise<number> {
    const tokenVersion = await this.authRepo.updatePassword(
      authId,
      hashedPassword
    );
    Logger.info("Password updated", { authId, tokenVersion });
    return tokenVersion;
  }

  async requirePasswordChange(authId: string): Promise<void> {
    await this.authRepo.requirePasswordChange(authId);
    Logger.info("Password change required", { authId });
  }

  async adminResetPassword(
    authId: string,
    hashedPassword: string
  ): Promise<void> {
    await this.authRepo.adminResetPassword(authId, hashedPassword);
    Logger.info("Password reset by admin", { authId });
  }

  async setActive(authId: string, isActive: boolean): Promise<void> {
    await this.authRepo.setActive(authId, isActive);
    Logger.info("Account active flag updated", { authId, isActive });
  }

  async countActiveAdmins(): Promise<number> {
    return await this.authRepo.countActiveAdmins();
  }
}
