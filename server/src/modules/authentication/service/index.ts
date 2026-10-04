// types
import type {
  AuthenticationDocument,
  AuthenticationRecord,
  CreateAuthenticationData
} from "@/modules/authentication/types";
import type { ClientSession } from "mongoose";
import type { AuthenticationRepository } from "../repository/authentication.repository";
// others
import { adminResetPassword } from "./admin-reset-password";
import { countActiveAdmins } from "./count-active-admins";
import { create } from "./create";
import { findById } from "./find-by-id";
import { requirePasswordChange } from "./require-password-change";
import { setActive } from "./set-active";
import { updatePassword } from "./update-password";

/**
 * Façade over the per-method files in this folder — one file per use case.
 * Every method here is a one-line delegate: validation, logging and the
 * repository call live in the method file, never in this class.
 */
export class AuthenticationService {
  constructor(private readonly authRepo: AuthenticationRepository) {}

  findById(authId: string): Promise<AuthenticationDocument | null> {
    return findById(this.authRepo, authId);
  }

  create(
    data: CreateAuthenticationData,
    session?: ClientSession
  ): Promise<AuthenticationRecord> {
    return create(this.authRepo, data, session);
  }

  updatePassword(
    authId: string,
    hashedPassword: string,
    session?: ClientSession
  ): Promise<number> {
    return updatePassword(this.authRepo, authId, hashedPassword, session);
  }

  requirePasswordChange(authId: string): Promise<void> {
    return requirePasswordChange(this.authRepo, authId);
  }

  adminResetPassword(authId: string, hashedPassword: string): Promise<void> {
    return adminResetPassword(this.authRepo, authId, hashedPassword);
  }

  setActive(authId: string, isActive: boolean): Promise<void> {
    return setActive(this.authRepo, authId, isActive);
  }

  countActiveAdmins(): Promise<number> {
    return countActiveAdmins(this.authRepo);
  }
}
