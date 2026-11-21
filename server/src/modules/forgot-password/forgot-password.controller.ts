// libs
import { JsonController, Post } from "routing-controllers";
// types
import type { ForgotPasswordService } from "./services/forgot-password";
// common
import { RateLimit, Respond, ValidBody } from "@/common/routing";
// others
import {
  MagicLinkSendBodyDto,
  MagicLinkVerifyBodyDto,
  OtpSendBodyDto,
  OtpVerifyBodyDto,
  ResetPasswordBodyDto
} from "./dtos/requests";

@JsonController("/auth/forgot-password")
export class ForgotPasswordController {
  constructor(private readonly service: ForgotPasswordService) {}

  @Post("/otp/send")
  @RateLimit("forgotPasswordOtpByIp", "forgotPasswordOtpByEmail")
  @Respond({ message: "forgotPassword:success.otpSent" })
  sendOtp(@ValidBody(OtpSendBodyDto) body: OtpSendBodyDto) {
    return this.service.sendOtp(body);
  }

  @Post("/otp/verify")
  @RateLimit("forgotPasswordOtpByIp")
  @Respond({ message: "forgotPassword:success.otpVerified" })
  verifyOtp(@ValidBody(OtpVerifyBodyDto) body: OtpVerifyBodyDto) {
    return this.service.verifyOtp(body);
  }

  @Post("/magic-link/send")
  @RateLimit("forgotPasswordMagicLinkByIp", "forgotPasswordMagicLinkByEmail")
  @Respond({ message: "forgotPassword:success.magicLinkSent" })
  sendMagicLink(@ValidBody(MagicLinkSendBodyDto) body: MagicLinkSendBodyDto) {
    return this.service.sendMagicLink(body);
  }

  @Post("/magic-link/verify")
  @RateLimit("forgotPasswordMagicLinkByIp")
  @Respond({ message: "forgotPassword:success.magicLinkVerified" })
  verifyMagicLink(
    @ValidBody(MagicLinkVerifyBodyDto) body: MagicLinkVerifyBodyDto
  ) {
    return this.service.verifyMagicLink(body);
  }

  @Post("/reset")
  @RateLimit("forgotPasswordResetByIp")
  @Respond({ message: "forgotPassword:success.passwordReset" })
  resetPassword(@ValidBody(ResetPasswordBodyDto) body: ResetPasswordBodyDto) {
    return this.service.resetPassword(body);
  }
}
