// libs
import { JsonController, Post, Req } from "routing-controllers";
// types
import type {
  FPOtpSendRequest,
  FPOtpVerifyRequest,
  FPMagicLinkSendRequest,
  FPMagicLinkVerifyRequest,
  FPResetPasswordRequest
} from "./types";
import type { ForgotPasswordService } from "./services/forgot-password";
// common
import { RateLimit, Respond, ValidBody } from "@/common/routing";
// others
import {
  ForgotPasswordMagicLinkSendBodyDto,
  ForgotPasswordMagicLinkVerifyBodyDto,
  ForgotPasswordOtpSendBodyDto,
  ForgotPasswordOtpVerifyBodyDto,
  ResetPasswordBodyDto
} from "./dtos/requests";

/**
 * The service and its strategies take the whole request (body plus ip and
 * user agent for the audit), so each action declares its body DTO for the
 * pipe and hands over `req`, whose body the pipe has already replaced.
 */
@JsonController("/auth/forgot-password")
export class ForgotPasswordController {
  constructor(private readonly service: ForgotPasswordService) {}

  @Post("/otp/send")
  @RateLimit("forgotPasswordOtpByIp", "forgotPasswordOtpByEmail")
  @Respond({ message: "forgotPassword:success.otpSent" })
  sendOtp(
    @ValidBody(ForgotPasswordOtpSendBodyDto) _body: ForgotPasswordOtpSendBodyDto,
    @Req() req: FPOtpSendRequest
  ) {
    return this.service.sendOtp(req);
  }

  @Post("/otp/verify")
  @RateLimit("forgotPasswordOtpByIp")
  @Respond({ message: "forgotPassword:success.otpVerified" })
  verifyOtp(
    @ValidBody(ForgotPasswordOtpVerifyBodyDto) _body: ForgotPasswordOtpVerifyBodyDto,
    @Req() req: FPOtpVerifyRequest
  ) {
    return this.service.verifyOtp(req);
  }

  @Post("/magic-link/send")
  @RateLimit("forgotPasswordMagicLinkByIp", "forgotPasswordMagicLinkByEmail")
  @Respond({ message: "forgotPassword:success.magicLinkSent" })
  sendMagicLink(
    @ValidBody(ForgotPasswordMagicLinkSendBodyDto) _body: ForgotPasswordMagicLinkSendBodyDto,
    @Req() req: FPMagicLinkSendRequest
  ) {
    return this.service.sendMagicLink(req);
  }

  @Post("/magic-link/verify")
  @RateLimit("forgotPasswordMagicLinkByIp")
  @Respond({ message: "forgotPassword:success.magicLinkVerified" })
  verifyMagicLink(
    @ValidBody(ForgotPasswordMagicLinkVerifyBodyDto) _body: ForgotPasswordMagicLinkVerifyBodyDto,
    @Req() req: FPMagicLinkVerifyRequest
  ) {
    return this.service.verifyMagicLink(req);
  }

  @Post("/reset")
  @RateLimit("forgotPasswordResetByIp")
  @Respond({ message: "forgotPassword:success.passwordReset" })
  resetPassword(
    @ValidBody(ResetPasswordBodyDto) _body: ResetPasswordBodyDto,
    @Req() req: FPResetPasswordRequest
  ) {
    return this.service.resetPassword(req);
  }
}
