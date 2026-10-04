// types
import type { Request } from "express";
import type { AuthenticationDocument } from "@/modules/authentication/types";
import type { UserDocument } from "@/modules/user/types";
import type { LoginMethod } from "@/modules/login-history/types";
import type { LoginHistoryService } from "@/modules/login-history/login-history.service";
// others
import { recordEmailNotVerified } from "./record-email-not-verified";
import { recordInactiveAccount } from "./record-inactive-account";
import { recordInvalidCredentials } from "./record-invalid-credentials";
import { recordInvalidMagicLink } from "./record-invalid-magic-link";
import { recordInvalidOtp } from "./record-invalid-otp";
import { recordInvalidPassword } from "./record-invalid-password";
import { recordSuccess } from "./record-success";

export class LoginAuditService {
  constructor(private readonly historyService: LoginHistoryService) {}

  recordSuccess(params: {
    auth: AuthenticationDocument;
    user: UserDocument;
    method: LoginMethod;
    req: Request;
  }): void {
    recordSuccess(this.historyService, params);
  }

  recordInvalidCredentials(params: { email: string; req: Request }): void {
    recordInvalidCredentials(this.historyService, params);
  }

  recordInvalidPassword(params: {
    auth: AuthenticationDocument;
    email: string;
    attemptCount: number;
    req: Request;
  }): void {
    recordInvalidPassword(this.historyService, params);
  }

  recordInactiveAccount(params: {
    auth: AuthenticationDocument;
    email: string;
    method: LoginMethod;
    req: Request;
  }): void {
    recordInactiveAccount(this.historyService, params);
  }

  recordEmailNotVerified(params: {
    auth: AuthenticationDocument;
    email: string;
    method: LoginMethod;
    req: Request;
  }): void {
    recordEmailNotVerified(this.historyService, params);
  }

  recordInvalidOtp(params: {
    auth: AuthenticationDocument;
    email: string;
    attempts: number;
    req: Request;
  }): void {
    recordInvalidOtp(this.historyService, params);
  }

  recordInvalidMagicLink(params: {
    auth: AuthenticationDocument;
    email: string;
    req: Request;
  }): void {
    recordInvalidMagicLink(this.historyService, params);
  }
}
