// libs
import { StatusCodes } from "http-status-codes";
import { Get, JsonController, Post, Req, Res } from "routing-controllers";
import { OpenAPI } from "routing-controllers-openapi";
// types
import type { Request, Response } from "express";
import type { SignupService } from "./services";
// common
import { ApiErrors } from "@/common/openapi";
import { RateLimit, Respond, ValidBody, ValidParams } from "@/common/routing";
// modules
import {
  REFRESH_TOKEN,
  REFRESH_TOKEN_COOKIE_OPTIONS
} from "@/modules/token/constants";
// others
import {
  CheckEmailDto,
  CompleteSignupDto,
  ResendOtpDto,
  SendOtpDto,
  VerifyOtpDto
} from "./dtos";
import {
  CheckEmailParamsDto,
  CompleteSignupBodyDto,
  ResendOtpBodyDto,
  SendOtpBodyDto,
  VerifyOtpBodyDto
} from "./dtos/requests";

@JsonController("/auth/signup")
@OpenAPI({ tags: ["Auth - Signup"] })
export class SignupController {
  constructor(private readonly service: SignupService) {}

  @Post("/send-otp")
  @OpenAPI({
    summary: "Send OTP to email",
    description:
      "Step 1 of sign-up. Sends a 6-digit OTP to the email, valid for 5 minutes, with a 60-second cooldown between requests. 409 when the email is already registered."
  })
  @ApiErrors(409)
  @RateLimit("signupOtpByIp", "signupOtpByEmail")
  @Respond({ message: "signup:success.otpSent", type: SendOtpDto })
  sendOtp(
    @ValidBody(SendOtpBodyDto) body: SendOtpBodyDto,
    @Req() req: Request
  ) {
    return this.service.sendOtp(body, req);
  }

  @Post("/verify-otp")
  @OpenAPI({
    summary: "Verify OTP code",
    description:
      "Step 2 of sign-up. On success returns a session token, valid for 30 minutes, for the complete step. 5 wrong codes lock verification for 15 minutes."
  })
  @Respond({ message: "signup:success.otpVerified", type: VerifyOtpDto })
  verifyOtp(@ValidBody(VerifyOtpBodyDto) body: VerifyOtpBodyDto) {
    return this.service.verifyOtp(body);
  }

  @Post("/resend-otp")
  @OpenAPI({
    summary: "Resend OTP code",
    description:
      "Sends a new OTP. At most 5 resends per hour, 60 seconds apart. 409 when the email has been registered meanwhile."
  })
  @ApiErrors(409)
  @RateLimit("signupOtpByIp", "signupOtpByEmail")
  @Respond({ message: "signup:success.otpResent", type: ResendOtpDto })
  resendOtp(
    @ValidBody(ResendOtpBodyDto) body: ResendOtpBodyDto,
    @Req() req: Request
  ) {
    return this.service.resendOtp(body, req);
  }

  @Post("/complete")
  @OpenAPI({
    summary: "Complete signup",
    description:
      "Step 3 (final) of sign-up: creates the account from the verify-otp session token and signs the user in. Sets the refresh token as an HttpOnly cookie; the body carries only the access and ID tokens. 409 when the email was registered meanwhile; 500 when the account transaction aborts."
  })
  @ApiErrors(409, 500)
  @Respond({
    status: StatusCodes.CREATED,
    message: "signup:success.signupCompleted",
    type: CompleteSignupDto
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
  @OpenAPI({
    summary: "Check email availability",
    description:
      "Whether an email address is still free to register, for live validation in the sign-up form."
  })
  @RateLimit("checkEmailByIp")
  @Respond({ type: CheckEmailDto })
  checkEmail(@ValidParams(CheckEmailParamsDto) params: CheckEmailParamsDto) {
    return this.service.checkEmail(params);
  }
}
