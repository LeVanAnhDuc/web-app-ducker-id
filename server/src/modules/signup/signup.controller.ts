// libs
import { StatusCodes } from "http-status-codes";
import { Get, JsonController, Post, Req, Res } from "routing-controllers";
// types
import type { Request, Response } from "express";
import type { SignupService } from "./services";
// common
import { RateLimit, Respond, ValidBody, ValidParams } from "@/common/routing";
// modules
import {
  REFRESH_TOKEN,
  REFRESH_TOKEN_COOKIE_OPTIONS
} from "@/modules/token/constants";
// others
import {
  CheckEmailParamsDto,
  CompleteSignupBodyDto,
  ResendOtpBodyDto,
  SendOtpBodyDto,
  VerifyOtpBodyDto
} from "./dtos/requests";

@JsonController("/auth/signup")
export class SignupController {
  constructor(private readonly service: SignupService) {}

  @Post("/send-otp")
  @RateLimit("signupOtpByIp", "signupOtpByEmail")
  @Respond({ message: "signup:success.otpSent" })
  sendOtp(
    @ValidBody(SendOtpBodyDto) body: SendOtpBodyDto,
    @Req() req: Request
  ) {
    return this.service.sendOtp(body, req);
  }

  @Post("/verify-otp")
  @Respond({ message: "signup:success.otpVerified" })
  verifyOtp(@ValidBody(VerifyOtpBodyDto) body: VerifyOtpBodyDto) {
    return this.service.verifyOtp(body);
  }

  @Post("/resend-otp")
  @RateLimit("signupOtpByIp", "signupOtpByEmail")
  @Respond({ message: "signup:success.otpResent" })
  resendOtp(
    @ValidBody(ResendOtpBodyDto) body: ResendOtpBodyDto,
    @Req() req: Request
  ) {
    return this.service.resendOtp(body, req);
  }

  @Post("/complete")
  @Respond({
    status: StatusCodes.CREATED,
    message: "signup:success.signupCompleted"
  })
  async completeSignup(
    @ValidBody(CompleteSignupBodyDto) body: CompleteSignupBodyDto,
    @Res() res: Response
  ) {
    const {
      tokens: { refreshToken, ...tokens },
      ...account
    } = await this.service.completeSignup(body);

    // Same as login: the refresh token goes only into the HttpOnly cookie, so
    // the new session survives a reload (BUG-AUTH-02) and page script never
    // sees it.
    res.cookie(REFRESH_TOKEN, refreshToken, REFRESH_TOKEN_COOKIE_OPTIONS);

    return { ...account, tokens };
  }

  @Get("/check-email/:email")
  @RateLimit("checkEmailByIp")
  @Respond()
  checkEmail(@ValidParams(CheckEmailParamsDto) params: CheckEmailParamsDto) {
    return this.service.checkEmail(params);
  }
}
