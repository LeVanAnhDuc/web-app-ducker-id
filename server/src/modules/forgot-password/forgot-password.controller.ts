// types
import type {
  FPOtpSendRequest,
  FPOtpVerifyRequest,
  FPMagicLinkSendRequest,
  FPMagicLinkVerifyRequest,
  FPResetPasswordRequest
} from "./types";
import type { ForgotPasswordService } from "./services/forgot-password";

export class ForgotPasswordController {
  constructor(private readonly service: ForgotPasswordService) {}

  sendOtp = async (req: FPOtpSendRequest) => this.service.sendOtp(req);

  verifyOtp = async (req: FPOtpVerifyRequest) => this.service.verifyOtp(req);

  sendMagicLink = async (req: FPMagicLinkSendRequest) =>
    this.service.sendMagicLink(req);

  verifyMagicLink = async (req: FPMagicLinkVerifyRequest) =>
    this.service.verifyMagicLink(req);

  resetPassword = async (req: FPResetPasswordRequest) =>
    this.service.resetPassword(req);
}
