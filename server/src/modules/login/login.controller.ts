// libs
import { JsonController, Post, Res } from "routing-controllers";
import { OpenAPI } from "routing-controllers-openapi";
// types
import type { Response } from "express";
import type { LoginService } from "./services/login";
import type { SessionService } from "@/modules/session/services";
// common
import { ApiErrors } from "@/common/openapi";
import { RateLimit, Respond, ValidBody } from "@/common/routing";
// modules
import { AccessTokensDto } from "@/modules/token/dtos";
import {
  SESSION_COOKIE,
  SESSION_COOKIE_OPTIONS
} from "@/modules/session/constants";
import {
  REFRESH_TOKEN,
  REFRESH_TOKEN_COOKIE_OPTIONS
} from "@/modules/token/constants";
// others
import { RequestContext } from "@/utils/request-context";
import { MagicLinkSendDto, OtpSendDto } from "./dtos";
import {
  LoginBodyDto,
  MagicLinkSendBodyDto,
  MagicLinkVerifyBodyDto,
  OtpSendBodyDto,
  OtpVerifyBodyDto
} from "./dtos/requests";

@JsonController("/auth/login")
@OpenAPI({ tags: ["Auth - Login"] })
export class LoginController {
  constructor(
    private readonly service: LoginService,
    private readonly sessionService: SessionService
  ) {}

  /**
   * Mở phiên IdP (cookie `sid`) sau khi đăng nhập thành công. Phiên này là thứ
   * /oauth/authorize đọc để biết user đã đăng nhập — access token nằm trong bộ
   * nhớ của tab nên một navigation từ app vệ tinh sang không thấy được nó.
   *
   * Danh tính lấy từ RequestContext do LoginCompletionService đặt vào.
   */
  private async startSession(res: Response): Promise<void> {
    const identity = RequestContext.getUser();
    if (!identity) return;

    const session = await this.sessionService.start({
      authId: identity.authId,
      userId: identity.sub,
      roles: identity.roles
    });

    res.cookie(SESSION_COOKIE, session.sid, SESSION_COOKIE_OPTIONS);
  }

  @Post("/")
  @OpenAPI({
    summary: "Login with email and password",
    description:
      "Sets the refresh token as an HttpOnly cookie and opens the IdP session (`sid` cookie); the body carries only the access and ID tokens. 401 for wrong credentials, an unknown, inactive or unverified account; 10 failed attempts lock the account for 30 minutes (429)."
  })
  @ApiErrors(401)
  @RateLimit("loginByIp")
  @Respond({ message: "login:success.loginSuccessful", type: AccessTokensDto })
  async login(
    @ValidBody(LoginBodyDto) body: LoginBodyDto,
    @Res() res: Response
  ) {
    const data = await this.service.passwordLogin(body);
    const { refreshToken, ...responseData } = data;

    if (refreshToken) {
      res.cookie(REFRESH_TOKEN, refreshToken, REFRESH_TOKEN_COOKIE_OPTIONS);
    }

    await this.startSession(res);

    return responseData;
  }

  @Post("/otp/send")
  @OpenAPI({
    summary: "Send OTP for passwordless login",
    description:
      "Sends a 6-digit OTP, valid for 5 minutes, to the email, with a 60-second cooldown between requests; past the resend limit it answers 400. Answers the same for an email that cannot sign in (no email is sent)."
  })
  @RateLimit("loginOtpByIp", "loginOtpByEmail")
  @Respond({ message: "login:success.otpSent", type: OtpSendDto })
  sendOtp(@ValidBody(OtpSendBodyDto) body: OtpSendBodyDto) {
    return this.service.sendOtp(body);
  }

  @Post("/otp/verify")
  @OpenAPI({
    summary: "Verify OTP and login",
    description:
      "Sets the refresh token as an HttpOnly cookie and opens the IdP session (`sid` cookie); the body carries only the access and ID tokens. 401 for a wrong or expired code; 5 wrong codes lock OTP sign-in for 15 minutes (429)."
  })
  @ApiErrors(401)
  @RateLimit("loginByIp")
  @Respond({ message: "login:success.loginSuccessful", type: AccessTokensDto })
  async verifyOtp(
    @ValidBody(OtpVerifyBodyDto) body: OtpVerifyBodyDto,
    @Res() res: Response
  ) {
    const data = await this.service.verifyOtp(body);
    const { refreshToken, ...responseData } = data;

    if (refreshToken) {
      res.cookie(REFRESH_TOKEN, refreshToken, REFRESH_TOKEN_COOKIE_OPTIONS);
    }

    await this.startSession(res);

    return responseData;
  }

  @Post("/magic-link/send")
  @OpenAPI({
    summary: "Send magic link for passwordless login",
    description:
      "Emails a sign-in link, valid for 15 minutes, with a 60-second cooldown between requests. Answers the same for an email that cannot sign in (no email is sent)."
  })
  @RateLimit("magicLinkByIp", "magicLinkByEmail")
  @Respond({ message: "login:success.magicLinkSent", type: MagicLinkSendDto })
  sendMagicLink(@ValidBody(MagicLinkSendBodyDto) body: MagicLinkSendBodyDto) {
    return this.service.sendMagicLink(body);
  }

  @Post("/magic-link/verify")
  @OpenAPI({
    summary: "Verify magic link and login",
    description:
      "Sets the refresh token as an HttpOnly cookie and opens the IdP session (`sid` cookie); the body carries only the access and ID tokens. 401 for an invalid or expired link."
  })
  @ApiErrors(401)
  @RateLimit("loginByIp")
  @Respond({ message: "login:success.loginSuccessful", type: AccessTokensDto })
  async verifyMagicLink(
    @ValidBody(MagicLinkVerifyBodyDto) body: MagicLinkVerifyBodyDto,
    @Res() res: Response
  ) {
    const data = await this.service.verifyMagicLink(body);
    const { refreshToken, ...responseData } = data;

    if (refreshToken) {
      res.cookie(REFRESH_TOKEN, refreshToken, REFRESH_TOKEN_COOKIE_OPTIONS);
    }

    await this.startSession(res);

    return responseData;
  }
}
