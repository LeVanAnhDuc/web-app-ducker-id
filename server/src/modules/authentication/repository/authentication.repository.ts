// types
import type {
  AuthenticationDocument,
  AuthenticationRecord,
  CreateAuthenticationData
} from "@/modules/authentication/types";
import type { ClientSession } from "mongoose";

export interface AuthenticationRepository {
  findById(authId: string): Promise<AuthenticationDocument | null>;
  create(
    data: CreateAuthenticationData,
    session?: ClientSession
  ): Promise<AuthenticationRecord>;
  requirePasswordChange(authId: string): Promise<void>;
  updatePassword(
    authId: string,
    hashedPassword: string,
    session?: ClientSession
  ): Promise<number>;
  adminResetPassword(authId: string, hashedPassword: string): Promise<void>;
  setActive(authId: string, isActive: boolean): Promise<void>;
  countActiveAdmins(): Promise<number>;
}
