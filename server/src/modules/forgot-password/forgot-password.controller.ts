// libs
import { JsonController, Post, Req } from "routing-controllers";
import { OpenAPI } from "routing-controllers-openapi";
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
import { ApiErrors } from "@/common/openapi";
import { RateLimit, Respond, ValidBody } from "@/common/routing";
// others
import {
  ResetPasswordResponseDto,
  SendMagicLinkResponseDto,
  SendOtpResponseDto,
  VerifyMagicLinkResponseDto,
  VerifyOtpResponseDto
} from "./dtos";
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
@OpenAPI({ tags: ["Auth - Forgot Password"] })
export class ForgotPasswordController {
  constructor(private readonly service: ForgotPasswordService) {}

  @Post("/otp/send")
  @OpenAPI({
    summary: "Send OTP for password recovery",
    description:
      "Sends a 6-digit OTP, valid for 5 minutes, with a 60-second cooldown and at most 3 resends (400 past either). Answers the same for an unknown or inactive email, without sending anything."
  })
  @RateLimit("forgotPasswordOtpByIp", "forgotPasswordOtpByEmail")
  @Respond({
    message: "forgotPassword:success.otpSent",
    type: SendOtpResponseDto
  })
  sendOtp(
    @ValidBody(ForgotPasswordOtpSendBodyDto)
    _body: ForgotPasswordOtpSendBodyDto,
    @Req() req: FPOtpSendRequest
  ) {
    return this.service.sendOtp(req);
  }

  @Post("/otp/verify")
  @OpenAPI({
    summary: "Verify OTP and get reset token",
    description:
      "On success returns a one-time `resetToken`, valid for 10 minutes, for /auth/forgot-password/reset. 401 for a wrong or expired code; 5 wrong codes lock verification for 15 minutes (400)."
  })
  @ApiErrors(401)
  @RateLimit("forgotPasswordOtpByIp")
  @Respond({
    message: "forgotPassword:success.otpVerified",
    type: VerifyOtpResponseDto
  })
  verifyOtp(
    @ValidBody(ForgotPasswordOtpVerifyBodyDto)
    _body: ForgotPasswordOtpVerifyBodyDto,
    @Req() req: FPOtpVerifyRequest
  ) {
    return this.service.verifyOtp(req);
  }

  @Post("/magic-link/send")
  @OpenAPI({
    summary: "Send magic link for password recovery",
    description:
      "Emails a link to the client page `/forgot-password/reset?email=...&token=...&method=magic-link`, valid for 15 minutes, with a 60-second cooldown and at most 3 resends (400 past either). Answers the same for an unknown or inactive email, without sending anything."
  })
  @RateLimit("forgotPasswordMagicLinkByIp", "forgotPasswordMagicLinkByEmail")
  @Respond({
    message: "forgotPassword:success.magicLinkSent",
    type: SendMagicLinkResponseDto
  })
  sendMagicLink(
    @ValidBody(ForgotPasswordMagicLinkSendBodyDto)
    _body: ForgotPasswordMagicLinkSendBodyDto,
    @Req() req: FPMagicLinkSendRequest
  ) {
    return this.service.sendMagicLink(req);
  }

  @Post("/magic-link/verify")
  @OpenAPI({
    summary: "Verify magic link and get reset token",
    description:
      "On success returns a one-time `resetToken`, valid for 10 minutes, for /auth/forgot-password/reset. 401 for an invalid or expired link."
  })
  @ApiErrors(401)
  @RateLimit("forgotPasswordMagicLinkByIp")
  @Respond({
    message: "forgotPassword:success.magicLinkVerified",
    type: VerifyMagicLinkResponseDto
  })
  verifyMagicLink(
    @ValidBody(ForgotPasswordMagicLinkVerifyBodyDto)
    _body: ForgotPasswordMagicLinkVerifyBodyDto,
    @Req() req: FPMagicLinkVerifyRequest
  ) {
    return this.service.verifyMagicLink(req);
  }

  @Post("/reset")
  @OpenAPI({
    summary: "Reset password with reset token",
    description:
      "Sets a new password with the `resetToken` from OTP or magic-link verification. The token is one-time; existing sessions are refused on their next token refresh. 401 for an invalid or expired token."
  })
  @ApiErrors(401)
  @RateLimit("forgotPasswordResetByIp")
  @Respond({
    message: "forgotPassword:success.passwordReset",
    type: ResetPasswordResponseDto
  })
  resetPassword(
    @ValidBody(ResetPasswordBodyDto) _body: ResetPasswordBodyDto,
    @Req() req: FPResetPasswordRequest
  ) {
    return this.service.resetPassword(req);
  }
}
