// types
import type { Request } from "express";
import type { AuthenticationDocument } from "@/modules/authentication/types";
import type { LoginHistoryService } from "@/modules/login-history/services";
// others
import { recordInvalidMagicLink } from "./record-invalid-magic-link";
import { recordInvalidOtp } from "./record-invalid-otp";
import { recordPasswordReset } from "./record-password-reset";

export class ForgotPasswordAuditService {
  constructor(private readonly historyService: LoginHistoryService) {}

  recordInvalidOtp(params: {
    email: string;
    auth: AuthenticationDocument;
    attempts: number;
    req: Request;
  }): void {
    recordInvalidOtp(this.historyService, params);
  }

  recordInvalidMagicLink(params: {
    email: string;
    auth: AuthenticationDocument;
    req: Request;
  }): void {
    recordInvalidMagicLink(this.historyService, params);
  }

  recordPasswordReset(params: {
    email: string;
    auth: AuthenticationDocument;
    req: Request;
  }): void {
    recordPasswordReset(this.historyService, params);
  }
}
